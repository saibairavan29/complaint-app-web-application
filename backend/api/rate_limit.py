import time
import logging
from django.core.cache import cache
from django.utils import timezone
from api.models import FallbackRateLimitLog, SecurityEvent
from datetime import timedelta

logger = logging.getLogger(__name__)

def check_rate_limit(ip_address, endpoint, limit, period_seconds=60):
    """
    Checks the rate limit for a given IP address and endpoint.
    Uses django cache with a fallback to the database FallbackRateLimitLog.
    Returns:
        (is_allowed, count)
    """
    cache_key = f"rl:{endpoint}:{ip_address}"
    cache_working = True
    current_count = 0
    
    try:
        # Try checking from cache
        current_count = cache.get(cache_key)
        if current_count is None:
            # First request, set key to 1 and expire in period_seconds
            cache.set(cache_key, 1, timeout=period_seconds)
            current_count = 1
        else:
            if current_count >= limit:
                # Exceeded rate limit, create a security event if not already flagged in this period
                alert_key = f"rl_alert:{endpoint}:{ip_address}"
                if not cache.get(alert_key):
                    SecurityEvent.objects.create(
                        event_type='rate_limit_exceeded',
                        ip_address=ip_address,
                        details=f"Rate limit of {limit}/{period_seconds}s exceeded on endpoint '{endpoint}'"
                    )
                    cache.set(alert_key, True, timeout=period_seconds)
                return False, current_count
            
            # Increment the counter
            try:
                current_count = cache.incr(cache_key)
            except Exception:
                current_count += 1
                cache.set(cache_key, current_count, timeout=period_seconds)
                
    except Exception as cache_err:
        cache_working = False
        logger.error(f"Cache rate limiter failed, falling back to database: {cache_err}")
        
    if not cache_working:
        # Fallback to database
        now = timezone.now()
        cutoff = now - timedelta(seconds=period_seconds)
        
        db_count = FallbackRateLimitLog.objects.filter(
            ip_address=ip_address,
            endpoint=endpoint,
            timestamp__gte=cutoff
        ).count()
        
        if db_count >= limit:
            # Exceeded rate limit in DB fallback, log security event
            last_alert = SecurityEvent.objects.filter(
                event_type='rate_limit_exceeded',
                ip_address=ip_address,
                details__contains=endpoint,
                created_at__gte=cutoff
            ).exists()
            if not last_alert:
                SecurityEvent.objects.create(
                    event_type='rate_limit_exceeded',
                    ip_address=ip_address,
                    details=f"[DB Fallback] Rate limit of {limit}/{period_seconds}s exceeded on endpoint '{endpoint}'"
                )
            return False, db_count
            
        # Log this request to FallbackRateLimitLog
        FallbackRateLimitLog.objects.create(
            ip_address=ip_address,
            endpoint=endpoint
        )
        current_count = db_count + 1

    return True, current_count

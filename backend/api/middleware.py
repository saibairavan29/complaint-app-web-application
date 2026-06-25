import time
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class APIObservabilityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        
        # Only observe API calls
        if not path.startswith('/api/'):
            return self.get_response(request)
            
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time  # In seconds
        
        status_code = response.status_code
        
        try:
            # Update telemetry in cache
            cache.get_or_set('telemetry:total_requests', 0)
            cache.incr('telemetry:total_requests')
            
            total_duration = cache.get('telemetry:total_duration', 0.0)
            cache.set('telemetry:total_duration', total_duration + duration)
            
            if status_code >= 400:
                cache.get_or_set('telemetry:failed_requests', 0)
                cache.incr('telemetry:failed_requests')
                
            # Normalize path (replace numeric IDs with {id})
            import re
            norm_path = re.sub(r'/\d+/', '/{id}/', path)
            if norm_path.endswith('/') and len(norm_path) > 1:
                norm_path = norm_path[:-1]
                
            endpoints_data = cache.get('telemetry:endpoints', {})
            
            if norm_path not in endpoints_data:
                endpoints_data[norm_path] = {
                    'count': 1,
                    'total_duration': duration,
                    'max_duration': duration,
                }
            else:
                endpoints_data[norm_path]['count'] += 1
                endpoints_data[norm_path]['total_duration'] += duration
                if duration > endpoints_data[norm_path]['max_duration']:
                    endpoints_data[norm_path]['max_duration'] = duration
                    
            cache.set('telemetry:endpoints', endpoints_data)
            
        except Exception as e:
            logger.error(f"Telemetry update error: {e}")
            
        return response

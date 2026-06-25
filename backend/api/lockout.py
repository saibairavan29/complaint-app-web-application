import logging
from django.utils import timezone
from datetime import timedelta
from api.models import LoginLockout, SecurityEvent

logger = logging.getLogger(__name__)

def is_account_locked(username):
    """
    Checks if a username is currently locked out.
    Returns:
        (is_locked, locked_until_datetime)
    """
    try:
        lockout = LoginLockout.objects.get(username=username)
        if lockout.locked_until and lockout.locked_until > timezone.now():
            return True, lockout.locked_until
        elif lockout.locked_until and lockout.locked_until <= timezone.now():
            # Lockout period expired, reset attempts
            lockout.failed_attempts = 0
            lockout.locked_until = None
            lockout.save()
    except LoginLockout.DoesNotExist:
        pass
    return False, None

def register_failed_attempt(username, ip_address=None):
    """
    Registers a failed login attempt for a username.
    Locks the account if failed attempts count reach 5.
    Returns:
        (attempts, is_locked, locked_until)
    """
    lockout, created = LoginLockout.objects.get_or_create(username=username)
    
    # Save IP and timestamp of this failed attempt
    lockout.ip_address = ip_address
    lockout.last_attempt_at = timezone.now()
    
    # If already locked, just return current state
    if lockout.locked_until and lockout.locked_until > timezone.now():
        lockout.save()
        return lockout.failed_attempts, True, lockout.locked_until
        
    lockout.failed_attempts += 1
    
    is_locked = False
    locked_until = None
    
    if lockout.failed_attempts >= 5:
        locked_until = timezone.now() + timedelta(minutes=15)
        lockout.locked_until = locked_until
        is_locked = True
        
        # Log SecurityEvent for Account Lockout
        SecurityEvent.objects.create(
            event_type='account_lockout',
            username=username,
            ip_address=ip_address,
            details=f"Account '{username}' locked out for 15 minutes due to 5 consecutive failed login attempts."
        )
        logger.warning(f"Account '{username}' locked out for 15 minutes due to 5 consecutive failed login attempts.")
        
    lockout.save()
    return lockout.failed_attempts, is_locked, locked_until

def register_successful_login(username):
    """
    Resets the failed attempts for a username on successful login.
    """
    try:
        lockout = LoginLockout.objects.get(username=username)
        lockout.failed_attempts = 0
        lockout.locked_until = None
        lockout.ip_address = None
        lockout.last_attempt_at = timezone.now()
        lockout.save()
    except LoginLockout.DoesNotExist:
        pass

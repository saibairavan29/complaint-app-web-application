import os
import zipfile
import logging
from django.conf import settings
from django.utils import timezone
from api.models import BackupLog, Complaint

logger = logging.getLogger(__name__)

def verify_zip_archive(zip_path):
    """
    Verifies that the zip file exists, size > 0, and is not corrupted.
    Returns:
        (status_string, size_bytes)
    """
    if not os.path.exists(zip_path):
        return 'FAILED', 0
        
    size = os.path.getsize(zip_path)
    if size == 0:
        return 'FAILED', 0
        
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            corrupt_file = zf.testzip()
            if corrupt_file is not None:
                logger.error(f"Zip file {zip_path} is corrupted: {corrupt_file}")
                return 'CORRUPTED', size
    except Exception as e:
        logger.error(f"Error testing zip archive {zip_path}: {e}")
        return 'CORRUPTED', size
        
    return 'SUCCESS', size

def validate_database_restore_integrity(backup_path, engine):
    """
    Validates a database backup file by extracting it to a temporary DB and querying key tables.
    Only if this passes is the backup marked SUCCESS.
    """
    import tempfile
    import sqlite3
    
    try:
        with zipfile.ZipFile(backup_path, 'r') as zf:
            if 'sqlite3' in engine:
                temp_dir = tempfile.gettempdir()
                extracted_files = zf.namelist()
                db_file_in_zip = [f for f in extracted_files if f.endswith('.sqlite3')]
                if not db_file_in_zip:
                    db_file_in_zip = [extracted_files[0]]
                
                temp_db_path = os.path.join(temp_dir, f"temp_validate_{timezone.now().strftime('%Y%m%d_%H%M%S')}.sqlite3")
                
                # Extract to temp path
                zf.extract(db_file_in_zip[0], temp_dir)
                extracted_path = os.path.join(temp_dir, db_file_in_zip[0])
                if extracted_path != temp_db_path:
                    if os.path.exists(temp_db_path):
                        os.remove(temp_db_path)
                    os.rename(extracted_path, temp_db_path)
                
                # Verify SQLite connection and query tables
                conn = sqlite3.connect(temp_db_path)
                cursor = conn.cursor()
                
                tables = ['api_complaint', 'api_project', 'api_location']
                for table in tables:
                    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                    if not cursor.fetchone():
                        conn.close()
                        os.remove(temp_db_path)
                        return False
                        
                # Basic select queries
                cursor.execute("SELECT COUNT(*) FROM api_complaint")
                cursor.fetchall()
                cursor.execute("SELECT COUNT(*) FROM api_project")
                cursor.fetchall()
                cursor.execute("SELECT COUNT(*) FROM api_location")
                cursor.fetchall()
                
                conn.close()
                os.remove(temp_db_path)
                return True
            else:
                # PostgreSQL JSON dump validation
                dump_data = zf.read('database_dump.json').decode('utf-8')
                import json
                data = json.loads(dump_data)
                
                has_complaint = any(item.get('model') == 'api.complaint' for item in data)
                has_project = any(item.get('model') == 'api.project' for item in data)
                has_location = any(item.get('model') == 'api.location' for item in data)
                
                return has_complaint and has_project and has_location
    except Exception as e:
        logger.error(f"Backup restore validation failed: {e}")
        return False

def perform_database_backup():
    """
    Backs up the database. If SQLite, zips the db file.
    Runs restore validation before marking as SUCCESS.
    """
    backup_dir = os.path.join(settings.BASE_DIR, 'backups', 'database')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f"db_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, filename)
    
    status = 'FAILED'
    size = 0
    engine = ''
    
    try:
        db_config = settings.DATABASES['default']
        engine = db_config.get('ENGINE', '')
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            if 'sqlite3' in engine:
                db_name = str(db_config.get('NAME'))
                if os.path.exists(db_name):
                    zf.write(db_name, os.path.basename(db_name))
                    status = 'SUCCESS'
                else:
                    logger.error("SQLite database file not found for backup.")
            else:
                import io
                from django.core.management import call_command
                buffer = io.StringIO()
                call_command('dumpdata', stdout=buffer)
                zf.writestr('database_dump.json', buffer.getvalue())
                status = 'SUCCESS'
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        status = 'FAILED'
        
    if status == 'SUCCESS':
        status, size = verify_zip_archive(zip_path)
        if status == 'SUCCESS':
            # Perform restore validation
            if not validate_database_restore_integrity(zip_path, engine):
                status = 'FAILED'
                logger.error("Database backup failed restore validation.")
        
    BackupLog.objects.create(
        backup_type='database',
        file_name=filename,
        file_size=size,
        status=status,
        restore_tested=(status == 'SUCCESS')
    )
    
    return status, filename, size

def perform_media_backup():
    """
    Zips the media directory. Logs result to BackupLog.
    """
    backup_dir = os.path.join(settings.BASE_DIR, 'backups', 'media')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f"media_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, filename)
    
    media_root = settings.MEDIA_ROOT
    status = 'FAILED'
    size = 0
    
    try:
        if not media_root or not os.path.exists(media_root):
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr('info.txt', 'Media root was empty or did not exist during backup.')
            status = 'SUCCESS'
        else:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for root, dirs, files in os.walk(media_root):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, media_root)
                        zf.write(file_path, arcname)
            status = 'SUCCESS'
    except Exception as e:
        logger.error(f"Media backup failed: {e}")
        status = 'FAILED'
        
    if status == 'SUCCESS':
        status, size = verify_zip_archive(zip_path)
        
    BackupLog.objects.create(
        backup_type='media',
        file_name=filename,
        file_size=size,
        status=status,
        restore_tested=False
    )
    
    return status, filename, size

def perform_logs_backup():
    """
    Zips the logs directory. Logs result to BackupLog.
    """
    backup_dir = os.path.join(settings.BASE_DIR, 'backups', 'logs')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f"logs_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, filename)
    
    logs_dir = os.path.join(settings.BASE_DIR, 'logs')
    status = 'FAILED'
    size = 0
    
    try:
        if not logs_dir or not os.path.exists(logs_dir):
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr('info.txt', 'Logs directory did not exist during backup.')
            status = 'SUCCESS'
        else:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for root, dirs, files in os.walk(logs_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, logs_dir)
                        zf.write(file_path, arcname)
            status = 'SUCCESS'
    except Exception as e:
        logger.error(f"Logs backup failed: {e}")
        status = 'FAILED'
        
    if status == 'SUCCESS':
        status, size = verify_zip_archive(zip_path)
        
    BackupLog.objects.create(
        backup_type='logs',
        file_name=filename,
        file_size=size,
        status=status,
        restore_tested=False
    )
    
    return status, filename, size

def perform_scheduled_backup(scope):
    """
    Executes Daily, Weekly, or Monthly backup routines.
    - Daily: Database
    - Weekly: Database + Media
    - Monthly: Database + Media + Logs
    """
    scope = scope.lower()
    if scope not in ['daily', 'weekly', 'monthly']:
        logger.error(f"Invalid scheduled backup scope: {scope}")
        return False
        
    logger.info(f"Running scheduled {scope} backup...")
    
    # 1. Database is always backed up
    db_status, db_file, db_size = perform_database_backup()
    if db_status != 'SUCCESS':
        return False
        
    media_size = 0
    # 2. Weekly and Monthly include media
    if scope in ['weekly', 'monthly']:
        media_status, media_file, media_size = perform_media_backup()
        if media_status != 'SUCCESS':
            return False
            
    logs_size = 0
    # 3. Monthly includes logs
    if scope == 'monthly':
        logs_status, logs_file, logs_size = perform_logs_backup()
        if logs_status != 'SUCCESS':
            return False
            
    # Record overall success log
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    BackupLog.objects.create(
        backup_type=f"{scope}_scheduled",
        file_name=f"{scope}_backup_set_{timestamp}",
        file_size=db_size + media_size + logs_size,
        status='SUCCESS',
        restore_tested=True
    )
    return True

def restore_database_backup(filename):
    """
    Restores a database from a backup file.
    Only allows restore if status is SUCCESS.
    """
    try:
        log_entry = BackupLog.objects.get(file_name=filename, backup_type='database')
    except BackupLog.DoesNotExist:
        return False, "Backup log entry not found."
        
    if log_entry.status != 'SUCCESS':
        return False, f"Cannot restore. Backup is marked as {log_entry.status}."
        
    backup_path = os.path.join(settings.BASE_DIR, 'backups', 'database', filename)
    if not os.path.exists(backup_path):
        return False, "Backup file does not exist on disk."
        
    try:
        db_config = settings.DATABASES['default']
        engine = db_config.get('ENGINE', '')
        
        with zipfile.ZipFile(backup_path, 'r') as zf:
            if 'sqlite3' in engine:
                db_name = str(db_config.get('NAME'))
                temp_dir = os.path.dirname(db_name)
                extracted_files = zf.namelist()
                db_file_in_zip = [f for f in extracted_files if f.endswith('.sqlite3')]
                if not db_file_in_zip:
                    db_file_in_zip = [extracted_files[0]]
                
                rollback_db = db_name + ".rollback"
                if os.path.exists(db_name):
                    import shutil
                    shutil.copy2(db_name, rollback_db)
                    
                try:
                    zf.extract(db_file_in_zip[0], temp_dir)
                    extracted_path = os.path.join(temp_dir, db_file_in_zip[0])
                    if extracted_path != db_name:
                        if os.path.exists(db_name):
                            os.remove(db_name)
                        os.rename(extracted_path, db_name)
                    
                    if os.path.exists(rollback_db):
                        os.remove(rollback_db)
                except Exception as restore_err:
                    if os.path.exists(rollback_db):
                        if os.path.exists(db_name):
                            os.remove(db_name)
                        os.rename(rollback_db, db_name)
                    raise restore_err
            else:
                import json
                from django.core.serializers import deserialize
                data_file = zf.read('database_dump.json')
                objects = deserialize('json', data_file.decode('utf-8'))
                for obj in objects:
                    obj.save()
                    
        log_entry.restore_tested = True
        log_entry.save()
        return True, "Database restored successfully."
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        return False, f"Restore operation failed: {str(e)}"

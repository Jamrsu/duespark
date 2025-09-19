"""
Database backup and disaster recovery service
"""
import asyncio
import gzip
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import boto3
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.monitoring import monitoring


class BackupService:
    """Database backup and disaster recovery service"""

    def __init__(self):
        self.backup_enabled = os.getenv('BACKUP_ENABLED', 'false').lower() == 'true'
        self.s3_bucket = os.getenv('BACKUP_S3_BUCKET')
        self.s3_region = os.getenv('BACKUP_S3_REGION', 'us-east-1')
        self.local_backup_dir = Path(os.getenv('BACKUP_LOCAL_DIR', '/tmp/backups'))
        self.retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
        self.database_url = os.getenv('DATABASE_URL')

        # Create backup directory
        self.local_backup_dir.mkdir(parents=True, exist_ok=True)

        # Initialize S3 client if configured
        self.s3_client = None
        if self.s3_bucket and self._has_aws_credentials():
            try:
                self.s3_client = boto3.client('s3', region_name=self.s3_region)
                monitoring.log_performance('s3_client_init', 0.1, {'bucket': self.s3_bucket})
            except Exception as e:
                monitoring.log_error(e, {'component': 'backup_service', 'operation': 's3_init'})

    def _has_aws_credentials(self) -> bool:
        """Check if AWS credentials are available"""
        return bool(
            os.getenv('AWS_ACCESS_KEY_ID') or
            os.getenv('AWS_PROFILE') or
            Path('~/.aws/credentials').expanduser().exists()
        )

    async def create_backup(self, backup_type: str = 'scheduled') -> Dict[str, any]:
        """Create a complete database backup"""
        if not self.backup_enabled:
            return {'status': 'disabled', 'message': 'Backups are disabled'}

        backup_start = datetime.now(timezone.utc)
        backup_id = f"backup_{backup_start.strftime('%Y%m%d_%H%M%S')}"

        try:
            # Create backup metadata
            metadata = {
                'backup_id': backup_id,
                'timestamp': backup_start.isoformat(),
                'type': backup_type,
                'database_url': self.database_url,
                'environment': os.getenv('ENVIRONMENT', 'development')
            }

            # Perform database dump
            dump_file = await self._create_database_dump(backup_id)
            if not dump_file:
                raise Exception("Database dump failed")

            # Compress backup
            compressed_file = await self._compress_backup(dump_file)

            # Upload to S3 if configured
            s3_key = None
            if self.s3_client:
                s3_key = await self._upload_to_s3(compressed_file, backup_id)

            # Record backup in database
            await self._record_backup(metadata, str(compressed_file), s3_key)

            # Cleanup old backups
            await self._cleanup_old_backups()

            backup_duration = (datetime.now(timezone.utc) - backup_start).total_seconds()
            monitoring.log_performance('database_backup', backup_duration, metadata)

            result = {
                'status': 'success',
                'backup_id': backup_id,
                'local_file': str(compressed_file),
                's3_key': s3_key,
                'duration_seconds': backup_duration,
                'timestamp': backup_start.isoformat()
            }

            monitoring.backup_status_alert('success', f"Backup {backup_id} completed successfully")
            return result

        except Exception as e:
            error_context = {
                'backup_id': backup_id,
                'backup_type': backup_type,
                'component': 'backup_service'
            }
            monitoring.log_error(e, error_context, severity='critical')
            monitoring.backup_status_alert('failed', f"Backup {backup_id} failed: {str(e)}")

            return {
                'status': 'failed',
                'error': str(e),
                'backup_id': backup_id,
                'timestamp': backup_start.isoformat()
            }

    async def _create_database_dump(self, backup_id: str) -> Optional[Path]:
        """Create a database dump using pg_dump"""
        try:
            dump_file = self.local_backup_dir / f"{backup_id}.sql"

            if self.database_url.startswith('postgresql'):
                # PostgreSQL dump
                cmd = [
                    'pg_dump',
                    '--no-password',
                    '--verbose',
                    '--clean',
                    '--create',
                    '--format=custom',
                    '--file', str(dump_file),
                    self.database_url
                ]

                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()

                if process.returncode != 0:
                    raise Exception(f"pg_dump failed: {stderr.decode()}")

            elif self.database_url.startswith('sqlite'):
                # SQLite backup
                import sqlite3
                from urllib.parse import urlparse

                parsed = urlparse(self.database_url)
                source_db = parsed.path.lstrip('/')

                # Copy SQLite file
                shutil.copy2(source_db, dump_file)

            else:
                raise Exception(f"Unsupported database type: {self.database_url}")

            return dump_file

        except Exception as e:
            monitoring.log_error(e, {'operation': 'database_dump', 'backup_id': backup_id})
            return None

    async def _compress_backup(self, dump_file: Path) -> Path:
        """Compress backup file with gzip"""
        compressed_file = dump_file.with_suffix(dump_file.suffix + '.gz')

        with open(dump_file, 'rb') as f_in:
            with gzip.open(compressed_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        # Remove uncompressed file
        dump_file.unlink()

        return compressed_file

    async def _upload_to_s3(self, file_path: Path, backup_id: str) -> Optional[str]:
        """Upload backup to S3"""
        try:
            s3_key = f"backups/{datetime.now().year}/{datetime.now().month:02d}/{backup_id}.sql.gz"

            self.s3_client.upload_file(
                str(file_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    'StorageClass': 'STANDARD_IA',  # Infrequent Access for cost optimization
                    'ServerSideEncryption': 'AES256'
                }
            )

            monitoring.log_performance('s3_upload', 1.0, {'s3_key': s3_key, 'bucket': self.s3_bucket})
            return s3_key

        except Exception as e:
            monitoring.log_error(e, {'operation': 's3_upload', 'backup_id': backup_id})
            return None

    async def _record_backup(self, metadata: Dict, local_path: str, s3_key: Optional[str]):
        """Record backup information in database"""
        try:
            with SessionLocal() as db:
                # Create backup record (simplified - you might want a proper Backup model)
                backup_record = {
                    'backup_id': metadata['backup_id'],
                    'timestamp': metadata['timestamp'],
                    'type': metadata['type'],
                    'local_path': local_path,
                    's3_key': s3_key,
                    'status': 'completed'
                }

                # You could create a proper Backup model and table
                # For now, we'll just log it
                monitoring.log_performance(
                    'backup_recorded',
                    0.1,
                    backup_record
                )

        except Exception as e:
            monitoring.log_error(e, {'operation': 'record_backup'})

    async def _cleanup_old_backups(self):
        """Remove old backup files based on retention policy"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)

            # Cleanup local files
            for backup_file in self.local_backup_dir.glob('backup_*.sql.gz'):
                file_stat = backup_file.stat()
                file_date = datetime.fromtimestamp(file_stat.st_mtime)

                if file_date < cutoff_date:
                    backup_file.unlink()
                    monitoring.log_performance(
                        'backup_cleanup',
                        0.1,
                        {'file': str(backup_file), 'action': 'deleted'}
                    )

            # Cleanup S3 files if configured
            if self.s3_client:
                await self._cleanup_s3_backups(cutoff_date)

        except Exception as e:
            monitoring.log_error(e, {'operation': 'cleanup_backups'})

    async def _cleanup_s3_backups(self, cutoff_date: datetime):
        """Remove old S3 backup files"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket,
                Prefix='backups/'
            )

            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['LastModified'].replace(tzinfo=timezone.utc) < cutoff_date.replace(tzinfo=timezone.utc):
                        self.s3_client.delete_object(
                            Bucket=self.s3_bucket,
                            Key=obj['Key']
                        )
                        monitoring.log_performance(
                            's3_backup_cleanup',
                            0.1,
                            {'s3_key': obj['Key'], 'action': 'deleted'}
                        )

        except Exception as e:
            monitoring.log_error(e, {'operation': 's3_backup_cleanup'})

    async def restore_backup(self, backup_id: str) -> Dict[str, any]:
        """Restore database from backup"""
        try:
            # This is a critical operation - should require manual confirmation
            # In production, this should be heavily restricted and logged

            monitoring.security_alert(
                'database_restore_initiated',
                {'backup_id': backup_id, 'timestamp': datetime.now(timezone.utc).isoformat()}
            )

            # Find backup file
            local_file = self.local_backup_dir / f"{backup_id}.sql.gz"

            if not local_file.exists() and self.s3_client:
                # Download from S3
                s3_key = f"backups/{backup_id}.sql.gz"
                try:
                    self.s3_client.download_file(self.s3_bucket, s3_key, str(local_file))
                except Exception:
                    return {'status': 'failed', 'error': 'Backup file not found'}

            if not local_file.exists():
                return {'status': 'failed', 'error': 'Backup file not found locally or in S3'}

            # Decompress backup
            sql_file = local_file.with_suffix('')
            with gzip.open(local_file, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)

            # Restore database
            if self.database_url.startswith('postgresql'):
                cmd = [
                    'pg_restore',
                    '--no-password',
                    '--verbose',
                    '--clean',
                    '--create',
                    '--dbname', self.database_url,
                    str(sql_file)
                ]

                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()

                if process.returncode != 0:
                    raise Exception(f"pg_restore failed: {stderr.decode()}")

            # Cleanup temp files
            sql_file.unlink()

            monitoring.security_alert(
                'database_restore_completed',
                {'backup_id': backup_id, 'timestamp': datetime.now(timezone.utc).isoformat()}
            )

            return {
                'status': 'success',
                'backup_id': backup_id,
                'restored_at': datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            monitoring.log_error(e, {'operation': 'restore_backup', 'backup_id': backup_id}, severity='critical')
            return {'status': 'failed', 'error': str(e)}

    async def list_backups(self) -> List[Dict[str, any]]:
        """List available backups"""
        backups = []

        try:
            # List local backups
            for backup_file in sorted(self.local_backup_dir.glob('backup_*.sql.gz')):
                stat = backup_file.stat()
                backups.append({
                    'backup_id': backup_file.stem.replace('.sql', ''),
                    'location': 'local',
                    'file_path': str(backup_file),
                    'size_bytes': stat.st_size,
                    'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

            # List S3 backups if configured
            if self.s3_client:
                try:
                    response = self.s3_client.list_objects_v2(
                        Bucket=self.s3_bucket,
                        Prefix='backups/'
                    )

                    if 'Contents' in response:
                        for obj in response['Contents']:
                            backup_id = Path(obj['Key']).stem.replace('.sql', '')
                            backups.append({
                                'backup_id': backup_id,
                                'location': 's3',
                                's3_key': obj['Key'],
                                'size_bytes': obj['Size'],
                                'created_at': obj['LastModified'].isoformat()
                            })

                except Exception as e:
                    monitoring.log_error(e, {'operation': 'list_s3_backups'})

        except Exception as e:
            monitoring.log_error(e, {'operation': 'list_backups'})

        return backups

    async def verify_backup_integrity(self, backup_id: str) -> Dict[str, any]:
        """Verify backup file integrity"""
        try:
            local_file = self.local_backup_dir / f"{backup_id}.sql.gz"

            if not local_file.exists():
                return {'status': 'failed', 'error': 'Backup file not found'}

            # Test gzip integrity
            try:
                with gzip.open(local_file, 'rt') as f:
                    # Read first few lines to verify
                    lines = [f.readline() for _ in range(10)]
                    if not any(lines):
                        return {'status': 'failed', 'error': 'Backup file appears to be empty'}

            except Exception as e:
                return {'status': 'failed', 'error': f'Backup file is corrupted: {str(e)}'}

            return {
                'status': 'success',
                'backup_id': backup_id,
                'verified_at': datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            monitoring.log_error(e, {'operation': 'verify_backup', 'backup_id': backup_id})
            return {'status': 'failed', 'error': str(e)}


# Global backup service instance
backup_service = BackupService()
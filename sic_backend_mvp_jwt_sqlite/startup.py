#!/usr/bin/env python3
"""
Optimized startup script for DueSpark backend deployment.
Handles migrations and startup with proper timeout management.
"""
import os
import sys
import subprocess
import time
import logging
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_command_with_timeout(cmd: list, timeout: int = 300, description: str = "Command") -> bool:
    """Run a command with timeout and proper error handling"""
    logger.info(f"Running {description}: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            timeout=timeout,
            capture_output=True,
            text=True,
            check=False  # Don't raise on non-zero exit
        )

        if result.returncode == 0:
            logger.info(f"{description} completed successfully")
            if result.stdout:
                logger.debug(f"Output: {result.stdout}")
            return True
        else:
            logger.error(f"{description} failed with exit code {result.returncode}")
            if result.stderr:
                logger.error(f"Error: {result.stderr}")
            if result.stdout:
                logger.error(f"Output: {result.stdout}")
            return False

    except subprocess.TimeoutExpired:
        logger.error(f"{description} timed out after {timeout} seconds")
        return False
    except Exception as e:
        logger.error(f"Error running {description}: {e}")
        return False

def main():
    """Main startup sequence"""
    logger.info("Starting DueSpark backend deployment...")

    # Environment check
    port = os.getenv('PORT', '8000')
    environment = os.getenv('APP_ENV', 'production')
    skip_migrations = os.getenv('SKIP_MIGRATIONS', 'false').lower() == 'true'

    logger.info(f"Environment: {environment}")
    logger.info(f"Port: {port}")
    logger.info(f"Skip migrations: {skip_migrations}")

    # Step 1: Database migrations (with timeout)
    if not skip_migrations:
        logger.info("Running database migrations...")
        migration_success = run_command_with_timeout(
            ['alembic', 'upgrade', 'head'],
            timeout=180,  # 3 minutes max for migrations
            description="Database migrations"
        )

        if not migration_success:
            logger.warning("Migrations failed, but continuing startup...")
            # Don't fail the entire deployment due to migration issues
    else:
        logger.info("Skipping database migrations (SKIP_MIGRATIONS=true)")

    # Step 2: Start the application
    logger.info("Starting FastAPI application...")

    # Build uvicorn command with optimized settings
    uvicorn_cmd = [
        'uvicorn',
        'app.main:app',
        '--host', '0.0.0.0',
        '--port', port,
        '--timeout-keep-alive', '2',
        '--access-log',
        '--log-level', 'info'
    ]

    # Add workers for production (but not too many for small instances)
    if environment == 'production':
        uvicorn_cmd.extend(['--workers', '1'])  # Start with 1 worker to avoid resource issues

    logger.info(f"Starting server with command: {' '.join(uvicorn_cmd)}")

    try:
        # Start the server (this will run indefinitely)
        subprocess.run(uvicorn_cmd, check=True)
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
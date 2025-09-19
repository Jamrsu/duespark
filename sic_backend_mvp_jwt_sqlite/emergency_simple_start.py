#!/usr/bin/env python3
"""
Emergency simple startup script for DueSpark backend.
This bypasses all complex startup processes for emergency deployment.
Use only if normal startup fails.
"""
import os
import uvicorn

def main():
    """Ultra-simple startup - no migrations, no background services"""
    port = int(os.getenv('PORT', '8000'))

    print("🚨 EMERGENCY STARTUP MODE 🚨")
    print("Starting DueSpark with minimal configuration...")
    print(f"Port: {port}")
    print("Background services: DISABLED")
    print("Migrations: SKIPPED")

    # Set environment variables to disable everything
    os.environ['STARTUP_DELAY_SECONDS'] = '0'
    os.environ['SKIP_MIGRATIONS'] = 'true'
    os.environ['SKIP_PERFORMANCE_INDEXES'] = 'true'
    os.environ['DISABLE_SCHEDULER'] = 'true'
    os.environ['DISABLE_DEAD_LETTER_WORKER'] = 'true'

    # Start with absolute minimal configuration
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        access_log=False,  # Disable access logs for speed
        log_level="warning",  # Minimal logging
        workers=1
    )

if __name__ == "__main__":
    main()
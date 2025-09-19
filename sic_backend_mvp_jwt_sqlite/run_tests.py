#!/usr/bin/env python3
"""
Test runner that ensures database is initialized before running tests.
"""

import sys
import subprocess
from init_db import init_database

def main():
    """Initialize database and run pytest with passed arguments."""
    print("Initializing database...")
    try:
        init_database()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        sys.exit(1)
    
    # Run pytest with all passed arguments
    pytest_args = ["pytest"] + sys.argv[1:]
    print(f"Running: {' '.join(pytest_args)}")
    
    result = subprocess.run(pytest_args)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
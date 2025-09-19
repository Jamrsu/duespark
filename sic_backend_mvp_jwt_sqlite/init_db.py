#!/usr/bin/env python3
"""
Database initialization script.
Creates all tables from SQLAlchemy models.
"""

import os
import sys
from sqlalchemy import create_engine
from app.database import Base
from app import models  # Import models to register them

def init_database():
    """Create all database tables from models."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print(f"Connecting to database: {database_url}")
    
    try:
        engine = create_engine(database_url)
        print("Creating all tables from models...")
        Base.metadata.create_all(bind=engine)
        print("Database initialization completed successfully!")
        
    except Exception as e:
        print(f"ERROR: Database initialization failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    init_database()
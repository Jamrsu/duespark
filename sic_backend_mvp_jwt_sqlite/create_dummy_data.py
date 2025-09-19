#!/usr/bin/env python3
"""
Create dummy data for DueSpark analytics demo
"""
import requests
import json
from datetime import datetime, timedelta, timezone
import random

# API Configuration
BASE_URL = "http://localhost:8001"

def register_and_login():
    """Register a demo user and get auth token"""
    email = "demo@duespark.com"
    password = "demo123"
    
    # Try to register
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password
        })
        print(f"Register response: {response.status_code}")
    except Exception as e:
        print(f"Registration might have failed (user might exist): {e}")
    
    # Login
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if response.status_code == 200:
        token = response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def create_clients(headers):
    """Create sample clients"""
    clients = [
        {"name": "Acme Corp", "email": "billing@acme.com", "timezone": "UTC"},
        {"name": "TechStart Inc", "email": "accounts@techstart.com", "timezone": "America/New_York"},
        {"name": "Design Studio", "email": "payments@designstudio.com", "timezone": "Europe/London"},
        {"name": "Local Business", "email": "owner@localbiz.com", "timezone": "America/Los_Angeles"},
        {"name": "Startup Labs", "email": "finance@startuplabs.com", "timezone": "UTC"},
        {"name": "Global Enterprise", "email": "ap@globalent.com", "timezone": "Asia/Tokyo"},
    ]
    
    client_ids = []
    for client_data in clients:
        response = requests.post(f"{BASE_URL}/clients", headers=headers, json=client_data)
        if response.status_code == 200:
            client_id = response.json()["data"]["id"]
            client_ids.append(client_id)
            print(f"Created client: {client_data['name']} (ID: {client_id})")
        else:
            print(f"Failed to create client {client_data['name']}: {response.status_code}")
    
    return client_ids

def create_invoices_and_scenarios(headers, client_ids):
    """Create invoices with various scenarios"""
    now = datetime.now()
    
    scenarios = [
        # Recent paid invoices (for timeseries)
        {"days_ago": 2, "amount": 150000, "status": "paid", "client_idx": 0},
        {"days_ago": 5, "amount": 250000, "status": "paid", "client_idx": 1},
        {"days_ago": 8, "amount": 75000, "status": "paid", "client_idx": 2},
        {"days_ago": 12, "amount": 320000, "status": "paid", "client_idx": 3},
        {"days_ago": 15, "amount": 180000, "status": "paid", "client_idx": 0},
        {"days_ago": 20, "amount": 90000, "status": "paid", "client_idx": 4},
        
        # Pending invoices (current revenue pipeline)
        {"days_ago": -5, "amount": 120000, "status": "pending", "client_idx": 1},
        {"days_ago": -10, "amount": 200000, "status": "pending", "client_idx": 2},
        {"days_ago": -15, "amount": 80000, "status": "pending", "client_idx": 3},
        {"days_ago": -20, "amount": 150000, "status": "pending", "client_idx": 4},
        
        # Overdue invoices (problem accounts for late clients analysis)
        {"days_ago": 15, "amount": 180000, "status": "overdue", "client_idx": 1, "due_days_ago": 10},
        {"days_ago": 25, "amount": 95000, "status": "overdue", "client_idx": 1, "due_days_ago": 15},
        {"days_ago": 30, "amount": 220000, "status": "overdue", "client_idx": 5, "due_days_ago": 20},
        {"days_ago": 45, "amount": 110000, "status": "overdue", "client_idx": 5, "due_days_ago": 25},
        
        # Draft invoices
        {"days_ago": 0, "amount": 75000, "status": "draft", "client_idx": 0},
        {"days_ago": 1, "amount": 125000, "status": "draft", "client_idx": 2},
        
        # Mix of older data for variety
        {"days_ago": 35, "amount": 300000, "status": "paid", "client_idx": 0},
        {"days_ago": 40, "amount": 85000, "status": "paid", "client_idx": 3},
        {"days_ago": 50, "amount": 195000, "status": "paid", "client_idx": 4},
        {"days_ago": 60, "amount": 140000, "status": "paid", "client_idx": 2},
    ]
    
    invoice_ids = []
    
    for scenario in scenarios:
        client_id = client_ids[scenario["client_idx"]]
        created_date = now - timedelta(days=scenario["days_ago"])
        
        # Set due date
        if "due_days_ago" in scenario:
            due_date = (now - timedelta(days=scenario["due_days_ago"])).date()
        else:
            # Default: due 30 days after creation
            due_date = (created_date + timedelta(days=30)).date()
        
        invoice_data = {
            "client_id": client_id,
            "amount_cents": scenario["amount"],
            "currency": "USD",
            "due_date": due_date.isoformat(),
            "status": scenario["status"]
        }
        
        response = requests.post(f"{BASE_URL}/invoices", headers=headers, json=invoice_data)
        if response.status_code == 200:
            invoice_id = response.json()["data"]["id"]
            invoice_ids.append(invoice_id)
            
            # If this is a paid invoice, set paid_at timestamp
            if scenario["status"] == "paid":
                # Simulate payment date (random days after due date)
                payment_delay = random.randint(0, 10)
                paid_date = created_date + timedelta(days=30 + payment_delay)
                
                # Update invoice with specific paid timestamp (requires database access)
                # For demo purposes, just update to paid status
                # In production, this would be handled by payment webhooks
                pass
            
            print(f"Created invoice: ${scenario['amount']/100:.2f} for client {client_id} ({scenario['status']})")
        else:
            print(f"Failed to create invoice: {response.status_code} - {response.text}")
    
    return invoice_ids

def update_paid_invoices_with_timestamps(headers, invoice_ids):
    """Update paid invoices with realistic paid_at timestamps"""
    # This is a simplified approach - in a real system, the database trigger
    # or payment processor would set these timestamps
    
    # Get all invoices to find paid ones
    response = requests.get(f"{BASE_URL}/invoices?limit=100", headers=headers)
    if response.status_code == 200:
        invoices = response.json()["data"]
        
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        import os
        
        # Connect to database directly to set paid_at timestamps
        DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Import models
            import sys
            sys.path.append('/Users/jamsu/Desktop/duespark/sic_backend_mvp_jwt_sqlite')
            from app import models
            
            now = datetime.now(timezone.utc)
            
            for invoice in invoices:
                if invoice["status"] == "paid" and not invoice.get("paid_at"):
                    # Calculate a realistic paid_at time
                    created_at = datetime.fromisoformat(invoice["created_at"].replace('Z', '+00:00'))
                    due_date = datetime.fromisoformat(invoice["due_date"] + "T00:00:00+00:00")
                    
                    # Random payment delay (0-14 days after due date)
                    payment_delay = random.randint(0, 14)
                    paid_at = due_date + timedelta(days=payment_delay)
                    
                    # Don't set future dates
                    if paid_at > now:
                        paid_at = now - timedelta(hours=random.randint(1, 48))
                    
                    # Update in database
                    db_invoice = session.query(models.Invoice).filter(
                        models.Invoice.id == invoice["id"]
                    ).first()
                    
                    if db_invoice:
                        db_invoice.paid_at = paid_at
                        print(f"Set paid_at for invoice {invoice['id']}: {paid_at}")
            
            session.commit()
            print("Updated paid_at timestamps for paid invoices")
            
        except Exception as e:
            print(f"Error updating paid_at timestamps: {e}")
            session.rollback()
        finally:
            session.close()

def main():
    print("Creating dummy data for DueSpark analytics demo...")
    
    # Get authentication
    headers = register_and_login()
    if not headers:
        print("Failed to authenticate")
        return
    
    print("Authentication successful!")
    
    # Create clients
    print("\nCreating clients...")
    client_ids = create_clients(headers)
    
    if not client_ids:
        print("No clients created, exiting")
        return
    
    print(f"Created {len(client_ids)} clients")
    
    # Create invoices with various scenarios
    print("\nCreating invoices with various scenarios...")
    invoice_ids = create_invoices_and_scenarios(headers, client_ids)
    
    print(f"Created {len(invoice_ids)} invoices")
    
    # Update paid invoices with timestamps for analytics
    print("\nUpdating paid invoice timestamps...")
    update_paid_invoices_with_timestamps(headers, invoice_ids)
    
    print("\n✅ Dummy data creation complete!")
    print(f"🌐 Frontend: http://localhost:5173/")
    print(f"🔧 Backend API: http://localhost:8001/")
    print(f"📊 Analytics Summary: http://localhost:8001/analytics/summary")
    print(f"📈 Timeseries: http://localhost:8001/analytics/timeseries?metric=payments&interval=week")
    print("\nYou can now:")
    print("1. Open the frontend at http://localhost:5173/")
    print("2. Use the demo user: demo@duespark.com / demo123")
    print("3. View the enhanced analytics dashboard with:")
    print("   - Status totals across all categories")
    print("   - Expected payments calculation")
    print("   - Average days to pay metrics") 
    print("   - Top late clients analysis")
    print("   - Interactive timeseries charts")

if __name__ == "__main__":
    main()
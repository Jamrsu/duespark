#!/usr/bin/env python3
"""
Script to populate the demo account with dummy data
Creates 10 clients and 100 invoices for demo@example.com
"""

import requests
import json
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# Configuration
API_BASE = "http://localhost:8001"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo123"

# Login to get auth token
def get_auth_token():
    login_data = {
        "username": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    }
    
    response = requests.post(
        f"{API_BASE}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None
    
    data = response.json()
    return data["data"]["access_token"]

# Create a client
def create_client(token, name, email, timezone="UTC"):
    client_data = {
        "name": name,
        "email": email,
        "timezone": timezone
    }
    
    response = requests.post(
        f"{API_BASE}/clients",
        json=client_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code != 200:
        print(f"Failed to create client {name}: {response.status_code} - {response.text}")
        return None
    
    data = response.json()
    return data["data"]

# Create an invoice
def create_invoice(token, client_id, amount_cents, due_date, status="draft"):
    invoice_data = {
        "client_id": client_id,
        "amount_cents": amount_cents,
        "currency": "USD",
        "due_date": due_date.date().isoformat(),
        "status": status
    }
    
    response = requests.post(
        f"{API_BASE}/invoices",
        json=invoice_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code != 200:
        print(f"Failed to create invoice: {response.status_code} - {response.text}")
        return None
    
    data = response.json()
    return data["data"]

def main():
    print("🚀 Starting demo data population...")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Failed to get auth token")
        return
    
    print("✅ Successfully authenticated")
    
    # Create 10 clients
    print("\n📝 Creating 10 clients...")
    clients = []
    
    company_types = ["Inc", "LLC", "Corp", "Ltd", "Co"]
    business_words = ["Solutions", "Services", "Consulting", "Tech", "Systems", "Group", "Partners", "Digital", "Creative", "Marketing"]
    timezones = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo"]
    
    for i in range(10):
        company_name = f"{fake.company().replace(',', '').replace('.', '')} {random.choice(company_types)}"
        client_email = fake.email()
        timezone = random.choice(timezones)
        
        client = create_client(token, company_name, client_email, timezone)
        if client:
            clients.append(client)
            print(f"  ✅ Created client: {company_name}")
        else:
            print(f"  ❌ Failed to create client: {company_name}")
    
    if not clients:
        print("❌ No clients created, cannot create invoices")
        return
    
    print(f"✅ Created {len(clients)} clients")
    
    # Create 100 invoices
    print("\n💰 Creating 100 invoices...")
    invoices_created = 0
    
    # Status distribution
    statuses = ["draft", "pending", "paid", "overdue", "cancelled"]
    status_weights = [20, 30, 35, 10, 5]  # Percentages
    
    for i in range(100):
        # Random client
        client = random.choice(clients)
        
        # Random amount between $100 and $10,000
        amount_cents = random.randint(10000, 1000000)  # $100 to $10,000
        
        # Random due date between 60 days ago and 90 days in future
        days_offset = random.randint(-60, 90)
        due_date = datetime.now() + timedelta(days=days_offset)
        
        # Random status based on weights
        status = random.choices(statuses, weights=status_weights)[0]
        
        # Adjust status based on due date logic
        if due_date < datetime.now() and status not in ["paid", "cancelled"]:
            if random.random() < 0.7:  # 70% chance of being overdue if past due
                status = "overdue"
        
        invoice = create_invoice(token, client["id"], amount_cents, due_date, status)
        if invoice:
            invoices_created += 1
            if invoices_created % 10 == 0:
                print(f"  📊 Created {invoices_created}/100 invoices...")
    
    print(f"✅ Created {invoices_created} invoices")
    
    # Summary
    print(f"\n🎉 Demo data population complete!")
    print(f"   👥 Clients: {len(clients)}")
    print(f"   📄 Invoices: {invoices_created}")
    print(f"   🔑 Demo credentials: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print(f"   🌐 Login at: http://localhost:5173")

if __name__ == "__main__":
    main()
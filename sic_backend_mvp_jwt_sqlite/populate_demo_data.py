#!/usr/bin/env python3
"""
Script to populate the demo account with dummy data
Creates 10 clients and 100 invoices for demo@example.com
"""

import json
import logging
import random
from datetime import datetime, timedelta

import requests
from faker import Faker

fake = Faker()

logger = logging.getLogger("duespark.populate_demo_data")


def configure_logging() -> None:
    if logging.getLogger().handlers:
        return

    logging.basicConfig(
        level=logging.INFO,
        format='{"timestamp":"%(asctime)s","logger":"%(name)s","level":"%(levelname)s","message":"%(message)s"}'
    )


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
        logger.error(
            "demo login failed",
            extra={"status_code": response.status_code, "response_text": response.text}
        )
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
        logger.error(
            "failed creating client",
            extra={"client_name": name, "status_code": response.status_code, "response_text": response.text}
        )
        return None

    logger.info("created client", extra={"client_name": name})
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
        logger.error(
            "failed creating invoice",
            extra={"status_code": response.status_code, "response_text": response.text}
        )
        return None

    invoice = response.json()["data"]
    logger.info(
        "created invoice",
        extra={
            "invoice_id": invoice.get("id"),
            "invoice_number": invoice.get("invoice_number"),
            "client_id": client_id,
            "amount_cents": amount_cents
        }
    )
    return invoice

def main():
    configure_logging()
    logger.info("starting demo data population", extra={"api_base": API_BASE, "demo_email": DEMO_EMAIL})

    # Get auth token
    token = get_auth_token()
    if not token:
        logger.error("aborting demo population due to missing auth token")
        return

    logger.info("authenticated demo user")

    # Create 10 clients
    logger.info("creating clients", extra={"target_count": 10})
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
        else:
            logger.error("client creation failed", extra={"client_name": company_name})

    if not clients:
        logger.error("no clients created; aborting invoice generation")
        return

    logger.info("clients created", extra={"count": len(clients)})

    # Create 100 invoices
    logger.info("creating invoices", extra={"target_count": 100})
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
                logger.info("invoice progress", extra={"created": invoices_created, "target": 100})
    
    logger.info(
        "demo invoice creation complete",
        extra={"created_invoices": invoices_created}
    )

    # Summary
    logger.info(
        "demo data population complete",
        extra={
            "clients": len(clients),
            "invoices": invoices_created,
            "demo_email": DEMO_EMAIL,
            "login_url": "http://localhost:5173"
        }
    )

if __name__ == "__main__":
    main()

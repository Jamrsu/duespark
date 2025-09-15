# Quickstart Guide

Get up and running with DueSpark in just 5 minutes! This guide will walk you through setting up your account, creating your first client, and sending your first automated reminder.

## Prerequisites

- A valid email address
- Access to your invoice data (optional, for import)
- Payment provider account (Stripe recommended)

## Step 1: Create Your Account

### Sign Up

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="signup-method">
<TabItem value="web" label="Web Interface">

1. Visit [app.duespark.com](https://app.duespark.com)
2. Click **Sign Up**
3. Enter your email and create a password
4. Verify your email address

</TabItem>
<TabItem value="api" label="API">

```bash
curl -X POST https://api.duespark.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@company.com",
    "password": "secure-password"
  }'
```

Response:
```json
{
  "message": "User created successfully. Please check your email for verification.",
  "user": {
    "id": 1,
    "email": "your-email@company.com",
    "email_verified": false
  }
}
```

</TabItem>
</Tabs>

### Verify Your Email

Check your email for a verification link and click it to activate your account.

## Step 2: Authentication

<Tabs groupId="auth-language">
<TabItem value="curl" label="curl">

```bash
# Login to get your access token
curl -X POST https://api.duespark.com/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@company.com&password=secure-password"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "your-email@company.com"
  }
}
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Using fetch API
const login = async () => {
  const response = await fetch('https://api.duespark.com/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: 'your-email@company.com',
      password: 'secure-password'
    })
  });

  const data = await response.json();
  const token = data.access_token;

  // Store token for future requests
  localStorage.setItem('duespark_token', token);
  return token;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests

def login():
    url = "https://api.duespark.com/auth/login"
    data = {
        "username": "your-email@company.com",
        "password": "secure-password"
    }

    response = requests.post(url, data=data)
    response.raise_for_status()

    token = response.json()["access_token"]
    return token

# Get your access token
token = login()
```

</TabItem>
</Tabs>

## Step 3: Create Your First Client

<Tabs groupId="client-language">
<TabItem value="curl" label="curl">

```bash
# Create a client
curl -X POST https://api.duespark.com/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "billing@acme.com",
    "company": "Acme Corp",
    "phone": "+1-555-0123",
    "address": "123 Business St, New York, NY 10001"
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Acme Corporation",
  "email": "billing@acme.com",
  "company": "Acme Corp",
  "phone": "+1-555-0123",
  "address": "123 Business St, New York, NY 10001",
  "created_at": "2024-01-15T10:30:00Z"
}
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const createClient = async (token) => {
  const response = await fetch('https://api.duespark.com/clients', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      company: 'Acme Corp',
      phone: '+1-555-0123',
      address: '123 Business St, New York, NY 10001'
    })
  });

  const client = await response.json();
  console.log('Created client:', client);
  return client;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
def create_client(token):
    url = "https://api.duespark.com/clients"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "name": "Acme Corporation",
        "email": "billing@acme.com",
        "company": "Acme Corp",
        "phone": "+1-555-0123",
        "address": "123 Business St, New York, NY 10001"
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

# Create the client
client = create_client(token)
print(f"Created client: {client['name']} (ID: {client['id']})")
```

</TabItem>
</Tabs>

## Step 4: Create Your First Invoice

<Tabs groupId="invoice-language">
<TabItem value="curl" label="curl">

```bash
# Create an invoice
curl -X POST https://api.duespark.com/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "invoice_number": "INV-001",
    "amount": 1500.00,
    "due_date": "2024-02-15",
    "description": "Web development services - January 2024",
    "status": "pending"
  }'
```

Response:
```json
{
  "id": 1,
  "client_id": 1,
  "invoice_number": "INV-001",
  "amount": 1500.00,
  "due_date": "2024-02-15",
  "description": "Web development services - January 2024",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const createInvoice = async (token, clientId) => {
  const response = await fetch('https://api.duespark.com/invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      invoice_number: 'INV-001',
      amount: 1500.00,
      due_date: '2024-02-15',
      description: 'Web development services - January 2024',
      status: 'pending'
    })
  });

  const invoice = await response.json();
  console.log('Created invoice:', invoice);
  return invoice;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
def create_invoice(token, client_id):
    url = "https://api.duespark.com/invoices"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "client_id": client_id,
        "invoice_number": "INV-001",
        "amount": 1500.00,
        "due_date": "2024-02-15",
        "description": "Web development services - January 2024",
        "status": "pending"
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

# Create the invoice
invoice = create_invoice(token, client['id'])
print(f"Created invoice: {invoice['invoice_number']} for ${invoice['amount']}")
```

</TabItem>
</Tabs>

## Step 5: Set Up Your First Reminder

<Tabs groupId="reminder-language">
<TabItem value="curl" label="curl">

```bash
# Create a reminder
curl -X POST https://api.duespark.com/reminders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 1,
    "scheduled_date": "2024-02-10T09:00:00Z",
    "channel": "email",
    "template_name": "payment_reminder",
    "custom_message": "Hi there! Just a friendly reminder about your upcoming payment."
  }'
```

Response:
```json
{
  "id": 1,
  "invoice_id": 1,
  "scheduled_date": "2024-02-10T09:00:00Z",
  "status": "scheduled",
  "channel": "email",
  "template_name": "payment_reminder",
  "custom_message": "Hi there! Just a friendly reminder about your upcoming payment.",
  "created_at": "2024-01-15T10:30:00Z"
}
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const createReminder = async (token, invoiceId) => {
  const response = await fetch('https://api.duespark.com/reminders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      scheduled_date: '2024-02-10T09:00:00Z',
      channel: 'email',
      template_name: 'payment_reminder',
      custom_message: 'Hi there! Just a friendly reminder about your upcoming payment.'
    })
  });

  const reminder = await response.json();
  console.log('Created reminder:', reminder);
  return reminder;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
def create_reminder(token, invoice_id):
    url = "https://api.duespark.com/reminders"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "invoice_id": invoice_id,
        "scheduled_date": "2024-02-10T09:00:00Z",
        "channel": "email",
        "template_name": "payment_reminder",
        "custom_message": "Hi there! Just a friendly reminder about your upcoming payment."
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

# Create the reminder
reminder = create_reminder(token, invoice['id'])
print(f"Reminder scheduled for {reminder['scheduled_date']}")
```

</TabItem>
</Tabs>

## Step 6: Monitor Your Dashboard

### Check Your Dashboard

<Tabs groupId="dashboard-language">
<TabItem value="curl" label="curl">

```bash
# Get dashboard analytics
curl -X GET "https://api.duespark.com/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "total_invoices": 1,
  "total_revenue": 1500.00,
  "pending_invoices": 1,
  "overdue_invoices": 0,
  "paid_invoices": 0,
  "reminders_sent": 0,
  "email_open_rate": 0.0,
  "payment_success_rate": 0.0,
  "average_payment_time": 0.0
}
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const getDashboard = async (token) => {
  const response = await fetch('https://api.duespark.com/analytics/dashboard', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const analytics = await response.json();
  console.log('Dashboard analytics:', analytics);
  return analytics;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
def get_dashboard(token):
    url = "https://api.duespark.com/analytics/dashboard"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

# Check your dashboard
dashboard = get_dashboard(token)
print(f"Total invoices: {dashboard['total_invoices']}")
print(f"Total revenue: ${dashboard['total_revenue']}")
```

</TabItem>
</Tabs>

## Complete Example

Here's a complete workflow example combining all the steps:

<Tabs groupId="complete-language">
<TabItem value="python" label="Python">

```python
import requests
import json
from datetime import datetime, timedelta

class DueSparkClient:
    def __init__(self, base_url="https://api.duespark.com"):
        self.base_url = base_url
        self.token = None

    def login(self, email, password):
        """Authenticate and get access token"""
        url = f"{self.base_url}/auth/login"
        data = {"username": email, "password": password}

        response = requests.post(url, data=data)
        response.raise_for_status()

        self.token = response.json()["access_token"]
        return self.token

    def _headers(self):
        """Get authorized headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def create_client(self, name, email, **kwargs):
        """Create a new client"""
        url = f"{self.base_url}/clients"
        data = {"name": name, "email": email, **kwargs}

        response = requests.post(url, headers=self._headers(), json=data)
        response.raise_for_status()
        return response.json()

    def create_invoice(self, client_id, invoice_number, amount, due_date, **kwargs):
        """Create a new invoice"""
        url = f"{self.base_url}/invoices"
        data = {
            "client_id": client_id,
            "invoice_number": invoice_number,
            "amount": amount,
            "due_date": due_date,
            "status": "pending",
            **kwargs
        }

        response = requests.post(url, headers=self._headers(), json=data)
        response.raise_for_status()
        return response.json()

    def create_reminder(self, invoice_id, scheduled_date, **kwargs):
        """Create a new reminder"""
        url = f"{self.base_url}/reminders"
        data = {
            "invoice_id": invoice_id,
            "scheduled_date": scheduled_date,
            "channel": "email",
            "template_name": "payment_reminder",
            **kwargs
        }

        response = requests.post(url, headers=self._headers(), json=data)
        response.raise_for_status()
        return response.json()

    def get_dashboard(self):
        """Get dashboard analytics"""
        url = f"{self.base_url}/analytics/dashboard"
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

# Example usage
def main():
    # Initialize client
    client = DueSparkClient()

    # Login
    token = client.login("your-email@company.com", "secure-password")
    print("✅ Logged in successfully")

    # Create a client
    client_data = client.create_client(
        name="Acme Corporation",
        email="billing@acme.com",
        company="Acme Corp",
        phone="+1-555-0123"
    )
    print(f"✅ Created client: {client_data['name']} (ID: {client_data['id']})")

    # Create an invoice
    due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    invoice_data = client.create_invoice(
        client_id=client_data['id'],
        invoice_number="INV-001",
        amount=1500.00,
        due_date=due_date,
        description="Web development services"
    )
    print(f"✅ Created invoice: {invoice_data['invoice_number']} for ${invoice_data['amount']}")

    # Schedule a reminder
    reminder_date = (datetime.now() + timedelta(days=25)).isoformat() + "Z"
    reminder_data = client.create_reminder(
        invoice_id=invoice_data['id'],
        scheduled_date=reminder_date,
        custom_message="Just a friendly reminder about your upcoming payment!"
    )
    print(f"✅ Scheduled reminder for {reminder_data['scheduled_date']}")

    # Check dashboard
    dashboard = client.get_dashboard()
    print(f"📊 Dashboard: {dashboard['total_invoices']} invoices, ${dashboard['total_revenue']} revenue")

    print("\n🎉 Setup complete! Your automated invoice reminder system is ready.")

if __name__ == "__main__":
    main()
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
class DueSparkClient {
  constructor(baseUrl = 'https://api.duespark.com') {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password })
    });

    const data = await response.json();
    this.token = data.access_token;
    return this.token;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async createClient(clientData) {
    const response = await fetch(`${this.baseUrl}/clients`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(clientData)
    });
    return response.json();
  }

  async createInvoice(invoiceData) {
    const response = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...invoiceData, status: 'pending' })
    });
    return response.json();
  }

  async createReminder(reminderData) {
    const response = await fetch(`${this.baseUrl}/reminders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...reminderData,
        channel: 'email',
        template_name: 'payment_reminder'
      })
    });
    return response.json();
  }

  async getDashboard() {
    const response = await fetch(`${this.baseUrl}/analytics/dashboard`, {
      headers: this.getHeaders()
    });
    return response.json();
  }
}

// Example usage
async function main() {
  const client = new DueSparkClient();

  try {
    // Login
    await client.login('your-email@company.com', 'secure-password');
    console.log('✅ Logged in successfully');

    // Create client
    const clientData = await client.createClient({
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      company: 'Acme Corp',
      phone: '+1-555-0123'
    });
    console.log(`✅ Created client: ${clientData.name} (ID: ${clientData.id})`);

    // Create invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceData = await client.createInvoice({
      client_id: clientData.id,
      invoice_number: 'INV-001',
      amount: 1500.00,
      due_date: dueDate.toISOString().split('T')[0],
      description: 'Web development services'
    });
    console.log(`✅ Created invoice: ${invoiceData.invoice_number} for $${invoiceData.amount}`);

    // Schedule reminder
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 25);

    const reminderData = await client.createReminder({
      invoice_id: invoiceData.id,
      scheduled_date: reminderDate.toISOString(),
      custom_message: 'Just a friendly reminder about your upcoming payment!'
    });
    console.log(`✅ Scheduled reminder for ${reminderData.scheduled_date}`);

    // Check dashboard
    const dashboard = await client.getDashboard();
    console.log(`📊 Dashboard: ${dashboard.total_invoices} invoices, $${dashboard.total_revenue} revenue`);

    console.log('\n🎉 Setup complete! Your automated invoice reminder system is ready.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
```

</TabItem>
</Tabs>

## Next Steps

Congratulations! You now have:

- ✅ A DueSpark account
- ✅ Your first client
- ✅ Your first invoice
- ✅ An automated reminder scheduled

### What's Next?

1. **[Import Existing Data](./guides/importing-data)**: Bulk import your existing invoices and clients
2. **[Customize Templates](./guides/email-templates)**: Create personalized email templates
3. **[Set Up Integrations](./guides/integrations)**: Connect Stripe, QuickBooks, or other tools
4. **[Configure Webhooks](./guides/webhooks)**: Get real-time notifications
5. **[Explore Analytics](./guides/analytics)**: Track your payment performance

### Need Help?

- 📖 **[Full Documentation](./overview)**: Complete guides and references
- 🔧 **[API Reference](./api)**: Detailed API documentation
- 💬 **[Community Forum](https://community.duespark.com)**: Connect with other users
- 📧 **[Support](mailto:support@duespark.com)**: Get help from our team

---

*Ready to automate your invoices? Start with the [Web Dashboard](https://app.duespark.com) or continue building with our [API](./api)!*
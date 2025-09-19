# Basic Setup Example

This example demonstrates a complete DueSpark setup from registration to sending your first automated reminder. Perfect for new users who want to understand the full workflow.

## Scenario

You're a freelance web developer who just finished a project for Acme Corporation. You want to:

1. Set up DueSpark account
2. Add Acme as a client
3. Create an invoice for $2,500
4. Schedule automated reminders
5. Track payment status

## Prerequisites

- Python 3.7+ or Node.js 14+
- Valid email address
- Project completion with client details

## Complete Python Example

```python
#!/usr/bin/env python3
"""
DueSpark Basic Setup Example

A complete workflow demonstrating:
- Account setup and authentication
- Client management
- Invoice creation
- Reminder scheduling
- Status tracking
"""

import requests
import json
from datetime import datetime, timedelta
import time

class DueSparkExample:
    def __init__(self):
        self.base_url = "https://api.duespark.com"
        self.token = None

    def register_account(self, email, password):
        """Step 1: Register new account"""
        print("🔐 Registering new account...")

        url = f"{self.base_url}/auth/register"
        data = {
            "email": email,
            "password": password
        }

        response = requests.post(url, json=data)

        if response.status_code == 200:
            print(f"✅ Account created! Check {email} for verification link")
            return response.json()
        else:
            print(f"❌ Registration failed: {response.text}")
            return None

    def login(self, email, password):
        """Step 2: Authenticate and get access token"""
        print("🔓 Logging in...")

        url = f"{self.base_url}/auth/login"
        data = {
            "username": email,
            "password": password
        }

        response = requests.post(url, data=data)

        if response.status_code == 200:
            result = response.json()
            self.token = result["access_token"]
            print("✅ Login successful!")
            return result
        else:
            print(f"❌ Login failed: {response.text}")
            return None

    def _get_headers(self):
        """Get authorized request headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def create_client(self, client_info):
        """Step 3: Create a new client"""
        print(f"👤 Creating client: {client_info['name']}...")

        url = f"{self.base_url}/clients"
        response = requests.post(url, headers=self._get_headers(), json=client_info)

        if response.status_code == 200:
            client = response.json()
            print(f"✅ Client created: {client['name']} (ID: {client['id']})")
            return client
        else:
            print(f"❌ Client creation failed: {response.text}")
            return None

    def create_invoice(self, invoice_info):
        """Step 4: Create an invoice"""
        print(f"🧾 Creating invoice: {invoice_info['invoice_number']}...")

        url = f"{self.base_url}/invoices"
        response = requests.post(url, headers=self._get_headers(), json=invoice_info)

        if response.status_code == 200:
            invoice = response.json()
            print(f"✅ Invoice created: {invoice['invoice_number']} for ${invoice['amount']}")
            return invoice
        else:
            print(f"❌ Invoice creation failed: {response.text}")
            return None

    def create_reminder(self, reminder_info):
        """Step 5: Schedule a reminder"""
        print(f"⏰ Scheduling reminder for {reminder_info['scheduled_date']}...")

        url = f"{self.base_url}/reminders"
        response = requests.post(url, headers=self._get_headers(), json=reminder_info)

        if response.status_code == 200:
            reminder = response.json()
            print(f"✅ Reminder scheduled (ID: {reminder['id']})")
            return reminder
        else:
            print(f"❌ Reminder creation failed: {response.text}")
            return None

    def get_dashboard(self):
        """Step 6: Check dashboard analytics"""
        print("📊 Fetching dashboard analytics...")

        url = f"{self.base_url}/analytics/dashboard"
        response = requests.get(url, headers=self._get_headers())

        if response.status_code == 200:
            analytics = response.json()
            print("✅ Dashboard data retrieved:")
            print(f"   💰 Total Revenue: ${analytics['total_revenue']}")
            print(f"   📋 Total Invoices: {analytics['total_invoices']}")
            print(f"   ⏳ Pending: {analytics['pending_invoices']}")
            print(f"   📧 Reminders Sent: {analytics['reminders_sent']}")
            return analytics
        else:
            print(f"❌ Dashboard fetch failed: {response.text}")
            return None

    def run_complete_example(self):
        """Run the complete workflow"""
        print("🚀 Starting DueSpark Basic Setup Example\n")

        # Configuration
        user_email = "freelancer@example.com"
        user_password = "SecurePassword123!"

        # Step 1: Register (skip if account exists)
        print("=" * 50)
        self.register_account(user_email, user_password)

        # Note: In real usage, you'd verify your email here
        print("📧 Please verify your email before continuing...")
        input("Press Enter after verifying your email...")

        # Step 2: Login
        print("\n" + "=" * 50)
        login_result = self.login(user_email, user_password)
        if not login_result:
            return

        # Step 3: Create client
        print("\n" + "=" * 50)
        client_info = {
            "name": "Sarah Johnson",
            "email": "sarah@acmecorp.com",
            "company": "Acme Corporation",
            "phone": "+1-555-0123",
            "address": "123 Business St\nNew York, NY 10001"
        }

        client = self.create_client(client_info)
        if not client:
            return

        # Step 4: Create invoice
        print("\n" + "=" * 50)
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        invoice_info = {
            "client_id": client["id"],
            "invoice_number": "INV-2024-001",
            "amount": 2500.00,
            "due_date": due_date,
            "description": "Web development project - React dashboard with user management system",
            "status": "pending"
        }

        invoice = self.create_invoice(invoice_info)
        if not invoice:
            return

        # Step 5: Schedule reminders
        print("\n" + "=" * 50)

        # First reminder - 5 days before due date
        first_reminder_date = (datetime.now() + timedelta(days=25)).isoformat() + "Z"
        first_reminder = {
            "invoice_id": invoice["id"],
            "scheduled_date": first_reminder_date,
            "channel": "email",
            "template_name": "payment_reminder",
            "custom_message": "Hi Sarah! Just a friendly heads up that your payment for the React dashboard project is due in 5 days. Thanks for working with me!"
        }

        reminder1 = self.create_reminder(first_reminder)

        # Second reminder - 1 day after due date
        second_reminder_date = (datetime.now() + timedelta(days=31)).isoformat() + "Z"
        second_reminder = {
            "invoice_id": invoice["id"],
            "scheduled_date": second_reminder_date,
            "channel": "email",
            "template_name": "overdue_notice",
            "custom_message": "Hi Sarah, I hope all is well. Your payment for the React dashboard project is now overdue. Please let me know if you need any clarification or if there are any issues."
        }

        reminder2 = self.create_reminder(second_reminder)

        # Step 6: Check dashboard
        print("\n" + "=" * 50)
        dashboard = self.get_dashboard()

        # Step 7: Summary
        print("\n" + "=" * 50)
        print("🎉 Setup Complete! Here's what we created:")
        print(f"   👤 Client: {client['name']} ({client['email']})")
        print(f"   🧾 Invoice: {invoice['invoice_number']} - ${invoice['amount']}")
        print(f"   ⏰ Reminder 1: {first_reminder_date[:10]} (5 days before due)")
        print(f"   ⏰ Reminder 2: {second_reminder_date[:10]} (1 day after due)")
        print("\n📱 Next steps:")
        print("   1. Check your email for verification")
        print("   2. Customize your email templates")
        print("   3. Connect payment providers (Stripe)")
        print("   4. Set up webhooks for real-time updates")
        print(f"   5. Monitor at: https://app.duespark.com")

def main():
    """Run the example"""
    example = DueSparkExample()

    try:
        example.run_complete_example()
    except KeyboardInterrupt:
        print("\n\n⏹️  Example interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error running example: {e}")
        print("Check your internet connection and API credentials")

if __name__ == "__main__":
    main()
```

## Complete JavaScript Example

```javascript
/**
 * DueSpark Basic Setup Example - JavaScript/Node.js
 *
 * Demonstrates complete workflow from account setup to reminder scheduling
 */

const fetch = require('node-fetch'); // npm install node-fetch
const readline = require('readline');

class DueSparkExample {
  constructor() {
    this.baseUrl = 'https://api.duespark.com';
    this.token = null;
  }

  async registerAccount(email, password) {
    console.log('🔐 Registering new account...');

    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Account created! Check ${email} for verification link`);
      return result;
    } else {
      const error = await response.text();
      console.log(`❌ Registration failed: ${error}`);
      return null;
    }
  }

  async login(email, password) {
    console.log('🔓 Logging in...');

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password })
    });

    if (response.ok) {
      const result = await response.json();
      this.token = result.access_token;
      console.log('✅ Login successful!');
      return result;
    } else {
      const error = await response.text();
      console.log(`❌ Login failed: ${error}`);
      return null;
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async createClient(clientInfo) {
    console.log(`👤 Creating client: ${clientInfo.name}...`);

    const response = await fetch(`${this.baseUrl}/clients`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(clientInfo)
    });

    if (response.ok) {
      const client = await response.json();
      console.log(`✅ Client created: ${client.name} (ID: ${client.id})`);
      return client;
    } else {
      const error = await response.text();
      console.log(`❌ Client creation failed: ${error}`);
      return null;
    }
  }

  async createInvoice(invoiceInfo) {
    console.log(`🧾 Creating invoice: ${invoiceInfo.invoice_number}...`);

    const response = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(invoiceInfo)
    });

    if (response.ok) {
      const invoice = await response.json();
      console.log(`✅ Invoice created: ${invoice.invoice_number} for $${invoice.amount}`);
      return invoice;
    } else {
      const error = await response.text();
      console.log(`❌ Invoice creation failed: ${error}`);
      return null;
    }
  }

  async createReminder(reminderInfo) {
    console.log(`⏰ Scheduling reminder for ${reminderInfo.scheduled_date}...`);

    const response = await fetch(`${this.baseUrl}/reminders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reminderInfo)
    });

    if (response.ok) {
      const reminder = await response.json();
      console.log(`✅ Reminder scheduled (ID: ${reminder.id})`);
      return reminder;
    } else {
      const error = await response.text();
      console.log(`❌ Reminder creation failed: ${error}`);
      return null;
    }
  }

  async getDashboard() {
    console.log('📊 Fetching dashboard analytics...');

    const response = await fetch(`${this.baseUrl}/analytics/dashboard`, {
      headers: this.getHeaders()
    });

    if (response.ok) {
      const analytics = await response.json();
      console.log('✅ Dashboard data retrieved:');
      console.log(`   💰 Total Revenue: $${analytics.total_revenue}`);
      console.log(`   📋 Total Invoices: ${analytics.total_invoices}`);
      console.log(`   ⏳ Pending: ${analytics.pending_invoices}`);
      console.log(`   📧 Reminders Sent: ${analytics.reminders_sent}`);
      return analytics;
    } else {
      const error = await response.text();
      console.log(`❌ Dashboard fetch failed: ${error}`);
      return null;
    }
  }

  async askQuestion(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async runCompleteExample() {
    console.log('🚀 Starting DueSpark Basic Setup Example\n');

    // Configuration
    const userEmail = 'freelancer@example.com';
    const userPassword = 'SecurePassword123!';

    try {
      // Step 1: Register
      console.log('='.repeat(50));
      await this.registerAccount(userEmail, userPassword);

      // Note: In real usage, you'd verify your email here
      console.log('📧 Please verify your email before continuing...');
      await this.askQuestion('Press Enter after verifying your email...');

      // Step 2: Login
      console.log('\n' + '='.repeat(50));
      const loginResult = await this.login(userEmail, userPassword);
      if (!loginResult) return;

      // Step 3: Create client
      console.log('\n' + '='.repeat(50));
      const clientInfo = {
        name: 'Sarah Johnson',
        email: 'sarah@acmecorp.com',
        company: 'Acme Corporation',
        phone: '+1-555-0123',
        address: '123 Business St\nNew York, NY 10001'
      };

      const client = await this.createClient(clientInfo);
      if (!client) return;

      // Step 4: Create invoice
      console.log('\n' + '='.repeat(50));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceInfo = {
        client_id: client.id,
        invoice_number: 'INV-2024-001',
        amount: 2500.00,
        due_date: dueDate.toISOString().split('T')[0],
        description: 'Web development project - React dashboard with user management system',
        status: 'pending'
      };

      const invoice = await this.createInvoice(invoiceInfo);
      if (!invoice) return;

      // Step 5: Schedule reminders
      console.log('\n' + '='.repeat(50));

      // First reminder - 5 days before due date
      const firstReminderDate = new Date();
      firstReminderDate.setDate(firstReminderDate.getDate() + 25);

      const firstReminder = {
        invoice_id: invoice.id,
        scheduled_date: firstReminderDate.toISOString(),
        channel: 'email',
        template_name: 'payment_reminder',
        custom_message: 'Hi Sarah! Just a friendly heads up that your payment for the React dashboard project is due in 5 days. Thanks for working with me!'
      };

      await this.createReminder(firstReminder);

      // Second reminder - 1 day after due date
      const secondReminderDate = new Date();
      secondReminderDate.setDate(secondReminderDate.getDate() + 31);

      const secondReminder = {
        invoice_id: invoice.id,
        scheduled_date: secondReminderDate.toISOString(),
        channel: 'email',
        template_name: 'overdue_notice',
        custom_message: 'Hi Sarah, I hope all is well. Your payment for the React dashboard project is now overdue. Please let me know if you need any clarification or if there are any issues.'
      };

      await this.createReminder(secondReminder);

      // Step 6: Check dashboard
      console.log('\n' + '='.repeat(50));
      await this.getDashboard();

      // Step 7: Summary
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Setup Complete! Here\'s what we created:');
      console.log(`   👤 Client: ${client.name} (${client.email})`);
      console.log(`   🧾 Invoice: ${invoice.invoice_number} - $${invoice.amount}`);
      console.log(`   ⏰ Reminder 1: ${firstReminderDate.toISOString().split('T')[0]} (5 days before due)`);
      console.log(`   ⏰ Reminder 2: ${secondReminderDate.toISOString().split('T')[0]} (1 day after due)`);
      console.log('\n📱 Next steps:');
      console.log('   1. Check your email for verification');
      console.log('   2. Customize your email templates');
      console.log('   3. Connect payment providers (Stripe)');
      console.log('   4. Set up webhooks for real-time updates');
      console.log('   5. Monitor at: https://app.duespark.com');

    } catch (error) {
      console.log(`\n\n❌ Error running example: ${error.message}`);
      console.log('Check your internet connection and API credentials');
    }
  }
}

// Run the example
async function main() {
  const example = new DueSparkExample();
  await example.runCompleteExample();
}

main().catch(console.error);
```

## Expected Output

When you run this example, you should see output like:

```
🚀 Starting DueSpark Basic Setup Example

==================================================
🔐 Registering new account...
✅ Account created! Check freelancer@example.com for verification link
📧 Please verify your email before continuing...

==================================================
🔓 Logging in...
✅ Login successful!

==================================================
👤 Creating client: Sarah Johnson...
✅ Client created: Sarah Johnson (ID: 123)

==================================================
🧾 Creating invoice: INV-2024-001...
✅ Invoice created: INV-2024-001 for $2500.0

==================================================
⏰ Scheduling reminder for 2024-02-10T09:00:00Z...
✅ Reminder scheduled (ID: 456)
⏰ Scheduling reminder for 2024-02-16T09:00:00Z...
✅ Reminder scheduled (ID: 789)

==================================================
📊 Fetching dashboard analytics...
✅ Dashboard data retrieved:
   💰 Total Revenue: $2500.0
   📋 Total Invoices: 1
   ⏳ Pending: 1
   📧 Reminders Sent: 0

==================================================
🎉 Setup Complete! Here's what we created:
   👤 Client: Sarah Johnson (sarah@acmecorp.com)
   🧾 Invoice: INV-2024-001 - $2500.0
   ⏰ Reminder 1: 2024-02-10 (5 days before due)
   ⏰ Reminder 2: 2024-02-16 (1 day after due)

📱 Next steps:
   1. Check your email for verification
   2. Customize your email templates
   3. Connect payment providers (Stripe)
   4. Set up webhooks for real-time updates
   5. Monitor at: https://app.duespark.com
```

## Key Concepts Explained

### 1. Authentication Flow
- **Registration**: Creates account and sends verification email
- **Login**: Returns JWT token for API access
- **Token Usage**: Include in Authorization header for all requests

### 2. Resource Creation
- **Clients**: Represent your customers or business contacts
- **Invoices**: Linked to clients with due dates and amounts
- **Reminders**: Scheduled notifications tied to invoices

### 3. Scheduling Logic
- **First Reminder**: 5 days before due date (gentle reminder)
- **Second Reminder**: 1 day after due date (overdue notice)
- **Custom Messages**: Personalized content for each reminder

### 4. Analytics Tracking
- **Real-time Data**: Immediate updates to dashboard metrics
- **Payment Status**: Track pending, overdue, and paid invoices
- **Performance Metrics**: Monitor email open rates and payment success

## Next Steps

After running this example:

1. **Customize Templates**: Create branded email templates
2. **Add Webhooks**: Get real-time payment notifications
3. **Import Data**: Bulk import existing clients and invoices
4. **Set Up Integrations**: Connect Stripe, QuickBooks, etc.
5. **Monitor Performance**: Track metrics and optimize workflows

## Troubleshooting

### Common Issues

**Authentication Errors**
```python
# Check token validity
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{base_url}/auth/me", headers=headers)
print(response.json())
```

**Rate Limiting**
```python
# Handle rate limits with exponential backoff
import time
import random

def make_request_with_retry(url, headers, data, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 429:  # Rate limited
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            print(f"Rate limited, waiting {wait_time:.1f}s...")
            time.sleep(wait_time)
            continue
        return response
    return response
```

**Validation Errors**
```python
# Check response for validation details
if response.status_code == 422:
    errors = response.json()
    print("Validation errors:")
    for error in errors.get('detail', []):
        print(f"  - {error['loc'][-1]}: {error['msg']}")
```

---

*This example demonstrates the core DueSpark workflow. For more advanced scenarios, see our [Advanced Examples](./index.md) or [API Reference](../api).*
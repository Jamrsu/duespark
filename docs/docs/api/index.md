# API Reference

DueSpark provides a comprehensive REST API that allows you to integrate invoice management and automated reminders into your applications.

## Base URL

```
https://api.duespark.com
```

For development:
```
http://localhost:8000
```

## Authentication

All API requests require authentication using JWT tokens. Include your token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Getting Your API Token

First, register and login to get your authentication token:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Register a new user
curl -X POST https://api.duespark.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_secure_password",
    "full_name": "Your Full Name"
  }'

# Login to get your token
curl -X POST https://api.duespark.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your@email.com",
    "password": "your_secure_password"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Register a new user
const registerResponse = await fetch('https://api.duespark.com/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'your@email.com',
    password: 'your_secure_password',
    full_name: 'Your Full Name'
  })
});

if (!registerResponse.ok) {
  throw new Error('Registration failed');
}

// Login to get your token
const loginResponse = await fetch('https://api.duespark.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'your@email.com',
    password: 'your_secure_password'
  })
});

const loginData = await loginResponse.json();
const token = loginData.access_token;

// Store the token for future requests
localStorage.setItem('duespark_token', token);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
import json

# Register a new user
register_response = requests.post(
    'https://api.duespark.com/auth/register',
    headers={'Content-Type': 'application/json'},
    json={
        'email': 'your@email.com',
        'password': 'your_secure_password',
        'full_name': 'Your Full Name'
    }
)

if not register_response.ok:
    raise Exception('Registration failed')

# Login to get your token
login_response = requests.post(
    'https://api.duespark.com/auth/login',
    headers={'Content-Type': 'application/json'},
    json={
        'username': 'your@email.com',
        'password': 'your_secure_password'
    }
)

login_data = login_response.json()
token = login_data['access_token']

# Store the token for future requests
headers = {'Authorization': f'Bearer {token}'}
```

</TabItem>
</Tabs>

## Rate Limits

API requests are rate limited to ensure fair usage:

- **Free Tier**: 100 requests per hour
- **Pro Tier**: 1,000 requests per hour
- **Enterprise**: 10,000+ requests per hour

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Common Operations

### Creating a Client

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/clients/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "billing@acme.com",
    "phone": "+1-555-123-4567"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const token = localStorage.getItem('duespark_token');

const response = await fetch('https://api.duespark.com/clients/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Acme Corporation',
    email: 'billing@acme.com',
    phone: '+1-555-123-4567'
  })
});

const client = await response.json();
console.log('Created client:', client);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests

response = requests.post(
    'https://api.duespark.com/clients/',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'name': 'Acme Corporation',
        'email': 'billing@acme.com',
        'phone': '+1-555-123-4567'
    }
)

client = response.json()
print(f"Created client: {client}")
```

</TabItem>
</Tabs>

### Creating an Invoice

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/invoices/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CLIENT_ID_FROM_ABOVE",
    "invoice_number": "INV-2024-001",
    "amount": 1500.00,
    "due_date": "2024-12-31",
    "description": "Web development services"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const invoiceResponse = await fetch('https://api.duespark.com/invoices/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    client_id: client.id, // from previous step
    invoice_number: 'INV-2024-001',
    amount: 1500.00,
    due_date: '2024-12-31',
    description: 'Web development services'
  })
});

const invoice = await invoiceResponse.json();
console.log('Created invoice:', invoice);
```

</TabItem>
<TabItem value="python" label="Python">

```python
invoice_response = requests.post(
    'https://api.duespark.com/invoices/',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'client_id': client['id'],  # from previous step
        'invoice_number': 'INV-2024-001',
        'amount': 1500.00,
        'due_date': '2024-12-31',
        'description': 'Web development services'
    }
)

invoice = invoice_response.json()
print(f"Created invoice: {invoice}")
```

</TabItem>
</Tabs>

### Setting Up Automated Reminders

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/reminders/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INVOICE_ID_FROM_ABOVE",
    "days_before_due": 7,
    "template_type": "friendly",
    "enabled": true
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const reminderResponse = await fetch('https://api.duespark.com/reminders/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    invoice_id: invoice.id, // from previous step
    days_before_due: 7,
    template_type: 'friendly',
    enabled: true
  })
});

const reminder = await reminderResponse.json();
console.log('Created reminder:', reminder);
```

</TabItem>
<TabItem value="python" label="Python">

```python
reminder_response = requests.post(
    'https://api.duespark.com/reminders/',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'invoice_id': invoice['id'],  # from previous step
        'days_before_due': 7,
        'template_type': 'friendly',
        'enabled': True
    }
)

reminder = reminder_response.json()
print(f"Created reminder: {reminder}")
```

</TabItem>
</Tabs>

## Error Handling

The API returns standard HTTP status codes and JSON error responses:

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Example error response
curl -X GET https://api.duespark.com/invoices/invalid-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response (404):
# {
#   "detail": "Invoice not found",
#   "error_code": "INVOICE_NOT_FOUND",
#   "timestamp": "2024-01-15T10:30:00Z"
# }
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
try {
  const response = await fetch('https://api.duespark.com/invoices/invalid-id', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.detail} (${error.error_code})`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('Request failed:', error.message);
  // Handle error appropriately
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
try:
    response = requests.get(
        'https://api.duespark.com/invoices/invalid-id',
        headers={'Authorization': f'Bearer {token}'}
    )
    response.raise_for_status()
    data = response.json()
    return data
except requests.exceptions.HTTPError as e:
    error_detail = response.json()
    print(f"API Error: {error_detail['detail']} ({error_detail['error_code']})")
    # Handle error appropriately
except requests.exceptions.RequestException as e:
    print(f"Network error: {e}")
    # Handle network error
```

</TabItem>
</Tabs>

## Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created successfully |
| 400  | Bad request - check your parameters |
| 401  | Unauthorized - invalid or missing token |
| 403  | Forbidden - insufficient permissions |
| 404  | Not found |
| 429  | Rate limit exceeded |
| 500  | Internal server error |

## Pagination

List endpoints support pagination using query parameters:

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl "https://api.duespark.com/invoices/?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '50'
});

const response = await fetch(`https://api.duespark.com/invoices/?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(`Page ${data.page} of ${data.total_pages}`);
console.log(`${data.items.length} items of ${data.total} total`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
params = {
    'page': 1,
    'limit': 50
}

response = requests.get(
    'https://api.duespark.com/invoices/',
    headers={'Authorization': f'Bearer {token}'},
    params=params
)

data = response.json()
print(f"Page {data['page']} of {data['total_pages']}")
print(f"{len(data['items'])} items of {data['total']} total")
```

</TabItem>
</Tabs>

## Webhooks

DueSpark can send webhook notifications for important events:

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Configure a webhook endpoint
curl -X POST https://api.duespark.com/webhooks/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/webhook",
    "events": ["invoice.paid", "reminder.sent", "payment.failed"],
    "secret": "your-webhook-secret"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Configure webhook
const webhookResponse = await fetch('https://api.duespark.com/webhooks/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yourdomain.com/webhook',
    events: ['invoice.paid', 'reminder.sent', 'payment.failed'],
    secret: 'your-webhook-secret'
  })
});

// Handle webhook in your application
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-duespark-signature'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(payload)
    .digest('hex');

  if (signature === `sha256=${expectedSignature}`) {
    console.log('Webhook event:', req.body);
    res.status(200).send('OK');
  } else {
    res.status(401).send('Unauthorized');
  }
});
```

</TabItem>
<TabItem value="python" label="Python">

```python
import hashlib
import hmac

# Configure webhook
webhook_response = requests.post(
    'https://api.duespark.com/webhooks/',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'url': 'https://yourdomain.com/webhook',
        'events': ['invoice.paid', 'reminder.sent', 'payment.failed'],
        'secret': 'your-webhook-secret'
    }
)

# Handle webhook in your Flask application
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('x-duespark-signature')
    payload = request.get_data()

    # Verify webhook signature
    expected_signature = hmac.new(
        b'your-webhook-secret',
        payload,
        hashlib.sha256
    ).hexdigest()

    if signature == f'sha256={expected_signature}':
        data = request.get_json()
        print(f"Webhook event: {data}")
        return 'OK', 200
    else:
        abort(401)
```

</TabItem>
</Tabs>

## Complete API Reference

For detailed information about all available endpoints, request/response schemas, and advanced features, see our auto-generated API documentation:

- [Authentication Endpoints](/api/authentication)
- [Client Management](/api/clients)
- [Invoice Management](/api/invoices)
- [Reminder System](/api/reminders)
- [Analytics & Reports](/api/analytics)
- [Webhook Configuration](/api/webhooks)
- [Subscription Management](/api/subscriptions)

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: [`@duespark/javascript-sdk`](https://www.npmjs.com/package/@duespark/javascript-sdk)
- **Python**: [`duespark-python`](https://pypi.org/project/duespark-python/)

### Community SDKs

- **PHP**: [`duespark/php-sdk`](https://packagist.org/packages/duespark/php-sdk)
- **Ruby**: [`duespark-ruby`](https://rubygems.org/gems/duespark-ruby)
- **Go**: [`github.com/duespark/go-sdk`](https://github.com/duespark/go-sdk)

## Need Help?

- 📚 **Documentation**: [https://docs.duespark.com](https://docs.duespark.com)
- 💬 **Community Forum**: [https://community.duespark.com](https://community.duespark.com)
- 🐛 **Bug Reports**: [https://github.com/duespark/duespark/issues](https://github.com/duespark/duespark/issues)
- 📧 **Support**: [support@duespark.com](mailto:support@duespark.com)
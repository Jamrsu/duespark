# Invoice Management API

Manage invoices through the DueSpark API. This guide covers creating, tracking, updating, and analyzing invoices with automated reminder integration.

## Create Invoice

Create a new invoice for a client with automated reminder setup.

### `POST /invoices/`

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/invoices/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_abc123",
    "invoice_number": "INV-2024-001",
    "amount": 2500.00,
    "currency": "USD",
    "due_date": "2024-02-15",
    "issue_date": "2024-01-15",
    "description": "Web development services - January 2024",
    "line_items": [
      {
        "description": "Frontend Development",
        "quantity": 40,
        "rate": 50.00,
        "amount": 2000.00
      },
      {
        "description": "Backend API Integration",
        "quantity": 10,
        "rate": 50.00,
        "amount": 500.00
      }
    ],
    "payment_terms": 30,
    "notes": "Payment due within 30 days of invoice date",
    "enable_reminders": true
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
class DueSparkInvoice {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.duespark.com';
  }

  async createInvoice(invoiceData) {
    const payload = {
      client_id: invoiceData.clientId,
      invoice_number: invoiceData.invoiceNumber,
      amount: invoiceData.amount,
      currency: invoiceData.currency || 'USD',
      due_date: invoiceData.dueDate,
      issue_date: invoiceData.issueDate || new Date().toISOString().split('T')[0],
      description: invoiceData.description,
      line_items: invoiceData.lineItems || [],
      payment_terms: invoiceData.paymentTerms || 30,
      notes: invoiceData.notes,
      enable_reminders: invoiceData.enableReminders !== false
    };

    const response = await fetch(`${this.baseURL}/invoices/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create invoice: ${error.detail}`);
    }

    return await response.json();
  }

  calculateInvoiceTotal(lineItems) {
    return lineItems.reduce((total, item) => total + item.amount, 0);
  }
}

// Usage
const duespark = new DueSparkInvoice('your_jwt_token');

try {
  const lineItems = [
    {
      description: 'Frontend Development',
      quantity: 40,
      rate: 50.00,
      amount: 2000.00
    },
    {
      description: 'Backend API Integration',
      quantity: 10,
      rate: 50.00,
      amount: 500.00
    }
  ];

  const newInvoice = await duespark.createInvoice({
    clientId: 'client_abc123',
    invoiceNumber: 'INV-2024-001',
    amount: duespark.calculateInvoiceTotal(lineItems),
    dueDate: '2024-02-15',
    description: 'Web development services - January 2024',
    lineItems: lineItems,
    notes: 'Payment due within 30 days of invoice date',
    enableReminders: true
  });

  console.log('Invoice created successfully:', newInvoice);
  console.log(`Invoice ID: ${newInvoice.id}`);
  console.log(`Total Amount: $${newInvoice.amount}`);
} catch (error) {
  console.error('Error creating invoice:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime, date

@dataclass
class LineItem:
    description: str
    quantity: float
    rate: float
    amount: float

@dataclass
class InvoiceData:
    client_id: str
    invoice_number: str
    amount: float
    due_date: str
    description: str
    currency: str = 'USD'
    issue_date: Optional[str] = None
    line_items: Optional[List[LineItem]] = None
    payment_terms: int = 30
    notes: Optional[str] = None
    enable_reminders: bool = True

class DueSparkInvoice:
    def __init__(self, token: str):
        self.token = token
        self.base_url = 'https://api.duespark.com'
        self.headers = {'Authorization': f'Bearer {token}'}

    def create_invoice(self, invoice_data: InvoiceData) -> Dict[str, Any]:
        """Create a new invoice"""
        payload = {
            'client_id': invoice_data.client_id,
            'invoice_number': invoice_data.invoice_number,
            'amount': invoice_data.amount,
            'currency': invoice_data.currency,
            'due_date': invoice_data.due_date,
            'issue_date': invoice_data.issue_date or date.today().isoformat(),
            'description': invoice_data.description,
            'payment_terms': invoice_data.payment_terms,
            'notes': invoice_data.notes,
            'enable_reminders': invoice_data.enable_reminders
        }

        if invoice_data.line_items:
            payload['line_items'] = [
                {
                    'description': item.description,
                    'quantity': item.quantity,
                    'rate': item.rate,
                    'amount': item.amount
                }
                for item in invoice_data.line_items
            ]

        response = requests.post(
            f'{self.base_url}/invoices/',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json=payload
        )

        if not response.ok:
            error_detail = response.json().get('detail', 'Unknown error')
            raise Exception(f'Failed to create invoice: {error_detail}')

        return response.json()

    def calculate_total(self, line_items: List[LineItem]) -> float:
        """Calculate total amount from line items"""
        return sum(item.amount for item in line_items)

# Usage
duespark = DueSparkInvoice('your_jwt_token')

try:
    line_items = [
        LineItem(
            description='Frontend Development',
            quantity=40,
            rate=50.00,
            amount=2000.00
        ),
        LineItem(
            description='Backend API Integration',
            quantity=10,
            rate=50.00,
            amount=500.00
        )
    ]

    invoice_data = InvoiceData(
        client_id='client_abc123',
        invoice_number='INV-2024-001',
        amount=duespark.calculate_total(line_items),
        due_date='2024-02-15',
        description='Web development services - January 2024',
        line_items=line_items,
        notes='Payment due within 30 days of invoice date',
        enable_reminders=True
    )

    new_invoice = duespark.create_invoice(invoice_data)

    print(f"Invoice created successfully: {new_invoice}")
    print(f"Invoice ID: {new_invoice['id']}")
    print(f"Total Amount: ${new_invoice['amount']}")

except Exception as error:
    print(f"Error creating invoice: {error}")
```

</TabItem>
</Tabs>

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | string | Yes | ID of the client for this invoice |
| `invoice_number` | string | Yes | Unique invoice identifier |
| `amount` | number | Yes | Total invoice amount |
| `currency` | string | No | Currency code (default: USD) |
| `due_date` | string | Yes | Payment due date (YYYY-MM-DD) |
| `issue_date` | string | No | Invoice issue date (default: today) |
| `description` | string | Yes | Invoice description |
| `line_items` | array | No | Itemized breakdown |
| `payment_terms` | integer | No | Payment terms in days (default: 30) |
| `notes` | string | No | Additional notes |
| `enable_reminders` | boolean | No | Enable automated reminders (default: true) |

**Response** (201 Created)

```json
{
  "id": "invoice_xyz789",
  "client_id": "client_abc123",
  "invoice_number": "INV-2024-001",
  "amount": 2500.00,
  "currency": "USD",
  "status": "pending",
  "due_date": "2024-02-15",
  "issue_date": "2024-01-15",
  "description": "Web development services - January 2024",
  "line_items": [
    {
      "id": "line_1",
      "description": "Frontend Development",
      "quantity": 40,
      "rate": 50.00,
      "amount": 2000.00
    },
    {
      "id": "line_2",
      "description": "Backend API Integration",
      "quantity": 10,
      "rate": 50.00,
      "amount": 500.00
    }
  ],
  "payment_terms": 30,
  "notes": "Payment due within 30 days of invoice date",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "days_until_due": 31,
  "reminders_enabled": true,
  "client": {
    "id": "client_abc123",
    "name": "Acme Corporation",
    "email": "billing@acme.com"
  }
}
```

## Get Invoice

Retrieve detailed information about a specific invoice.

### `GET /invoices/{invoice_id}`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X GET https://api.duespark.com/invoices/invoice_xyz789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async getInvoice(invoiceId) {
  const response = await fetch(`${this.baseURL}/invoices/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invoice not found');
    }
    const error = await response.json();
    throw new Error(`Failed to get invoice: ${error.detail}`);
  }

  return await response.json();
}

// Usage with status checking
try {
  const invoice = await duespark.getInvoice('invoice_xyz789');

  console.log(`Invoice ${invoice.invoice_number}:`);
  console.log(`- Status: ${invoice.status}`);
  console.log(`- Amount: $${invoice.amount}`);
  console.log(`- Due: ${invoice.due_date}`);
  console.log(`- Days until due: ${invoice.days_until_due}`);

  if (invoice.status === 'overdue') {
    console.warn('⚠️  Invoice is overdue!');
  }

  if (invoice.payment_received) {
    console.log(`✅ Paid on: ${invoice.payment_date}`);
  }
} catch (error) {
  console.error('Error getting invoice:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
    """Get invoice details by ID"""
    response = requests.get(
        f'{self.base_url}/invoices/{invoice_id}',
        headers=self.headers
    )

    if response.status_code == 404:
        raise Exception('Invoice not found')

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to get invoice: {error_detail}')

    return response.json()

# Usage with status checking
try:
    invoice = duespark.get_invoice('invoice_xyz789')

    print(f"Invoice {invoice['invoice_number']}:")
    print(f"- Status: {invoice['status']}")
    print(f"- Amount: ${invoice['amount']}")
    print(f"- Due: {invoice['due_date']}")
    print(f"- Days until due: {invoice['days_until_due']}")

    if invoice['status'] == 'overdue':
        print("⚠️  Invoice is overdue!")

    if invoice.get('payment_received'):
        print(f"✅ Paid on: {invoice['payment_date']}")

except Exception as error:
    print(f"Error getting invoice: {error}")
```

</TabItem>
</Tabs>

## List Invoices

Get a paginated list of invoices with filtering options.

### `GET /invoices/`

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Get all invoices
curl -X GET "https://api.duespark.com/invoices/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by status and date
curl -X GET "https://api.duespark.com/invoices/?status=pending&due_after=2024-01-01&client_id=client_abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async listInvoices(options = {}) {
  const params = new URLSearchParams();

  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.status) params.append('status', options.status);
  if (options.clientId) params.append('client_id', options.clientId);
  if (options.dueAfter) params.append('due_after', options.dueAfter);
  if (options.dueBefore) params.append('due_before', options.dueBefore);
  if (options.minAmount) params.append('min_amount', options.minAmount);
  if (options.maxAmount) params.append('max_amount', options.maxAmount);
  if (options.sortBy) params.append('sort_by', options.sortBy);
  if (options.sortOrder) params.append('sort_order', options.sortOrder);

  const response = await fetch(`${this.baseURL}/invoices/?${params}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list invoices: ${error.detail}`);
  }

  return await response.json();
}

// Usage examples

// Get overdue invoices
try {
  const overdueInvoices = await duespark.listInvoices({
    status: 'overdue',
    sortBy: 'due_date',
    sortOrder: 'asc'
  });

  console.log(`Found ${overdueInvoices.total} overdue invoices:`);
  overdueInvoices.items.forEach(invoice => {
    const daysOverdue = Math.abs(invoice.days_until_due);
    console.log(`- ${invoice.invoice_number}: $${invoice.amount} (${daysOverdue} days overdue)`);
  });
} catch (error) {
  console.error('Error getting overdue invoices:', error.message);
}

// Get high-value invoices for a specific client
try {
  const highValueInvoices = await duespark.listInvoices({
    clientId: 'client_abc123',
    minAmount: 5000,
    status: 'pending'
  });

  const totalOutstanding = highValueInvoices.items.reduce(
    (total, invoice) => total + invoice.amount, 0
  );

  console.log(`High-value invoices: $${totalOutstanding} outstanding`);
} catch (error) {
  console.error('Error getting high-value invoices:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from typing import List, Optional
from enum import Enum

class InvoiceStatus(Enum):
    DRAFT = 'draft'
    PENDING = 'pending'
    PAID = 'paid'
    OVERDUE = 'overdue'
    CANCELLED = 'cancelled'

def list_invoices(
    self,
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    due_after: Optional[str] = None,
    due_before: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> Dict[str, Any]:
    """List invoices with optional filtering"""

    params = {
        'page': page,
        'limit': limit,
        'sort_by': sort_by,
        'sort_order': sort_order
    }

    if status:
        params['status'] = status
    if client_id:
        params['client_id'] = client_id
    if due_after:
        params['due_after'] = due_after
    if due_before:
        params['due_before'] = due_before
    if min_amount:
        params['min_amount'] = min_amount
    if max_amount:
        params['max_amount'] = max_amount

    response = requests.get(
        f'{self.base_url}/invoices/',
        headers=self.headers,
        params=params
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to list invoices: {error_detail}')

    return response.json()

# Usage examples

# Get overdue invoices
try:
    overdue_invoices = duespark.list_invoices(
        status=InvoiceStatus.OVERDUE.value,
        sort_by='due_date',
        sort_order='asc'
    )

    print(f"Found {overdue_invoices['total']} overdue invoices:")
    for invoice in overdue_invoices['items']:
        days_overdue = abs(invoice['days_until_due'])
        print(f"- {invoice['invoice_number']}: ${invoice['amount']} ({days_overdue} days overdue)")

except Exception as error:
    print(f"Error getting overdue invoices: {error}")

# Get high-value invoices for a specific client
try:
    high_value_invoices = duespark.list_invoices(
        client_id='client_abc123',
        min_amount=5000,
        status=InvoiceStatus.PENDING.value
    )

    total_outstanding = sum(invoice['amount'] for invoice in high_value_invoices['items'])
    print(f"High-value invoices: ${total_outstanding} outstanding")

except Exception as error:
    print(f"Error getting high-value invoices: {error}")
```

</TabItem>
</Tabs>

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 50, max: 100) |
| `status` | string | Filter by status (pending, paid, overdue, cancelled) |
| `client_id` | string | Filter by client ID |
| `due_after` | string | Filter invoices due after date (YYYY-MM-DD) |
| `due_before` | string | Filter invoices due before date (YYYY-MM-DD) |
| `min_amount` | number | Minimum invoice amount |
| `max_amount` | number | Maximum invoice amount |
| `sort_by` | string | Sort field (created_at, due_date, amount, status) |
| `sort_order` | string | Sort order (asc, desc) |

## Update Invoice Status

Mark an invoice as paid or update its status.

### `PATCH /invoices/{invoice_id}/status`

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Mark as paid
curl -X PATCH https://api.duespark.com/invoices/invoice_xyz789/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "payment_date": "2024-01-20",
    "payment_method": "bank_transfer",
    "payment_reference": "TXN-12345",
    "notes": "Payment received via bank transfer"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async updateInvoiceStatus(invoiceId, statusUpdate) {
  const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusUpdate)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update invoice status: ${error.detail}`);
  }

  return await response.json();
}

async markAsPaid(invoiceId, paymentDetails = {}) {
  return this.updateInvoiceStatus(invoiceId, {
    status: 'paid',
    payment_date: paymentDetails.paymentDate || new Date().toISOString().split('T')[0],
    payment_method: paymentDetails.paymentMethod,
    payment_reference: paymentDetails.paymentReference,
    notes: paymentDetails.notes
  });
}

// Usage
try {
  const updatedInvoice = await duespark.markAsPaid('invoice_xyz789', {
    paymentDate: '2024-01-20',
    paymentMethod: 'bank_transfer',
    paymentReference: 'TXN-12345',
    notes: 'Payment received via bank transfer'
  });

  console.log('Invoice marked as paid:', updatedInvoice);
  console.log(`Payment received: $${updatedInvoice.amount}`);
} catch (error) {
  console.error('Error updating invoice status:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from datetime import date

def update_invoice_status(
    self,
    invoice_id: str,
    status: str,
    payment_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    payment_reference: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Update invoice status"""
    payload = {'status': status}

    if payment_date:
        payload['payment_date'] = payment_date
    if payment_method:
        payload['payment_method'] = payment_method
    if payment_reference:
        payload['payment_reference'] = payment_reference
    if notes:
        payload['notes'] = notes

    response = requests.patch(
        f'{self.base_url}/invoices/{invoice_id}/status',
        headers={**self.headers, 'Content-Type': 'application/json'},
        json=payload
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to update invoice status: {error_detail}')

    return response.json()

def mark_as_paid(
    self,
    invoice_id: str,
    payment_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    payment_reference: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Mark invoice as paid"""
    return self.update_invoice_status(
        invoice_id=invoice_id,
        status='paid',
        payment_date=payment_date or date.today().isoformat(),
        payment_method=payment_method,
        payment_reference=payment_reference,
        notes=notes
    )

# Usage
try:
    updated_invoice = duespark.mark_as_paid(
        'invoice_xyz789',
        payment_date='2024-01-20',
        payment_method='bank_transfer',
        payment_reference='TXN-12345',
        notes='Payment received via bank transfer'
    )

    print(f"Invoice marked as paid: {updated_invoice}")
    print(f"Payment received: ${updated_invoice['amount']}")

except Exception as error:
    print(f"Error updating invoice status: {error}")
```

</TabItem>
</Tabs>

## Send Invoice

Send an invoice via email to the client.

### `POST /invoices/{invoice_id}/send`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/invoices/invoice_xyz789/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "send_to": ["billing@acme.com", "accounts@acme.com"],
    "subject": "Invoice INV-2024-001 - Web Development Services",
    "message": "Please find attached your invoice for web development services.",
    "include_pdf": true,
    "send_copy_to_self": true
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async sendInvoice(invoiceId, emailOptions = {}) {
  const payload = {
    include_pdf: true,
    send_copy_to_self: false,
    ...emailOptions
  };

  const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send invoice: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const result = await duespark.sendInvoice('invoice_xyz789', {
    send_to: ['billing@acme.com', 'accounts@acme.com'],
    subject: 'Invoice INV-2024-001 - Web Development Services',
    message: 'Please find attached your invoice for web development services.',
    include_pdf: true,
    send_copy_to_self: true
  });

  console.log('Invoice sent successfully:', result);
  console.log(`Email sent to: ${result.recipients.join(', ')}`);
} catch (error) {
  console.error('Error sending invoice:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def send_invoice(
    self,
    invoice_id: str,
    send_to: Optional[List[str]] = None,
    subject: Optional[str] = None,
    message: Optional[str] = None,
    include_pdf: bool = True,
    send_copy_to_self: bool = False
) -> Dict[str, Any]:
    """Send invoice via email"""
    payload = {
        'include_pdf': include_pdf,
        'send_copy_to_self': send_copy_to_self
    }

    if send_to:
        payload['send_to'] = send_to
    if subject:
        payload['subject'] = subject
    if message:
        payload['message'] = message

    response = requests.post(
        f'{self.base_url}/invoices/{invoice_id}/send',
        headers={**self.headers, 'Content-Type': 'application/json'},
        json=payload
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to send invoice: {error_detail}')

    return response.json()

# Usage
try:
    result = duespark.send_invoice(
        'invoice_xyz789',
        send_to=['billing@acme.com', 'accounts@acme.com'],
        subject='Invoice INV-2024-001 - Web Development Services',
        message='Please find attached your invoice for web development services.',
        include_pdf=True,
        send_copy_to_self=True
    )

    print(f"Invoice sent successfully: {result}")
    print(f"Email sent to: {', '.join(result['recipients'])}")

except Exception as error:
    print(f"Error sending invoice: {error}")
```

</TabItem>
</Tabs>

## Generate Invoice PDF

Generate and download a PDF version of the invoice.

### `GET /invoices/{invoice_id}/pdf`

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Download PDF
curl -X GET https://api.duespark.com/invoices/invoice_xyz789/pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "invoice-INV-2024-001.pdf"

# Get PDF with custom branding
curl -X GET "https://api.duespark.com/invoices/invoice_xyz789/pdf?template=branded&logo=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o "invoice-INV-2024-001-branded.pdf"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async downloadInvoicePDF(invoiceId, options = {}) {
  const params = new URLSearchParams();
  if (options.template) params.append('template', options.template);
  if (options.logo !== undefined) params.append('logo', options.logo);

  const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/pdf?${params}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to generate PDF: ${error.detail}`);
  }

  return response.blob();
}

async saveInvoicePDF(invoiceId, filename, options = {}) {
  const blob = await this.downloadInvoicePDF(invoiceId, options);

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Usage
try {
  // Download PDF to user's device
  await duespark.saveInvoicePDF(
    'invoice_xyz789',
    'invoice-INV-2024-001.pdf',
    { template: 'branded', logo: true }
  );

  console.log('PDF downloaded successfully');

  // Or get PDF as blob for further processing
  const pdfBlob = await duespark.downloadInvoicePDF('invoice_xyz789');
  console.log('PDF size:', pdfBlob.size, 'bytes');
} catch (error) {
  console.error('Error generating PDF:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def download_invoice_pdf(
    self,
    invoice_id: str,
    filename: str,
    template: str = 'standard',
    include_logo: bool = True
) -> bool:
    """Download invoice PDF to file"""
    params = {
        'template': template,
        'logo': include_logo
    }

    response = requests.get(
        f'{self.base_url}/invoices/{invoice_id}/pdf',
        headers=self.headers,
        params=params,
        stream=True
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to generate PDF: {error_detail}')

    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    return True

def get_invoice_pdf_bytes(
    self,
    invoice_id: str,
    template: str = 'standard',
    include_logo: bool = True
) -> bytes:
    """Get invoice PDF as bytes"""
    params = {
        'template': template,
        'logo': include_logo
    }

    response = requests.get(
        f'{self.base_url}/invoices/{invoice_id}/pdf',
        headers=self.headers,
        params=params
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to generate PDF: {error_detail}')

    return response.content

# Usage
try:
    # Download PDF to file
    success = duespark.download_invoice_pdf(
        'invoice_xyz789',
        'invoice-INV-2024-001.pdf',
        template='branded',
        include_logo=True
    )

    if success:
        print("PDF downloaded successfully")

    # Get PDF as bytes for email attachment or further processing
    pdf_bytes = duespark.get_invoice_pdf_bytes('invoice_xyz789')
    print(f"PDF size: {len(pdf_bytes)} bytes")

except Exception as error:
    print(f"Error generating PDF: {error}")
```

</TabItem>
</Tabs>

## Invoice Analytics

Get analytics and insights for your invoices.

### `GET /invoices/analytics`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X GET "https://api.duespark.com/invoices/analytics?period=12m&breakdown=monthly" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async getInvoiceAnalytics(period = '12m', breakdown = 'monthly') {
  const params = new URLSearchParams({
    period: period,
    breakdown: breakdown
  });

  const response = await fetch(`${this.baseURL}/invoices/analytics?${params}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get analytics: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const analytics = await duespark.getInvoiceAnalytics('12m', 'monthly');

  console.log('📊 Invoice Analytics Summary:');
  console.log(`- Total Invoiced: $${analytics.total_invoiced}`);
  console.log(`- Total Collected: $${analytics.total_collected}`);
  console.log(`- Outstanding: $${analytics.outstanding_amount}`);
  console.log(`- Collection Rate: ${analytics.collection_rate}%`);
  console.log(`- Average Payment Time: ${analytics.avg_payment_time_days} days`);

  console.log('\n📈 Monthly Breakdown:');
  analytics.breakdown.forEach(month => {
    console.log(`${month.period}: $${month.invoiced} invoiced, $${month.collected} collected`);
  });
} catch (error) {
  console.error('Error getting analytics:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def get_invoice_analytics(
    self,
    period: str = '12m',
    breakdown: str = 'monthly'
) -> Dict[str, Any]:
    """Get invoice analytics"""
    params = {
        'period': period,
        'breakdown': breakdown
    }

    response = requests.get(
        f'{self.base_url}/invoices/analytics',
        headers=self.headers,
        params=params
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to get analytics: {error_detail}')

    return response.json()

# Usage
try:
    analytics = duespark.get_invoice_analytics('12m', 'monthly')

    print("📊 Invoice Analytics Summary:")
    print(f"- Total Invoiced: ${analytics['total_invoiced']}")
    print(f"- Total Collected: ${analytics['total_collected']}")
    print(f"- Outstanding: ${analytics['outstanding_amount']}")
    print(f"- Collection Rate: {analytics['collection_rate']}%")
    print(f"- Average Payment Time: {analytics['avg_payment_time_days']} days")

    print("\n📈 Monthly Breakdown:")
    for month in analytics['breakdown']:
        print(f"{month['period']}: ${month['invoiced']} invoiced, ${month['collected']} collected")

except Exception as error:
    print(f"Error getting analytics: {error}")
```

</TabItem>
</Tabs>

## Batch Operations

### Bulk Status Updates

Update multiple invoice statuses at once.

<Tabs>
<TabItem value="javascript" label="JavaScript">

```javascript
async bulkUpdateInvoices(invoiceIds, statusUpdate) {
  const response = await fetch(`${this.baseURL}/invoices/bulk/update-status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      invoice_ids: invoiceIds,
      ...statusUpdate
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to bulk update invoices: ${error.detail}`);
  }

  return await response.json();
}

// Mark multiple invoices as paid
try {
  const result = await duespark.bulkUpdateInvoices(
    ['invoice_1', 'invoice_2', 'invoice_3'],
    {
      status: 'paid',
      payment_date: '2024-01-20',
      payment_method: 'batch_payment'
    }
  );

  console.log(`Updated ${result.updated_count} invoices`);
} catch (error) {
  console.error('Bulk update failed:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def bulk_update_invoices(
    self,
    invoice_ids: List[str],
    status: str,
    **kwargs
) -> Dict[str, Any]:
    """Bulk update invoice statuses"""
    payload = {
        'invoice_ids': invoice_ids,
        'status': status,
        **kwargs
    }

    response = requests.patch(
        f'{self.base_url}/invoices/bulk/update-status',
        headers={**self.headers, 'Content-Type': 'application/json'},
        json=payload
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to bulk update invoices: {error_detail}')

    return response.json()

# Mark multiple invoices as paid
try:
    result = duespark.bulk_update_invoices(
        ['invoice_1', 'invoice_2', 'invoice_3'],
        status='paid',
        payment_date='2024-01-20',
        payment_method='batch_payment'
    )

    print(f"Updated {result['updated_count']} invoices")
except Exception as error:
    print(f"Bulk update failed: {error}")
```

</TabItem>
</Tabs>

## Error Handling

<Tabs>
<TabItem value="javascript" label="JavaScript">

```javascript
// Comprehensive invoice error handling
class InvoiceError extends Error {
  constructor(message, code, invoiceId = null) {
    super(message);
    this.name = 'InvoiceError';
    this.code = code;
    this.invoiceId = invoiceId;
  }
}

async function handleInvoiceOperation(operation, invoiceId = null) {
  try {
    return await operation();
  } catch (error) {
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      throw new InvoiceError('Invoice not found', 'NOT_FOUND', invoiceId);
    } else if (message.includes('already paid')) {
      throw new InvoiceError('Invoice is already paid', 'ALREADY_PAID', invoiceId);
    } else if (message.includes('cancelled')) {
      throw new InvoiceError('Cannot modify cancelled invoice', 'CANCELLED', invoiceId);
    } else if (message.includes('validation')) {
      throw new InvoiceError('Invalid invoice data', 'VALIDATION_ERROR', invoiceId);
    }

    throw error;
  }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class InvoiceError(Exception):
    def __init__(self, message: str, code: str, invoice_id: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.invoice_id = invoice_id

def handle_invoice_operation(operation, invoice_id: Optional[str] = None):
    """Handle common invoice operation errors"""
    try:
        return operation()
    except Exception as error:
        error_message = str(error).lower()

        if 'not found' in error_message:
            raise InvoiceError('Invoice not found', 'NOT_FOUND', invoice_id)
        elif 'already paid' in error_message:
            raise InvoiceError('Invoice is already paid', 'ALREADY_PAID', invoice_id)
        elif 'cancelled' in error_message:
            raise InvoiceError('Cannot modify cancelled invoice', 'CANCELLED', invoice_id)
        elif 'validation' in error_message:
            raise InvoiceError('Invalid invoice data', 'VALIDATION_ERROR', invoice_id)

        raise error
```

</TabItem>
</Tabs>

## Next Steps

- [Reminder System API](/api/reminders) - Set up automated payment reminders
- [Analytics API](/api/analytics) - Analyze payment patterns and performance
- [Webhook Configuration](/api/webhooks) - Get real-time invoice status updates
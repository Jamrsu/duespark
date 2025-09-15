# Client Management API

Manage your customers and clients through the DueSpark API. This guide covers creating, updating, retrieving, and organizing client information.

## Create Client

Add a new client to your account.

### `POST /clients/`

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/clients/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "billing@acme.com",
    "phone": "+1-555-123-4567",
    "address": {
      "street": "123 Business Ave",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "country": "US"
    },
    "tax_id": "12-3456789",
    "payment_terms": 30,
    "notes": "Important client - priority support"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
class DueSparkClient {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.duespark.com';
  }

  async createClient(clientData) {
    const response = await fetch(`${this.baseURL}/clients/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        tax_id: clientData.taxId,
        payment_terms: clientData.paymentTerms,
        notes: clientData.notes
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create client: ${error.detail}`);
    }

    return await response.json();
  }
}

// Usage
const duespark = new DueSparkClient('your_jwt_token');

try {
  const newClient = await duespark.createClient({
    name: 'Acme Corporation',
    email: 'billing@acme.com',
    phone: '+1-555-123-4567',
    address: {
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      country: 'US'
    },
    taxId: '12-3456789',
    paymentTerms: 30,
    notes: 'Important client - priority support'
  });

  console.log('Client created successfully:', newClient);
} catch (error) {
  console.error('Error creating client:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class Address:
    street: str
    city: str
    state: str
    zip_code: str
    country: str

@dataclass
class ClientData:
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[Address] = None
    tax_id: Optional[str] = None
    payment_terms: int = 30
    notes: Optional[str] = None

class DueSparkClient:
    def __init__(self, token: str):
        self.token = token
        self.base_url = 'https://api.duespark.com'
        self.headers = {'Authorization': f'Bearer {token}'}

    def create_client(self, client_data: ClientData) -> Dict[str, Any]:
        """Create a new client"""
        payload = {
            'name': client_data.name,
            'email': client_data.email,
            'phone': client_data.phone,
            'payment_terms': client_data.payment_terms,
            'notes': client_data.notes
        }

        if client_data.address:
            payload['address'] = {
                'street': client_data.address.street,
                'city': client_data.address.city,
                'state': client_data.address.state,
                'zip_code': client_data.address.zip_code,
                'country': client_data.address.country
            }

        if client_data.tax_id:
            payload['tax_id'] = client_data.tax_id

        response = requests.post(
            f'{self.base_url}/clients/',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json=payload
        )

        if not response.ok:
            error_detail = response.json().get('detail', 'Unknown error')
            raise Exception(f'Failed to create client: {error_detail}')

        return response.json()

# Usage
duespark = DueSparkClient('your_jwt_token')

try:
    client_data = ClientData(
        name='Acme Corporation',
        email='billing@acme.com',
        phone='+1-555-123-4567',
        address=Address(
            street='123 Business Ave',
            city='New York',
            state='NY',
            zip_code='10001',
            country='US'
        ),
        tax_id='12-3456789',
        payment_terms=30,
        notes='Important client - priority support'
    )

    new_client = duespark.create_client(client_data)
    print(f"Client created successfully: {new_client}")

except Exception as error:
    print(f"Error creating client: {error}")
```

</TabItem>
</Tabs>

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Client's business or individual name |
| `email` | string | Yes | Primary contact email |
| `phone` | string | No | Contact phone number |
| `address` | object | No | Client's business address |
| `tax_id` | string | No | Tax identification number |
| `payment_terms` | integer | No | Default payment terms in days (default: 30) |
| `notes` | string | No | Internal notes about the client |

**Response** (201 Created)

```json
{
  "id": "client_abc123",
  "name": "Acme Corporation",
  "email": "billing@acme.com",
  "phone": "+1-555-123-4567",
  "address": {
    "street": "123 Business Ave",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "country": "US"
  },
  "tax_id": "12-3456789",
  "payment_terms": 30,
  "notes": "Important client - priority support",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "total_invoiced": 0.00,
  "total_paid": 0.00,
  "invoice_count": 0,
  "is_active": true
}
```

## Get Client

Retrieve detailed information about a specific client.

### `GET /clients/{client_id}`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X GET https://api.duespark.com/clients/client_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async getClient(clientId) {
  const response = await fetch(`${this.baseURL}/clients/${clientId}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Client not found');
    }
    const error = await response.json();
    throw new Error(`Failed to get client: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const client = await duespark.getClient('client_abc123');
  console.log('Client details:', client);
  console.log(`Total invoiced: $${client.total_invoiced}`);
} catch (error) {
  console.error('Error getting client:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def get_client(self, client_id: str) -> Dict[str, Any]:
    """Get client details by ID"""
    response = requests.get(
        f'{self.base_url}/clients/{client_id}',
        headers=self.headers
    )

    if response.status_code == 404:
        raise Exception('Client not found')

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to get client: {error_detail}')

    return response.json()

# Usage
try:
    client = duespark.get_client('client_abc123')
    print(f"Client details: {client}")
    print(f"Total invoiced: ${client['total_invoiced']}")
except Exception as error:
    print(f"Error getting client: {error}")
```

</TabItem>
</Tabs>

## List Clients

Get a paginated list of all your clients with optional filtering.

### `GET /clients/`

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Get all clients
curl -X GET "https://api.duespark.com/clients/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination and search
curl -X GET "https://api.duespark.com/clients/?page=1&limit=50&search=acme&is_active=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async listClients(options = {}) {
  const params = new URLSearchParams();

  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.search) params.append('search', options.search);
  if (options.isActive !== undefined) params.append('is_active', options.isActive);
  if (options.sortBy) params.append('sort_by', options.sortBy);
  if (options.sortOrder) params.append('sort_order', options.sortOrder);

  const response = await fetch(`${this.baseURL}/clients/?${params}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list clients: ${error.detail}`);
  }

  return await response.json();
}

// Usage examples

// Get all clients
try {
  const allClients = await duespark.listClients();
  console.log(`Found ${allClients.total} clients`);
  allClients.items.forEach(client => {
    console.log(`- ${client.name} (${client.email})`);
  });
} catch (error) {
  console.error('Error listing clients:', error.message);
}

// Search for specific clients
try {
  const searchResults = await duespark.listClients({
    search: 'acme',
    isActive: true,
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  console.log('Search results:', searchResults.items);
} catch (error) {
  console.error('Error searching clients:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
from typing import List, Optional

def list_clients(
    self,
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> Dict[str, Any]:
    """List clients with optional filtering and pagination"""

    params = {
        'page': page,
        'limit': limit,
        'sort_by': sort_by,
        'sort_order': sort_order
    }

    if search:
        params['search'] = search
    if is_active is not None:
        params['is_active'] = is_active

    response = requests.get(
        f'{self.base_url}/clients/',
        headers=self.headers,
        params=params
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to list clients: {error_detail}')

    return response.json()

# Usage examples

# Get all clients
try:
    all_clients = duespark.list_clients()
    print(f"Found {all_clients['total']} clients")

    for client in all_clients['items']:
        print(f"- {client['name']} ({client['email']})")

except Exception as error:
    print(f"Error listing clients: {error}")

# Search for specific clients
try:
    search_results = duespark.list_clients(
        search='acme',
        is_active=True,
        page=1,
        limit=10,
        sort_by='name',
        sort_order='asc'
    )

    print(f"Search results: {len(search_results['items'])} clients found")
    for client in search_results['items']:
        print(f"- {client['name']}: ${client['total_invoiced']} invoiced")

except Exception as error:
    print(f"Error searching clients: {error}")
```

</TabItem>
</Tabs>

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Number of items per page (max 100) |
| `search` | string | - | Search term (matches name and email) |
| `is_active` | boolean | - | Filter by active status |
| `sort_by` | string | created_at | Sort field (name, email, created_at, total_invoiced) |
| `sort_order` | string | desc | Sort order (asc, desc) |

**Response** (200 OK)

```json
{
  "items": [
    {
      "id": "client_abc123",
      "name": "Acme Corporation",
      "email": "billing@acme.com",
      "phone": "+1-555-123-4567",
      "total_invoiced": 15750.00,
      "total_paid": 12500.00,
      "invoice_count": 8,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "last_invoice_date": "2024-01-20T14:30:00Z"
    }
  ],
  "total": 127,
  "page": 1,
  "limit": 50,
  "pages": 3,
  "has_next": true,
  "has_prev": false
}
```

## Update Client

Modify client information.

### `PUT /clients/{client_id}`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X PUT https://api.duespark.com/clients/client_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation LLC",
    "email": "accounting@acme.com",
    "phone": "+1-555-123-9999",
    "payment_terms": 15,
    "notes": "Updated contact info - priority client with expedited terms"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async updateClient(clientId, updates) {
  const response = await fetch(`${this.baseURL}/clients/${clientId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Client not found');
    }
    const error = await response.json();
    throw new Error(`Failed to update client: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const updatedClient = await duespark.updateClient('client_abc123', {
    name: 'Acme Corporation LLC',
    email: 'accounting@acme.com',
    phone: '+1-555-123-9999',
    payment_terms: 15,
    notes: 'Updated contact info - priority client with expedited terms'
  });

  console.log('Client updated successfully:', updatedClient);
} catch (error) {
  console.error('Error updating client:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def update_client(self, client_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update client information"""
    response = requests.put(
        f'{self.base_url}/clients/{client_id}',
        headers={**self.headers, 'Content-Type': 'application/json'},
        json=updates
    )

    if response.status_code == 404:
        raise Exception('Client not found')

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to update client: {error_detail}')

    return response.json()

# Usage
try:
    updated_client = duespark.update_client('client_abc123', {
        'name': 'Acme Corporation LLC',
        'email': 'accounting@acme.com',
        'phone': '+1-555-123-9999',
        'payment_terms': 15,
        'notes': 'Updated contact info - priority client with expedited terms'
    })

    print(f"Client updated successfully: {updated_client}")
except Exception as error:
    print(f"Error updating client: {error}")
```

</TabItem>
</Tabs>

## Deactivate Client

Deactivate a client (soft delete - preserves historical data).

### `DELETE /clients/{client_id}`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X DELETE https://api.duespark.com/clients/client_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async deactivateClient(clientId) {
  const response = await fetch(`${this.baseURL}/clients/${clientId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Client not found');
    }
    const error = await response.json();
    throw new Error(`Failed to deactivate client: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const result = await duespark.deactivateClient('client_abc123');
  console.log('Client deactivated:', result.message);
} catch (error) {
  console.error('Error deactivating client:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def deactivate_client(self, client_id: str) -> Dict[str, Any]:
    """Deactivate a client (soft delete)"""
    response = requests.delete(
        f'{self.base_url}/clients/{client_id}',
        headers=self.headers
    )

    if response.status_code == 404:
        raise Exception('Client not found')

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to deactivate client: {error_detail}')

    return response.json()

# Usage
try:
    result = duespark.deactivate_client('client_abc123')
    print(f"Client deactivated: {result['message']}")
except Exception as error:
    print(f"Error deactivating client: {error}")
```

</TabItem>
</Tabs>

## Client Statistics

Get aggregated statistics for a specific client.

### `GET /clients/{client_id}/stats`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X GET "https://api.duespark.com/clients/client_abc123/stats?period=12m" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async getClientStats(clientId, period = '12m') {
  const params = new URLSearchParams({ period });

  const response = await fetch(`${this.baseURL}/clients/${clientId}/stats?${params}`, {
    headers: {
      'Authorization': `Bearer ${this.token}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get client stats: ${error.detail}`);
  }

  return await response.json();
}

// Usage
try {
  const stats = await duespark.getClientStats('client_abc123', '12m');

  console.log('Client Statistics:');
  console.log(`- Total Revenue: $${stats.total_revenue}`);
  console.log(`- Average Payment Time: ${stats.avg_payment_time_days} days`);
  console.log(`- Payment Success Rate: ${stats.payment_success_rate}%`);
  console.log(`- Outstanding Amount: $${stats.outstanding_amount}`);
} catch (error) {
  console.error('Error getting client stats:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def get_client_stats(self, client_id: str, period: str = '12m') -> Dict[str, Any]:
    """Get client statistics for a specific period"""
    params = {'period': period}

    response = requests.get(
        f'{self.base_url}/clients/{client_id}/stats',
        headers=self.headers,
        params=params
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to get client stats: {error_detail}')

    return response.json()

# Usage
try:
    stats = duespark.get_client_stats('client_abc123', '12m')

    print("Client Statistics:")
    print(f"- Total Revenue: ${stats['total_revenue']}")
    print(f"- Average Payment Time: {stats['avg_payment_time_days']} days")
    print(f"- Payment Success Rate: {stats['payment_success_rate']}%")
    print(f"- Outstanding Amount: ${stats['outstanding_amount']}")

except Exception as error:
    print(f"Error getting client stats: {error}")
```

</TabItem>
</Tabs>

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | 12m | Time period (1m, 3m, 6m, 12m, 24m, all) |

**Response** (200 OK)

```json
{
  "client_id": "client_abc123",
  "period": "12m",
  "total_revenue": 45750.00,
  "total_invoices": 23,
  "paid_invoices": 21,
  "outstanding_invoices": 2,
  "outstanding_amount": 3250.00,
  "avg_invoice_amount": 1989.13,
  "avg_payment_time_days": 18.5,
  "payment_success_rate": 91.3,
  "monthly_breakdown": [
    {
      "month": "2024-01",
      "invoiced": 3500.00,
      "paid": 3500.00,
      "invoice_count": 2
    }
  ]
}
```

## Bulk Operations

### Import Clients

Import multiple clients from CSV or JSON.

<Tabs>
<TabItem value="curl" label="curl">

```bash
# Import from JSON
curl -X POST https://api.duespark.com/clients/bulk/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clients": [
      {
        "name": "Client 1",
        "email": "client1@example.com",
        "phone": "+1-555-111-1111"
      },
      {
        "name": "Client 2",
        "email": "client2@example.com",
        "phone": "+1-555-222-2222"
      }
    ]
  }'

# Import from CSV file
curl -X POST https://api.duespark.com/clients/bulk/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@clients.csv"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
async bulkImportClients(clients) {
  const response = await fetch(`${this.baseURL}/clients/bulk/import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clients })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to import clients: ${error.detail}`);
  }

  return await response.json();
}

async importFromCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${this.baseURL}/clients/bulk/import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.token}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to import CSV: ${error.detail}`);
  }

  return await response.json();
}

// Usage
const clientsToImport = [
  {
    name: 'Client 1',
    email: 'client1@example.com',
    phone: '+1-555-111-1111'
  },
  {
    name: 'Client 2',
    email: 'client2@example.com',
    phone: '+1-555-222-2222'
  }
];

try {
  const result = await duespark.bulkImportClients(clientsToImport);
  console.log(`Successfully imported ${result.created} clients`);

  if (result.errors.length > 0) {
    console.log('Errors occurred:', result.errors);
  }
} catch (error) {
  console.error('Import failed:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def bulk_import_clients(self, clients: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Import multiple clients at once"""
    response = requests.post(
        f'{self.base_url}/clients/bulk/import',
        headers={**self.headers, 'Content-Type': 'application/json'},
        json={'clients': clients}
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to import clients: {error_detail}')

    return response.json()

def import_from_csv(self, file_path: str) -> Dict[str, Any]:
    """Import clients from CSV file"""
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            f'{self.base_url}/clients/bulk/import',
            headers=self.headers,
            files=files
        )

    if not response.ok:
        error_detail = response.json().get('detail', 'Unknown error')
        raise Exception(f'Failed to import CSV: {error_detail}')

    return response.json()

# Usage
clients_to_import = [
    {
        'name': 'Client 1',
        'email': 'client1@example.com',
        'phone': '+1-555-111-1111'
    },
    {
        'name': 'Client 2',
        'email': 'client2@example.com',
        'phone': '+1-555-222-2222'
    }
]

try:
    result = duespark.bulk_import_clients(clients_to_import)
    print(f"Successfully imported {result['created']} clients")

    if result['errors']:
        print(f"Errors occurred: {result['errors']}")

except Exception as error:
    print(f"Import failed: {error}")
```

</TabItem>
</Tabs>

## Error Handling

Common error scenarios and how to handle them:

<Tabs>
<TabItem value="javascript" label="JavaScript">

```javascript
// Comprehensive error handling
async function handleClientOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.message.includes('Client not found')) {
      console.error('The specified client does not exist');
      // Redirect to client list or show appropriate UI
    } else if (error.message.includes('Validation')) {
      console.error('Invalid client data provided');
      // Show form validation errors
    } else if (error.message.includes('Duplicate')) {
      console.error('A client with this email already exists');
      // Suggest updating existing client instead
    } else {
      console.error('Unexpected error:', error.message);
      // Show generic error message
    }
    throw error;
  }
}

// Usage
await handleClientOperation(() => duespark.createClient(clientData));
```

</TabItem>
<TabItem value="python" label="Python">

```python
def handle_client_operation(self, operation):
    """Handle common client operation errors"""
    try:
        return operation()
    except Exception as error:
        error_message = str(error).lower()

        if 'not found' in error_message:
            print("Error: The specified client does not exist")
            # Handle client not found
        elif 'validation' in error_message:
            print("Error: Invalid client data provided")
            # Handle validation errors
        elif 'duplicate' in error_message:
            print("Error: A client with this email already exists")
            # Handle duplicate client
        else:
            print(f"Unexpected error: {error}")
            # Handle unexpected errors

        raise error

# Usage
try:
    result = handle_client_operation(
        lambda: duespark.create_client(client_data)
    )
except Exception as error:
    # Error has been logged, handle UI response
    pass
```

</TabItem>
</Tabs>

## Next Steps

- [Invoice Management API](/api/invoices) - Create invoices for your clients
- [Reminder System API](/api/reminders) - Set up automated payment reminders
- [Analytics API](/api/analytics) - Analyze client payment patterns
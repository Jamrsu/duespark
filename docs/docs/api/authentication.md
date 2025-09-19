# Authentication API

DueSpark uses JWT (JSON Web Token) authentication for API access. This guide covers user registration, login, token management, and security best practices.

## Registration

Create a new user account to start using DueSpark.

### `POST /auth/register`

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "full_name": "John Doe",
    "company_name": "Acme Inc"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const registerUser = async (userData) => {
  const response = await fetch('https://api.duespark.com/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      full_name: userData.fullName,
      company_name: userData.companyName
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  const result = await response.json();
  return result;
};

// Usage
try {
  const newUser = await registerUser({
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    fullName: 'John Doe',
    companyName: 'Acme Inc'
  });

  console.log('Registration successful:', newUser);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from typing import Dict, Any

def register_user(user_data: Dict[str, str]) -> Dict[str, Any]:
    """Register a new user account"""
    response = requests.post(
        'https://api.duespark.com/auth/register',
        headers={'Content-Type': 'application/json'},
        json={
            'email': user_data['email'],
            'password': user_data['password'],
            'full_name': user_data['full_name'],
            'company_name': user_data.get('company_name')
        }
    )

    if not response.ok:
        error_detail = response.json().get('detail', 'Registration failed')
        raise Exception(f"Registration failed: {error_detail}")

    return response.json()

# Usage
try:
    new_user = register_user({
        'email': 'john.doe@example.com',
        'password': 'SecurePassword123!',
        'full_name': 'John Doe',
        'company_name': 'Acme Inc'
    })

    print(f"Registration successful: {new_user}")
except Exception as error:
    print(f"Registration failed: {error}")
```

</TabItem>
</Tabs>

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 8 characters, must contain uppercase, lowercase, number, and special character |
| `full_name` | string | Yes | User's full name |
| `company_name` | string | No | Company or business name |

**Response** (201 Created)

```json
{
  "id": "user_123456",
  "email": "john.doe@example.com",
  "full_name": "John Doe",
  "company_name": "Acme Inc",
  "created_at": "2024-01-15T10:30:00Z",
  "is_verified": false
}
```

## Login

Authenticate and receive an access token for API requests.

### `POST /auth/login`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john.doe@example.com&password=SecurePassword123!"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const loginUser = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch('https://api.duespark.com/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const result = await response.json();

  // Store token securely
  localStorage.setItem('duespark_access_token', result.access_token);
  localStorage.setItem('duespark_refresh_token', result.refresh_token);

  return result;
};

// Usage
try {
  const loginResult = await loginUser('john.doe@example.com', 'SecurePassword123!');
  console.log('Login successful. Token expires in:', loginResult.expires_in, 'seconds');
} catch (error) {
  console.error('Login failed:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from datetime import datetime, timedelta
from typing import Dict, Any

class DueSparkAuthClient:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and store tokens"""
        response = requests.post(
            'https://api.duespark.com/auth/login',
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data={
                'username': email,
                'password': password
            }
        )

        if not response.ok:
            error_detail = response.json().get('detail', 'Login failed')
            raise Exception(f"Login failed: {error_detail}")

        result = response.json()

        # Store tokens
        self.access_token = result['access_token']
        self.refresh_token = result.get('refresh_token')
        self.token_expires_at = datetime.now() + timedelta(seconds=result['expires_in'])

        return result

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers for API requests"""
        if not self.access_token:
            raise Exception("Not authenticated. Please login first.")

        return {'Authorization': f'Bearer {self.access_token}'}

# Usage
auth_client = DueSparkAuthClient()

try:
    login_result = auth_client.login('john.doe@example.com', 'SecurePassword123!')
    print(f"Login successful. Token expires in: {login_result['expires_in']} seconds")

    # Use in API requests
    headers = auth_client.get_auth_headers()
    # Now you can make authenticated requests...

except Exception as error:
    print(f"Login failed: {error}")
```

</TabItem>
</Tabs>

**Request Body** (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**Response** (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "def50200e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user_123456",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "company_name": "Acme Inc"
  }
}
```

## Token Refresh

Refresh your access token using a refresh token to maintain authentication.

### `POST /auth/refresh`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "def50200e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('duespark_refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://api.duespark.com/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    // Refresh token expired, need to login again
    localStorage.removeItem('duespark_access_token');
    localStorage.removeItem('duespark_refresh_token');
    throw new Error('Refresh token expired. Please login again.');
  }

  const result = await response.json();

  // Update stored tokens
  localStorage.setItem('duespark_access_token', result.access_token);
  if (result.refresh_token) {
    localStorage.setItem('duespark_refresh_token', result.refresh_token);
  }

  return result;
};

// Auto-refresh implementation
const makeAuthenticatedRequest = async (url, options = {}) => {
  let token = localStorage.getItem('duespark_access_token');

  const makeRequest = async (token) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };

  let response = await makeRequest(token);

  // If token expired, try to refresh
  if (response.status === 401) {
    try {
      const refreshResult = await refreshToken();
      token = refreshResult.access_token;
      response = await makeRequest(token);
    } catch (error) {
      // Redirect to login page
      window.location.href = '/login';
      return;
    }
  }

  return response;
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class DueSparkAuthClient:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

    def refresh_access_token(self) -> Dict[str, Any]:
        """Refresh the access token using refresh token"""
        if not self.refresh_token:
            raise Exception("No refresh token available")

        response = requests.post(
            'https://api.duespark.com/auth/refresh',
            headers={'Content-Type': 'application/json'},
            json={'refresh_token': self.refresh_token}
        )

        if not response.ok:
            # Refresh token expired, need to login again
            self.access_token = None
            self.refresh_token = None
            self.token_expires_at = None
            raise Exception("Refresh token expired. Please login again.")

        result = response.json()

        # Update tokens
        self.access_token = result['access_token']
        if 'refresh_token' in result:
            self.refresh_token = result['refresh_token']
        self.token_expires_at = datetime.now() + timedelta(seconds=result['expires_in'])

        return result

    def is_token_expired(self) -> bool:
        """Check if current token is expired or about to expire (within 5 minutes)"""
        if not self.token_expires_at:
            return True
        return datetime.now() >= (self.token_expires_at - timedelta(minutes=5))

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers, automatically refreshing token if needed"""
        if not self.access_token:
            raise Exception("Not authenticated. Please login first.")

        # Auto-refresh if token is expired
        if self.is_token_expired():
            try:
                self.refresh_access_token()
                print("Token automatically refreshed")
            except Exception as e:
                raise Exception(f"Failed to refresh token: {e}")

        return {'Authorization': f'Bearer {self.access_token}'}

    def make_authenticated_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make an authenticated request with automatic token refresh"""
        headers = kwargs.get('headers', {})
        headers.update(self.get_auth_headers())
        kwargs['headers'] = headers

        return requests.request(method, url, **kwargs)

# Usage
auth_client = DueSparkAuthClient()
# ... after login ...

try:
    # This will automatically refresh token if needed
    response = auth_client.make_authenticated_request(
        'GET',
        'https://api.duespark.com/invoices/'
    )
    print("Request successful:", response.json())
except Exception as error:
    print(f"Request failed: {error}")
```

</TabItem>
</Tabs>

## Logout

Invalidate the current access token.

### `POST /auth/logout`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const logout = async () => {
  const token = localStorage.getItem('duespark_access_token');

  if (!token) {
    console.log('Already logged out');
    return;
  }

  try {
    const response = await fetch('https://api.duespark.com/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Clear tokens regardless of response status
    localStorage.removeItem('duespark_access_token');
    localStorage.removeItem('duespark_refresh_token');

    if (response.ok) {
      console.log('Logged out successfully');
    }
  } catch (error) {
    // Still clear local tokens even if request fails
    localStorage.removeItem('duespark_access_token');
    localStorage.removeItem('duespark_refresh_token');
    console.log('Logged out locally');
  }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
def logout(self) -> bool:
    """Logout and invalidate current token"""
    if not self.access_token:
        print("Already logged out")
        return True

    try:
        response = requests.post(
            'https://api.duespark.com/auth/logout',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )

        # Clear tokens regardless of response status
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

        if response.ok:
            print("Logged out successfully")
            return True
        else:
            print("Logged out locally (server logout failed)")
            return False

    except Exception as error:
        # Still clear local tokens even if request fails
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        print(f"Logged out locally: {error}")
        return False
```

</TabItem>
</Tabs>

## Password Reset

Request a password reset for a user account.

### `POST /auth/password-reset-request`

<Tabs>
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.duespark.com/auth/password-reset-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
const requestPasswordReset = async (email) => {
  const response = await fetch('https://api.duespark.com/auth/password-reset-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email
    })
  });

  if (response.ok) {
    return { message: 'Password reset email sent' };
  } else {
    const error = await response.json();
    throw new Error(error.detail || 'Password reset request failed');
  }
};

// Usage
try {
  await requestPasswordReset('john.doe@example.com');
  console.log('Password reset email has been sent');
} catch (error) {
  console.error('Failed to request password reset:', error.message);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
def request_password_reset(email: str) -> bool:
    """Request a password reset email"""
    response = requests.post(
        'https://api.duespark.com/auth/password-reset-request',
        headers={'Content-Type': 'application/json'},
        json={'email': email}
    )

    if response.ok:
        print("Password reset email sent")
        return True
    else:
        error_detail = response.json().get('detail', 'Password reset request failed')
        print(f"Failed to request password reset: {error_detail}")
        return False

# Usage
success = request_password_reset('john.doe@example.com')
```

</TabItem>
</Tabs>

## Security Best Practices

### Token Storage

**Browser/JavaScript:**
- Store tokens in `httpOnly` cookies when possible
- Use `localStorage` only if cookies aren't feasible
- Never store tokens in `sessionStorage` for long-term use
- Clear tokens on logout or when they expire

**Mobile Apps:**
- Use secure storage (Keychain on iOS, Keystore on Android)
- Never store tokens in plain text files

**Server-Side:**
- Store tokens in secure session storage
- Use environment variables for service tokens
- Implement token rotation

### Token Validation

Always validate tokens before making requests:

<Tabs>
<TabItem value="javascript" label="JavaScript">

```javascript
const isTokenValid = (token) => {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);

    // Check if token is expired (with 5 minute buffer)
    return payload.exp > (now + 300);
  } catch (error) {
    return false;
  }
};

// Use before making requests
if (!isTokenValid(localStorage.getItem('duespark_access_token'))) {
  await refreshToken();
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import jwt
from datetime import datetime

def is_token_valid(token: str) -> bool:
    """Check if JWT token is valid and not expired"""
    if not token:
        return False

    try:
        # Decode without verification (just to check expiry)
        payload = jwt.decode(token, options={"verify_signature": False})
        exp = payload.get('exp')

        if not exp:
            return False

        # Check if token expires within 5 minutes
        return datetime.fromtimestamp(exp) > datetime.now().timestamp() + 300
    except:
        return False
```

</TabItem>
</Tabs>

### Rate Limiting

Implement proper backoff strategies for rate-limited requests:

<Tabs>
<TabItem value="javascript" label="JavaScript">

```javascript
const makeRequestWithRetry = async (url, options, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    // Other errors - don't retry
    throw new Error(`Request failed: ${response.status}`);
  }

  throw new Error('Max retries exceeded');
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
import time
import requests
from typing import Dict, Any

def make_request_with_retry(
    method: str,
    url: str,
    max_retries: int = 3,
    **kwargs
) -> requests.Response:
    """Make request with exponential backoff retry logic"""

    for attempt in range(1, max_retries + 1):
        response = requests.request(method, url, **kwargs)

        if response.ok:
            return response

        if response.status_code == 429:
            # Rate limited - wait and retry
            retry_after = response.headers.get('Retry-After', 2 ** attempt)
            time.sleep(int(retry_after))
            continue

        # Other errors - don't retry
        response.raise_for_status()

    raise Exception('Max retries exceeded')
```

</TabItem>
</Tabs>

## Error Codes

| Code | Description | Action |
|------|-------------|---------|
| `INVALID_CREDENTIALS` | Email or password incorrect | Check credentials |
| `ACCOUNT_LOCKED` | Too many failed login attempts | Wait or contact support |
| `TOKEN_EXPIRED` | Access token has expired | Use refresh token |
| `TOKEN_INVALID` | Token is malformed or invalid | Re-authenticate |
| `REFRESH_TOKEN_EXPIRED` | Refresh token has expired | Login again |
| `EMAIL_NOT_VERIFIED` | Email verification required | Check email for verification link |
| `WEAK_PASSWORD` | Password doesn't meet requirements | Use stronger password |

## Next Steps

- [Client Management API](/api/clients) - Manage your customers
- [Invoice Management API](/api/invoices) - Create and track invoices
- [Reminder System API](/api/reminders) - Set up automated reminders
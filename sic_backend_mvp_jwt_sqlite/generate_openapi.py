#!/usr/bin/env python3
"""
Generate OpenAPI specification from FastAPI app
"""

import json
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.main import app

    # Generate OpenAPI schema
    openapi_schema = app.openapi()

    # Update the schema with better information
    openapi_schema["info"]["title"] = "DueSpark API"
    openapi_schema["info"]["description"] = """
DueSpark is a comprehensive invoice management platform with automated payment reminders.

## Features

- **User Management**: Registration, authentication, and profile management
- **Client Management**: Organize and track your clients
- **Invoice Management**: Create, track, and manage invoices with multiple statuses
- **Automated Reminders**: Schedule and send payment reminders via email
- **Payment Tracking**: Monitor payment status and history
- **Analytics**: Track performance metrics and payment patterns
- **Integrations**: Connect with Stripe for payment processing
- **Subscription Management**: Handle billing and subscription tiers

## Authentication

DueSpark uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

API requests are rate limited. Check response headers for current limits:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the window resets

## Webhooks

DueSpark supports webhooks for real-time notifications:
- Email delivery events (delivered, opened, clicked, bounced)
- Payment status changes
- Invoice updates

## SDKs and Libraries

- **JavaScript/TypeScript**: Official SDK available
- **Python**: Community SDK available
- **curl**: Examples provided in documentation
"""

    openapi_schema["info"]["version"] = "1.0.0"
    openapi_schema["info"]["contact"] = {
        "name": "DueSpark Support",
        "email": "support@duespark.com",
        "url": "https://duespark.com/support"
    }

    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }

    # Add servers
    openapi_schema["servers"] = [
        {
            "url": "https://api.duespark.com",
            "description": "Production server"
        },
        {
            "url": "https://staging-api.duespark.com",
            "description": "Staging server"
        },
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        }
    ]

    # Enhance security schemes
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}

    openapi_schema["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token obtained from `/auth/login` endpoint"
        }
    }

    # Add security to all endpoints that need it
    for path, methods in openapi_schema["paths"].items():
        for method, details in methods.items():
            if method.lower() in ["get", "post", "put", "patch", "delete"]:
                # Add security to endpoints that likely need auth (skip public endpoints)
                if not any(public in path for public in ["/auth/login", "/auth/register", "/healthz", "/docs", "/openapi"]):
                    if "security" not in details:
                        details["security"] = [{"HTTPBearer": []}]

    # Write to file
    output_file = Path(__file__).parent / "openapi.json"
    with open(output_file, "w") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"✅ OpenAPI schema generated successfully: {output_file}")
    print(f"📊 Total endpoints: {sum(len(methods) for methods in openapi_schema['paths'].values())}")
    print(f"🔒 Security schemes: {len(openapi_schema['components']['securitySchemes'])}")

except ImportError as e:
    print(f"❌ Error importing FastAPI app: {e}")
    print("Make sure you're in the correct directory and all dependencies are installed")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error generating OpenAPI schema: {e}")
    sys.exit(1)
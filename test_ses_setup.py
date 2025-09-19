#!/usr/bin/env python3
"""
SES Setup Validation Script for DueSpark
Run this after configuring your environment variables to test SES functionality.
"""
import os
import sys
from typing import Dict, Any

def validate_environment():
    """Check if all required environment variables are set"""
    required_vars = {
        'EMAIL_PROVIDER': 'ses',
        'AWS_ACCESS_KEY_ID': 'Your AWS access key',
        'AWS_SECRET_ACCESS_KEY': 'Your AWS secret key',
        'AWS_REGION': 'us-east-1',
        'EMAIL_FROM': 'noreply@yourdomain.com'
    }

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"  {var}: {description}")

    if missing:
        print("❌ Missing environment variables:")
        for var in missing:
            print(var)
        return False

    print("✅ All required environment variables are set")
    return True

def test_aws_credentials():
    """Test AWS credentials"""
    try:
        import boto3
        client = boto3.client('sts', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        response = client.get_caller_identity()
        print(f"✅ AWS credentials valid - Account: {response.get('Account')}")
        return True
    except ImportError:
        print("❌ boto3 not installed. Run: pip install boto3")
        return False
    except Exception as e:
        print(f"❌ AWS credentials invalid: {e}")
        return False

def test_ses_permissions():
    """Test SES permissions and quota"""
    try:
        import boto3
        client = boto3.client('sesv2', region_name=os.getenv('AWS_REGION', 'us-east-1'))

        # Test get quota permission
        quota = client.get_account_sending_enabled()
        print(f"✅ SES account sending enabled: {quota.get('Enabled', False)}")

        # Get sending quota
        try:
            quota_info = client.get_send_quota()
            print(f"✅ Daily send quota: {quota_info.get('Max24HourSend', 'Unknown')}")
            print(f"✅ Rate limit: {quota_info.get('MaxSendRate', 'Unknown')} emails/second")
        except:
            print("⚠️  Cannot retrieve quota info (might be using SESv2 API)")

        return True
    except Exception as e:
        print(f"❌ SES permissions test failed: {e}")
        return False

def test_domain_verification():
    """Check if sending domain is verified"""
    try:
        import boto3
        from_email = os.getenv('EMAIL_FROM', '')

        if not from_email:
            print("❌ EMAIL_FROM not set")
            return False

        # Extract domain from email
        domain = from_email.split('@')[-1].strip('>')

        client = boto3.client('sesv2', region_name=os.getenv('AWS_REGION', 'us-east-1'))

        # List verified identities
        response = client.list_email_identities()
        identities = response.get('EmailIdentities', [])

        domain_verified = False
        for identity in identities:
            if identity.get('IdentityName') == domain:
                if identity.get('VerificationStatus') == 'SUCCESS':
                    domain_verified = True
                    print(f"✅ Domain {domain} is verified")
                    break
                else:
                    print(f"⚠️  Domain {domain} verification status: {identity.get('VerificationStatus')}")

        if not domain_verified:
            print(f"❌ Domain {domain} is not verified in SES")
            print("   Go to SES Console → Verified identities to verify your domain")

        return domain_verified

    except Exception as e:
        print(f"❌ Domain verification check failed: {e}")
        return False

def test_email_sending():
    """Test actual email sending"""
    test_email = input("Enter your email address to receive a test email: ").strip()

    if not test_email or '@' not in test_email:
        print("❌ Invalid email address provided")
        return False

    try:
        # Import the SESProvider directly
        sys.path.append(os.path.join(os.path.dirname(__file__), 'sic_backend_mvp_jwt_sqlite'))
        from app.email_provider import SESProvider

        provider = SESProvider(
            region=os.getenv('AWS_REGION', 'us-east-1'),
            from_email=os.getenv('EMAIL_FROM', ''),
        )

        result = provider.send(
            to_email=test_email,
            subject="DueSpark SES Test - Setup Successful!",
            html="""
            <h2>SES Setup Test</h2>
            <p>Congratulations! Your AWS SES integration is working correctly.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
                <li>Provider: AWS SES</li>
                <li>Region: {}</li>
                <li>From: {}</li>
            </ul>
            <p>Your DueSpark application is ready to send production emails!</p>
            """.format(os.getenv('AWS_REGION'), os.getenv('EMAIL_FROM')),
            text="""
DueSpark SES Test - Setup Successful!

Congratulations! Your AWS SES integration is working correctly.

Configuration Details:
- Provider: AWS SES
- Region: {}
- From: {}

Your DueSpark application is ready to send production emails!
            """.format(os.getenv('AWS_REGION'), os.getenv('EMAIL_FROM'))
        )

        print(f"✅ Test email sent successfully!")
        print(f"   Message ID: {result.get('message_id')}")
        print(f"   Check {test_email} for the test email")
        return True

    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return False

def main():
    """Run all validation tests"""
    print("🚀 DueSpark SES Setup Validation")
    print("=" * 40)

    # Generate SECRET_KEY if needed
    print("\n📋 SECRET_KEY Generation:")
    if not os.getenv('SECRET_KEY'):
        print("⚠️  SECRET_KEY not set. Generate one with:")
        print("   python -c \"import secrets; print(secrets.token_urlsafe(50))\"")
    else:
        print("✅ SECRET_KEY is configured")

    print("\n🔍 Environment Validation:")
    env_valid = validate_environment()

    print("\n🔐 AWS Credentials Test:")
    creds_valid = test_aws_credentials()

    print("\n📧 SES Permissions Test:")
    ses_valid = test_ses_permissions()

    print("\n🌐 Domain Verification Test:")
    domain_valid = test_domain_verification()

    print("\n📨 Email Sending Test:")
    if env_valid and creds_valid and ses_valid:
        if not domain_valid:
            print("⚠️  Skipping email test due to domain verification issues")
            print("   Verify your domain in SES Console first")
        else:
            test_email_sending()
    else:
        print("❌ Skipping email test due to configuration issues")

    print("\n" + "=" * 40)
    if env_valid and creds_valid and ses_valid and domain_valid:
        print("🎉 SES Setup Complete! Your DueSpark app is ready for production email.")
    else:
        print("❌ Setup incomplete. Please fix the issues above.")

    print("\n📚 Need help? Check AWS_SES_SETUP_GUIDE.md for detailed instructions.")

if __name__ == "__main__":
    main()
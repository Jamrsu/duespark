#!/usr/bin/env python3
"""
Test script for AWS SES email sending
Run this after setting up your environment variables
"""
import os
import sys

# Add the backend directory to the path
sys.path.append('sic_backend_mvp_jwt_sqlite')

from app.email_provider import get_email_provider

def test_ses_email():
    """Test sending an email via SES"""
    # Check required environment variables
    required_vars = [
        'EMAIL_PROVIDER',
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'EMAIL_FROM'
    ]

    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("\nSet these variables and try again:")
        for var in missing_vars:
            print(f"export {var}=your_value_here")
        return False

    try:
        # Get the email provider
        provider = get_email_provider()
        print(f"✅ Email provider initialized: {type(provider).__name__}")

        # Try sending a test email
        test_email = input("Enter a verified email address to test with: ").strip()
        if not test_email:
            print("❌ No email address provided")
            return False

        print(f"📧 Sending test email to {test_email}...")

        result = provider.send(
            to_email=test_email,
            subject="DueSpark SES Test Email",
            html="""
            <h2>🎉 SES Integration Test</h2>
            <p>Congratulations! Your AWS SES integration is working correctly.</p>
            <p>This email was sent from your DueSpark application using Amazon SES.</p>
            <hr>
            <p><small>Sent from DueSpark Email Service</small></p>
            """,
            text="""
            🎉 SES Integration Test

            Congratulations! Your AWS SES integration is working correctly.

            This email was sent from your DueSpark application using Amazon SES.

            Sent from DueSpark Email Service
            """
        )

        print(f"✅ Email sent successfully!")
        print(f"📮 Message ID: {result.get('message_id', 'N/A')}")
        print(f"🏷️  Provider: {result.get('provider', 'N/A')}")

        return True

    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Verify your AWS credentials are correct")
        print("2. Check that your domain is verified in SES")
        print("3. Ensure the recipient email is verified (sandbox mode)")
        print("4. Check AWS SES console for delivery status")
        return False

if __name__ == "__main__":
    print("🚀 DueSpark SES Email Test")
    print("=" * 50)

    # Show current configuration
    print("Current configuration:")
    print(f"EMAIL_PROVIDER: {os.getenv('EMAIL_PROVIDER', 'not set')}")
    print(f"AWS_REGION: {os.getenv('AWS_REGION', 'not set')}")
    print(f"EMAIL_FROM: {os.getenv('EMAIL_FROM', 'not set')}")
    print(f"AWS_ACCESS_KEY_ID: {'set' if os.getenv('AWS_ACCESS_KEY_ID') else 'not set'}")
    print(f"AWS_SECRET_ACCESS_KEY: {'set' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'not set'}")
    print()

    success = test_ses_email()
    if success:
        print("\n🎉 SES integration test completed successfully!")
        print("Your DueSpark application is ready to send emails via AWS SES.")
    else:
        print("\n❌ SES integration test failed.")
        print("Please check the configuration and try again.")
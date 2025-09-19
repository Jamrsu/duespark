#!/usr/bin/env python3
"""
Test script for AWS SES email functionality
Run this to verify your SES setup is working correctly
"""

import boto3
import os
from botocore.exceptions import ClientError

def test_ses_email():
    """Send a test email through AWS SES"""

    # AWS SES configuration
    AWS_REGION = "eu-north-1"
    SENDER = "noreply@duespark.com"
    RECIPIENT = "your-email@example.com"  # Replace with your email

    # Email content
    SUBJECT = "DueSpark SES Test Email"
    BODY_TEXT = """
    DueSpark SES Test Email

    If you receive this email, your AWS SES configuration is working correctly!

    Test details:
    - Region: eu-north-1
    - Sender: noreply@duespark.com
    - Service: AWS SES

    Best regards,
    DueSpark Team
    """

    BODY_HTML = """
    <html>
    <head></head>
    <body>
      <h2>🎉 DueSpark SES Test Email</h2>
      <p>If you receive this email, your AWS SES configuration is working correctly!</p>

      <h3>Test Details:</h3>
      <ul>
        <li><strong>Region:</strong> eu-north-1</li>
        <li><strong>Sender:</strong> noreply@duespark.com</li>
        <li><strong>Service:</strong> AWS SES</li>
      </ul>

      <p>Best regards,<br>
      <strong>DueSpark Team</strong></p>
    </body>
    </html>
    """

    # Create SES client
    client = boto3.client(
        'ses',
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )

    try:
        response = client.send_email(
            Destination={
                'ToAddresses': [RECIPIENT],
            },
            Message={
                'Body': {
                    'Html': {
                        'Charset': 'UTF-8',
                        'Data': BODY_HTML,
                    },
                    'Text': {
                        'Charset': 'UTF-8',
                        'Data': BODY_TEXT,
                    },
                },
                'Subject': {
                    'Charset': 'UTF-8',
                    'Data': SUBJECT,
                },
            },
            Source=SENDER,
        )

        print(f"✅ Email sent successfully!")
        print(f"Message ID: {response['MessageId']}")
        print(f"📧 Check your inbox at: {RECIPIENT}")

    except ClientError as e:
        print(f"❌ Error sending email:")
        print(f"Error: {e.response['Error']['Message']}")

    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    # Check if required environment variables are set
    if not os.getenv('AWS_ACCESS_KEY_ID'):
        print("❌ AWS_ACCESS_KEY_ID environment variable not set")
        exit(1)

    if not os.getenv('AWS_SECRET_ACCESS_KEY'):
        print("❌ AWS_SECRET_ACCESS_KEY environment variable not set")
        exit(1)

    print("🧪 Testing AWS SES email functionality...")
    test_ses_email()
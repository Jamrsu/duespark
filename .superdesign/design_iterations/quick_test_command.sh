#!/bin/bash
# Quick test command to verify SES is working

# Set your AWS credentials and test
export AWS_ACCESS_KEY_ID="your_access_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_key_here"
export EMAIL_PROVIDER="ses"
export AWS_REGION="eu-north-1"
export EMAIL_FROM="DueSpark <noreply@duespark.com>"

# Run the test script
cd /Users/jamsu/Desktop/duespark/.superdesign/design_iterations
python3 test_ses_email.py
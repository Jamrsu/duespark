#!/bin/bash
# AWS SES Monitoring Commands
# Use these commands to monitor your SES usage and health

echo "📊 SES Account Information"
echo "=========================="

# Check sending quota
echo "📧 Sending Quota:"
aws ses describe-send-quota --region eu-north-1

echo ""
echo "📈 Sending Statistics (last 24h):"
aws ses describe-send-statistics --region eu-north-1

echo ""
echo "🎯 Reputation Metrics:"
aws sesv2 get-reputation --region eu-north-1

echo ""
echo "✅ Verified Identities:"
aws sesv2 list-verified-email-addresses --region eu-north-1

echo ""
echo "📬 Configuration Sets:"
aws sesv2 list-configuration-sets --region eu-north-1

echo ""
echo "⚠️  Suppressed Addresses:"
aws sesv2 list-suppressed-destinations --region eu-north-1

echo ""
echo "📋 Recent Email Events (replace CONFIGURATION_SET):"
echo "aws logs filter-log-events --log-group-name /aws/ses/CONFIGURATION_SET --region eu-north-1 --start-time \$(date -d '1 hour ago' +%s)000"
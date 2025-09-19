# AWS SES Bounce and Complaint Handling Setup

## 1. Configure Notifications (Optional but Recommended)

### In AWS SES Console:
1. Go to **Verified identities**
2. Select your domain (duespark.com)
3. Click **Notifications** tab
4. Set up SNS topics for:
   - **Bounces**: Create topic `ses-bounces`
   - **Complaints**: Create topic `ses-complaints`
   - **Delivery**: Create topic `ses-delivery` (optional)

## 2. Monitor Your Reputation

### Important Metrics to Watch:
- **Bounce Rate**: Keep below 5%
- **Complaint Rate**: Keep below 0.1%
- **Reputation**: Monitor in SES console

### Best Practices:
- Remove bounced emails from your mailing list
- Honor unsubscribe requests immediately
- Only send to engaged users
- Use double opt-in for marketing emails

## 3. Set Up Configuration Set (Recommended)

1. Go to **Configuration sets** in SES
2. Create new configuration set: `duespark-emails`
3. Add event destinations for tracking
4. Update your application to use this configuration set

## 4. Test Email Deliverability

### Use these tools to test:
- **Mail-tester.com**: Check spam score
- **MXToolbox**: Verify DNS and reputation
- **Google Postmaster Tools**: Monitor Gmail delivery
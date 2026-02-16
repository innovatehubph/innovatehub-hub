# Background Jobs

Scheduled Cloud Jobs that run automatically at defined intervals.

## Available Jobs

### tokenRefreshJob
**Schedule:** Daily at 2:00 AM UTC

Iterates through all stored tokens, checks their expiry dates, and refreshes any tokens within 7 days of expiration.

### analyticsSyncJob
**Schedule:** Every 6 hours

Fetches latest analytics data from Facebook Insights API and stores aggregated metrics in the Analytics class.

### webhookCleanupJob
**Schedule:** Weekly (Sunday at 3:00 AM UTC)

Archives webhook logs older than 30 days to reduce database size while maintaining an audit trail.

### campaignStatusJob
**Schedule:** Every hour

Checks active ad campaign statuses via the Facebook Marketing API and updates local campaign records.

## Running Jobs Manually

Jobs can be triggered manually from the Back4App dashboard or via REST API:

```bash
curl -X POST \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-Master-Key: MASTER_KEY" \
  https://parseapi.back4app.com/jobs/tokenRefreshJob
```

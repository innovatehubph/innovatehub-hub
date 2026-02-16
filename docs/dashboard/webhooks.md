# Webhook Logs

Monitor and debug webhook events received from Facebook.

![Webhook Logs](../assets/screenshots/11-nav-webhook-logs.png)

## Event Types

| Event | Description |
|-------|-------------|
| messages | New message received |
| messaging_postbacks | Button click or menu item |
| messaging_referrals | User arrived via referral link |
| feed | Page post comments and reactions |
| leadgen | New lead form submission |

## Log Details

Each webhook event record includes:
- **Event Type** — The Facebook webhook event category
- **Source** — Which page/app triggered the event
- **Status** — processed / pending / failed
- **Payload** — Raw JSON data from Facebook
- **Timestamp** — When the event was received

![Webhook Data Table](../assets/screenshots/34-data-webhook-logs.png)

## Debugging

Click any log entry to expand its full JSON payload. This is useful for debugging webhook configuration issues or understanding the data format.

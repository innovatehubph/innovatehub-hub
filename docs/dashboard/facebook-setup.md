# Facebook Setup

Configure your Facebook Developer app integration with InnovateHub.

![Facebook Setup](../assets/screenshots/38-facebook-setup.png)

## Setup Steps

### 1. Create Facebook App
Go to [Facebook Developers](https://developers.facebook.com) and create a new app with "Business" type.

### 2. Configure Webhook
Set up the webhook URL and verify token:
- **Callback URL:** `https://parseapi.back4app.com/facebook/webhook`
- **Verify Token:** Displayed on the Facebook Setup page

### 3. Subscribe to Events
Enable webhook subscriptions for:
- `messages` — Receive Messenger messages
- `messaging_postbacks` — Button clicks
- `feed` — Page post interactions
- `leadgen` — Lead form submissions

### 4. Generate Page Token
1. Link your Facebook Page to the app
2. Generate a Page Access Token
3. Store it in the Token Store

### 5. Test Connection
Send a test message to your Facebook Page and verify it appears in the Webhook Logs.

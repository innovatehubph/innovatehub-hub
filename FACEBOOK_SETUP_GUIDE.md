# Facebook Developer App Setup Guide -- InnovateHub Business Hub

This guide walks through every step required to create and configure a Facebook Developer App for the InnovateHub Business Hub platform. Follow each section in order.

---

## Table of Contents

1. [Create Facebook Developer Account](#1-create-facebook-developer-account)
2. [Create a New App](#2-create-a-new-app)
3. [Add Products to the App](#3-add-products-to-the-app)
4. [Configure Messenger](#4-configure-messenger)
5. [Configure Webhooks](#5-configure-webhooks)
6. [Subscribe Pages to Webhooks](#6-subscribe-pages-to-webhooks)
7. [Request Permissions (App Review)](#7-request-permissions-app-review)
8. [Store Credentials in Back4App](#8-store-credentials-in-back4app)
9. [Test the Integration](#9-test-the-integration)
10. [Go Live](#10-go-live)
11. [Quick Reference -- API Endpoints](#quick-reference----api-endpoints-used)

---

## 1. Create Facebook Developer Account

1. Open your browser and navigate to **https://developers.facebook.com**.
2. Click **Log In** in the top-right corner.
3. Sign in with the Facebook account that has admin access to both the **PlataPay** and **InnovateHub** Facebook Pages. Using the correct account from the start avoids permission issues later.
4. If you have never registered as a Facebook developer:
   - Click **Get Started**.
   - Accept the Facebook Platform Policy and Developer Terms.
   - Verify your account (phone number or email confirmation may be required).
   - Complete any identity verification prompts that appear.
5. Once registered, you will land on the **Meta for Developers** dashboard. Confirm your name and profile picture appear in the top-right corner -- this confirms you are logged into the correct account.

---

## 2. Create a New App

1. From the developer dashboard, click **Create App** (or navigate to **My Apps > Create App**).
2. Select the app type: **Business**. This type provides access to Messenger, Marketing API, and other business-oriented products.
3. Fill in the app details:
   - **App Name:** `InnovateHub Business Hub`
   - **App Contact Email:** Use your business email (e.g., admin@innovatehub.ph or the email associated with the admin Facebook account).
   - **Business Portfolio:** Select your existing business portfolio. If you do not have one, click **Create a Business Portfolio** and follow the prompts to set one up.
4. Click **Create App**. You may be asked to re-enter your Facebook password.
5. After creation, you will be taken to the App Dashboard. Immediately note and save the following credentials:
   - **App ID** -- displayed at the top of the dashboard
   - **App Secret** -- go to **App Settings > Basic**, then click **Show** next to the App Secret field

**IMPORTANT:** Never commit the App Secret to source control. Store it in a secure location such as a password manager or environment variable.

---

## 3. Add Products to the App

From the App Dashboard, you will see a left sidebar and/or a product catalog. Add each of the following products by clicking **Set Up** or **Add Product** next to them:

| Product | Purpose |
|---------|---------|
| **Messenger** | Chatbot and messaging integration with Facebook Pages |
| **Webhooks** | Receive real-time event notifications (messages, comments, leads) |
| **Facebook Login** | Authenticate users via Facebook OAuth |
| **Marketing API** | Programmatic ad campaign creation and management |
| **Instagram Graph API** | Read and publish Instagram content, manage comments and DMs |
| **Catalog** | Sync e-commerce product listings with Facebook/Instagram Shops |

To add each product:

1. In the left sidebar, click **Add Product** (or scroll down on the dashboard to the product list).
2. Find the product in the list.
3. Click **Set Up**.
4. Repeat for all six products listed above.

After adding all products, your left sidebar should show each product as a menu item.

---

## 4. Configure Messenger

### 4.1 Add Facebook Pages

1. In the left sidebar, click **Messenger > Settings**.
2. Scroll to the **Access Tokens** section.
3. Click **Add or Remove Pages**.
4. A dialog will open asking you to log in and select pages. Select both:
   - **PlataPay**
   - **InnovateHub**
5. Grant all requested permissions when prompted.
6. Click **Done**.

### 4.2 Generate Page Access Tokens

1. Back on the Messenger Settings page, you will see both pages listed under Access Tokens.
2. Click **Generate Token** next to each page.
3. Copy and save each token. These are **short-lived tokens** (valid for about 1-2 hours).

### 4.3 Exchange for Long-Lived Tokens

Short-lived tokens are not suitable for production. Exchange each one for a long-lived token (valid for about 60 days):

```
GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}
```

Replace the placeholders:
- `{app-id}` -- your App ID from Step 2
- `{app-secret}` -- your App Secret from Step 2
- `{short-lived-token}` -- the token you just generated

You can make this request using curl:

```bash
curl -G "https://graph.facebook.com/v21.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

The response will include an `access_token` field -- this is your long-lived token. Save it securely; it will be stored in the Back4App `TokenStore` class (see Step 8).

**Repeat this exchange for each page's token.**

### 4.4 Get a Never-Expiring Page Token (Optional but Recommended)

To get a page access token that never expires, use the long-lived user token to request the page token:

```
GET https://graph.facebook.com/v21.0/me/accounts?access_token={long-lived-user-token}
```

The response includes a `data` array with each page and its access token. These page-level tokens obtained through a long-lived user token do not expire.

---

## 5. Configure Webhooks

### 5.1 Determine Your Callback URL

Your webhook endpoint lives on your Back4App server. To find your server URL:

1. Go to the **Back4App Dashboard**.
2. Navigate to **App Settings > Security & Keys**.
3. Find the **Server URL**. It will look like: `https://pg-app-XXXXXXXXXX.scalabl.cloud`

Your full webhook callback URL will be:

```
https://pg-app-XXXXXXXXXX.scalabl.cloud/facebook/webhook
```

### 5.2 Set Up the Webhook

1. In the Facebook App Dashboard, go to **Webhooks > Settings** (or **Messenger > Settings > Webhooks**).
2. Click **Add Callback URL** (or **Edit Callback URL** if one already exists).
3. Enter the following:
   - **Callback URL:** `https://<your-back4app-server-url>/facebook/webhook`
   - **Verify Token:** `innovatehub_verify_2024`
4. Click **Verify and Save**.

**IMPORTANT:** Before clicking Verify, make sure your Back4App Cloud Code is deployed and includes a GET handler at `/facebook/webhook` that:
- Reads the `hub.mode`, `hub.verify_token`, and `hub.challenge` query parameters.
- Checks that `hub.mode` is `subscribe` and `hub.verify_token` matches `innovatehub_verify_2024`.
- Responds with the `hub.challenge` value as plain text.

If verification fails, check your Cloud Code logs in Back4App Dashboard > Cloud Code > Logs.

### 5.3 Subscribe to Webhook Fields

After the webhook is verified, subscribe to these event fields:

| Field | Description |
|-------|-------------|
| **messages** | Incoming messages sent to your page via Messenger |
| **messaging_postbacks** | Button clicks in structured message templates |
| **messaging_optins** | User opt-in events (e.g., checkbox plugin, send-to-Messenger) |
| **feed** | Page feed activity -- new comments, posts, reactions |
| **leadgen** | Submissions from Facebook Lead Ad forms |

To subscribe:
1. On the Webhooks settings page, find each field in the list.
2. Check the box next to each field listed above.
3. Click **Save**.

---

## 6. Subscribe Pages to Webhooks

Adding webhook subscriptions at the app level is not enough. You must also subscribe each individual page to receive events.

1. Go to **Messenger > Settings > Webhooks** (in the Facebook App Dashboard).
2. Under the webhooks section, you will see your connected pages (PlataPay, InnovateHub).
3. For each page, click **Add Subscriptions** (or **Edit Subscriptions**).
4. Select the following subscriptions:
   - **messages**
   - **messaging_postbacks**
   - **messaging_optins**
5. Click **Save**.

You can also subscribe pages programmatically using the API:

```bash
curl -X POST "https://graph.facebook.com/v21.0/{page-id}/subscribed_apps" \
  -d "subscribed_fields=messages,messaging_postbacks,messaging_optins,feed,leadgen" \
  -d "access_token={page-access-token}"
```

---

## 7. Request Permissions (App Review)

### Development Mode vs. Live Mode

While your app is in **Development Mode**, all features work but only for users who are added as admins, developers, or testers of the app. This is sufficient for initial development and testing.

To make the app work for all users, you must switch to **Live Mode**, which requires passing **App Review** for certain permissions.

### Permissions to Request

Submit the following permissions through the App Review process:

| Permission | Purpose |
|------------|---------|
| `pages_manage_posts` | Publish and manage posts on PlataPay and InnovateHub pages |
| `pages_read_engagement` | Read comments, reactions, and shares on page posts |
| `pages_messaging` | Send and receive messages through Messenger |
| `pages_read_user_content` | Read user-generated posts and comments on your pages |
| `leads_retrieval` | Access data from Lead Ad form submissions |
| `ads_management` | Create, edit, and manage advertising campaigns |
| `catalog_management` | Manage product catalogs for Facebook/Instagram Shops |
| `instagram_basic` | Read Instagram account profile information |
| `instagram_content_publish` | Publish posts and stories to Instagram |
| `instagram_manage_comments` | Read and reply to comments on Instagram posts |
| `instagram_manage_messages` | Handle Instagram Direct Messages |

### How to Submit for App Review

1. In the App Dashboard, go to **App Review > Permissions and Features**.
2. For each permission listed above, click **Request**.
3. For each permission, you must provide:
   - A **detailed description** of how the permission will be used.
   - A **screencast** (screen recording) demonstrating the feature that uses this permission.
   - Any additional information Meta requests (e.g., privacy policy URL, terms of service URL).
4. Make sure your app has a **Privacy Policy URL** and **Terms of Service URL** set under **App Settings > Basic**.
5. Submit the review request.

Review typically takes 1-5 business days. You may receive follow-up questions from Meta's review team.

---

## 8. Store Credentials in Back4App

After completing the Facebook App setup, store the credentials in your Back4App application.

### 8.1 Business Class Records

In the **Business** class in Back4App, update or create records for each business:

**PlataPay record:**
| Field | Value |
|-------|-------|
| `fbAppId` | Your Facebook App ID |
| `fbPageId` | PlataPay's Facebook Page ID |

**InnovateHub record:**
| Field | Value |
|-------|-------|
| `fbAppId` | Your Facebook App ID |
| `fbPageId` | InnovateHub's Facebook Page ID |
| `igAccountId` | InnovateHub's Instagram Business Account ID |

To find a Page ID: Go to the Facebook Page > About > scroll down to find the Page ID, or use the API:
```
GET https://graph.facebook.com/v21.0/me?access_token={page-access-token}
```

To find your Instagram Business Account ID:
```
GET https://graph.facebook.com/v21.0/{page-id}?fields=instagram_business_account&access_token={page-access-token}
```

### 8.2 TokenStore Class Records

In the **TokenStore** class in Back4App, create a record for each page's long-lived (or never-expiring) access token:

| Field | Value |
|-------|-------|
| `businessId` | Pointer to the Business record |
| `platform` | `facebook` |
| `tokenType` | `page_access_token` |
| `accessToken` | The long-lived token value |
| `pageId` | The Facebook Page ID |
| `expiresAt` | Token expiration date (if applicable) |

### 8.3 Environment / Config Variables

Set these environment variables or config values in your Back4App app (via Dashboard > App Settings > Environment Variables, or in your Cloud Code config):

```
FB_APP_ID=<your-app-id>
FB_APP_SECRET=<your-app-secret>
FB_VERIFY_TOKEN=innovatehub_verify_2024
```

**IMPORTANT:** The `FB_APP_SECRET` is sensitive. Never expose it in client-side code, logs, or version control.

---

## 9. Test the Integration

Follow these steps to verify everything is connected correctly.

### 9.1 Test Messenger Webhook

1. Open **Facebook Messenger** (web or mobile).
2. Search for your Facebook Page (e.g., PlataPay).
3. Send a message to the page (e.g., "Hello").
4. Go to the **Back4App Dashboard**.
5. Navigate to the **WebhookLog** class (or whatever class your Cloud Code uses to log incoming events).
6. You should see a new record with the message event data.

### 9.2 Test Sending a Reply

Use curl or your application to send a reply:

```bash
curl -X POST "https://graph.facebook.com/v21.0/me/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"id": "USER_PSID"},
    "message": {"text": "Hello from InnovateHub Business Hub!"}
  }' \
  -d "access_token={page-access-token}"
```

Replace `USER_PSID` with the sender's Page-Scoped ID from the webhook event.

### 9.3 Troubleshooting

If the webhook is not receiving events, check the following:

| Issue | Solution |
|-------|----------|
| Webhook subscription is not active | Go to Webhooks settings and verify the callback URL is verified and fields are subscribed |
| Page is not subscribed to the app | Go to Messenger > Settings > Webhooks and add subscriptions for the page |
| Cloud Code is not deployed | Deploy the latest Cloud Code to Back4App and verify the webhook endpoint exists |
| Verify token mismatch | Ensure the verify token in Cloud Code matches `innovatehub_verify_2024` |
| Callback URL is wrong | Double-check the Back4App server URL in App Settings > Security & Keys |
| SSL/TLS issue | Back4App provides HTTPS by default, but verify the certificate is valid |

Check Cloud Code logs: **Back4App Dashboard > Cloud Code > Logs** for any error messages.

You can also use the **Facebook Graph API Explorer** (https://developers.facebook.com/tools/explorer/) to test API calls interactively.

---

## 10. Go Live

Once development and testing are complete, follow these steps to make the app available to all users.

### 10.1 Pre-Launch Checklist

- [ ] All webhook subscriptions are active and tested
- [ ] Both pages (PlataPay, InnovateHub) are subscribed to the app
- [ ] Long-lived (or never-expiring) tokens are stored in Back4App TokenStore
- [ ] Cloud Code is deployed and handling webhook events correctly
- [ ] Privacy Policy URL is set in App Settings > Basic
- [ ] Terms of Service URL is set in App Settings > Basic
- [ ] App icon and category are configured in App Settings > Basic

### 10.2 Submit for App Review

1. Go to **App Review > Permissions and Features**.
2. For each permission listed in Step 7, provide:
   - A clear, detailed description of how the feature is used.
   - A screen recording (screencast) demonstrating the feature in action. Keep recordings under 2 minutes each, showing the exact user flow.
   - Screenshots if required.
3. Click **Submit for Review**.

### 10.3 Switch to Live Mode

1. After all requested permissions are approved, go to the top of your App Dashboard.
2. Toggle the switch from **Development** to **Live**.
3. Confirm the switch.

Your app is now live. Webhook events will flow for all users (not just testers), and API calls will work at production rate limits.

### 10.4 Post-Launch Monitoring

- Monitor the **WebhookLog** class in Back4App for incoming events.
- Set up alerts for webhook failures (Meta sends notifications to the app contact email if webhooks fail repeatedly).
- Check the **App Dashboard > Webhooks** page periodically for any delivery errors.
- Refresh tokens before they expire (set up a scheduled Cloud Job in Back4App if using 60-day tokens).

---

## Quick Reference -- API Endpoints Used

All endpoints use the base URL: `https://graph.facebook.com/v21.0`

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| Send Message | `/me/messages` | POST | Send a message to a user via Messenger |
| Get User Profile | `/{psid}?fields=first_name,last_name,profile_pic` | GET | Retrieve a Messenger user's profile info |
| Publish Post | `/{page-id}/feed` | POST | Publish a post to a Facebook Page |
| Get Comments | `/{post-id}/comments` | GET | Retrieve comments on a specific post |
| Reply to Comment | `/{comment-id}/comments` | POST | Reply to a specific comment |
| Page Insights | `/{page-id}/insights` | GET | Retrieve analytics for a Facebook Page |
| Get Leads | `/{form-id}/leads` | GET | Retrieve lead data from Lead Ad forms |
| Campaign Insights | `/{campaign-id}/insights` | GET | Retrieve performance data for ad campaigns |
| Sync Product | `/{catalog-id}/products` | POST | Add or update a product in a catalog |
| Debug Token | `/debug_token?input_token={token}` | GET | Check token validity and permissions |
| Exchange Token | `/oauth/access_token?grant_type=fb_exchange_token&...` | GET | Exchange a short-lived token for a long-lived one |

---

## Credential Summary

Keep this information in a secure location (password manager, encrypted notes):

| Credential | Where to Find | Where to Store |
|------------|--------------|----------------|
| App ID | App Dashboard (top of page) | Back4App config (`FB_APP_ID`), Business class (`fbAppId`) |
| App Secret | App Settings > Basic | Back4App config (`FB_APP_SECRET`) -- never in client code |
| Page Access Tokens | Messenger > Settings > Access Tokens | Back4App `TokenStore` class |
| Verify Token | You chose it: `innovatehub_verify_2024` | Back4App config (`FB_VERIFY_TOKEN`), Cloud Code |
| Page IDs | Page About section or Graph API | Back4App `Business` class (`fbPageId`) |
| Instagram Account ID | Graph API (`/{page-id}?fields=instagram_business_account`) | Back4App `Business` class (`igAccountId`) |

---

*Last updated: 2026-02-16*

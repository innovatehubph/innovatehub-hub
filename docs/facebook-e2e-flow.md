# Facebook End-to-End Flow Documentation

## Overview

This document describes the complete end-to-end flow for Facebook Messenger integration with the InnovateHub/PlataPay marketing platform.

## Configured Facebook App

| Setting | Value |
|---------|-------|
| **App ID** | `919355590476197` |
| **App Name** | PlataPay Marketing Hub |
| **Page ID** | `267252936481761` |
| **Page Name** | PlataPay PH |
| **Webhook URL** | `https://webhook.innoserver.cloud/facebook/webhook` |
| **Verify Token** | `innovatehub_verify_2024` |
| **Status** | ✅ Active & Verified |

## End-to-End Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FACEBOOK MESSENGER E2E FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. USER SENDS MESSAGE                                                      │
│     └─► Facebook Messenger App                                              │
│                                                                             │
│  2. FACEBOOK WEBHOOK DELIVERY                                               │
│     └─► POST /facebook/webhook                                              │
│         └─► Webhook server receives event                                   │
│         └─► Logged to WebhookLog class in Parse                            │
│                                                                             │
│  3. BUSINESS LOOKUP                                                         │
│     └─► Query Business class by fbPageId                                    │
│         └─► Get pageAccessToken for API calls                               │
│                                                                             │
│  4. CONTACT MANAGEMENT                                                      │
│     └─► Query/create MessengerContact                                       │
│         └─► Fetch profile from Graph API (name, pic)                       │
│                                                                             │
│  5. CONVERSATION TRACKING                                                   │
│     └─► Query/create Conversation                                           │
│         └─► Update lastMessageAt timestamp                                  │
│                                                                             │
│  6. MESSAGE STORAGE                                                         │
│     └─► Save Message (direction: inbound)                                   │
│                                                                             │
│  7. BOT FLOW PROCESSING                                                     │
│     └─► Check BotFlow triggers                                              │
│         └─► Execute matching flow steps                                     │
│         └─► Lead magnet delivery if applicable                             │
│                                                                             │
│  8. AI RESPONSE GENERATION                                                  │
│     └─► If no bot flow matches, call AI Proxy                              │
│         └─► PlataPay AI persona generates response                          │
│                                                                             │
│  9. SEND API RESPONSE                                                       │
│     └─► POST to Graph API /me/messages                                      │
│         └─► Response delivered to user                                      │
│                                                                             │
│  10. OUTBOUND MESSAGE STORAGE                                               │
│      └─► Save Message (direction: outbound)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Facebook App Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facebook-apps` | GET | List all configured Facebook apps |
| `/api/facebook-apps` | POST | Register new Facebook app |
| `/api/facebook-apps/:id` | GET | Get single app details |
| `/api/facebook-apps/:id` | PUT | Update app configuration |
| `/api/facebook-apps/:id` | DELETE | Remove app |
| `/api/facebook-apps/:id/verify` | POST | Verify Graph API connection |
| `/api/facebook-apps/:id/stats` | GET | Get app statistics |
| `/api/facebook-apps/:id/test-message` | POST | Send test message via app |

### E2E Testing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test/simulate-message` | POST | Simulate full webhook flow (no actual FB send) |
| `/api/test/e2e-flow` | POST | Full E2E test with actual Facebook Send API |

### Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/facebook/webhook` | GET | Webhook verification (challenge/response) |
| `/facebook/webhook` | POST | Receive webhook events from Facebook |

## Parse Classes Used

| Class | Purpose |
|-------|---------|
| `Business` | Store business config (fbPageId, pageAccessToken) |
| `FacebookApp` | Track configured Facebook apps |
| `TokenStore` | Store page access tokens with expiry |
| `MessengerContact` | Facebook user profiles (PSID, name, etc.) |
| `Conversation` | Track conversation threads |
| `Message` | Store all messages (inbound/outbound) |
| `WebhookLog` | Raw webhook event logging |
| `BotFlow` | Automated response flows |
| `Lead` | Lead form submissions |

## Dashboard Pages

### Facebook Apps Page (`/facebook-apps`)
- View all configured Facebook apps
- Status indicators (active/error/pending)
- Statistics dashboard (contacts, conversations, messages, leads)
- Configuration details with copy buttons
- E2E flow testing interface
- Quick links to Facebook Developer portal

### Facebook Setup Page (`/facebook-setup`)
- Step-by-step setup wizard
- Webhook URL and verify token display
- Permission checklist
- Credential storage

## Testing the Flow

### 1. Simulate Webhook (No FB Send)
```bash
curl -X POST https://webhook.innoserver.cloud/api/test/simulate-message \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "267252936481761",
    "senderPsid": "TEST_USER_001",
    "message": "How do I become a PlataPay agent?"
  }'
```

### 2. Full E2E Test (Actual FB Send)
```bash
curl -X POST https://webhook.innoserver.cloud/api/test/e2e-flow \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "267252936481761",
    "recipientPsid": "REAL_USER_PSID",
    "testMessage": "Hello from E2E test!"
  }'
```

### 3. Verify App Connection
```bash
curl -X POST https://webhook.innoserver.cloud/api/facebook-apps/pmHOO46YdK/verify
```

### 4. Get App Statistics
```bash
curl https://webhook.innoserver.cloud/api/facebook-apps/pmHOO46YdK/stats
```

## Environment Configuration

All configuration is stored in Parse (Back4App), not environment variables:

- **Business.pageAccessToken** — Page access token for Graph API
- **Business.fbPageId** — Facebook Page ID
- **TokenStore** — Additional token storage with expiry tracking
- **FacebookApp** — App-level configuration

## Security

- Webhook verify token protects against unauthorized webhook calls
- Page access tokens are stored securely in Parse
- AI API secret protects internal proxy calls
- HTTPS required for all external endpoints

## Troubleshooting

### Webhook not receiving events
1. Check webhook URL in Facebook Developer Console
2. Verify token matches `innovatehub_verify_2024`
3. Check PM2 logs: `pm2 logs 7`
4. Test verification: `curl "https://webhook.innoserver.cloud/facebook/webhook?hub.verify_token=innovatehub_verify_2024&hub.mode=subscribe&hub.challenge=test"`

### Messages not sending
1. Verify app connection: `POST /api/facebook-apps/:id/verify`
2. Check token expiry in TokenStore
3. Verify page permissions in Facebook Developer Console
4. Check PM2 error logs for Graph API errors

### AI responses not working
1. Check AI proxy status: `pm2 status 2`
2. Verify AI_PROXY_URL is accessible: `curl http://127.0.0.1:3456/health`
3. Check API secret configuration

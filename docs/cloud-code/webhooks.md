# Webhook Handlers

Express middleware that handles incoming webhook events from Facebook.

## Webhook Endpoint

```
POST https://parseapi.back4app.com/facebook/webhook
```

## Verification

Facebook requires webhook verification via GET request:

```
GET /facebook/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

The server verifies the token matches and returns the challenge.

## Event Processing

### Message Events
```json
{
  "object": "page",
  "entry": [{
    "messaging": [{
      "sender": { "id": "USER_ID" },
      "message": { "text": "Hello" }
    }]
  }]
}
```

Processing steps:

1. Extract sender ID and message content
2. Find or create Conversation record
3. Create Message record
4. Trigger any matching Bot Flow
5. Log the webhook event

### Lead Events
```json
{
  "object": "page",
  "entry": [{
    "changes": [{
      "field": "leadgen",
      "value": { "leadgen_id": "LEAD_ID" }
    }]
  }]
}
```

Processing steps:

1. Fetch lead data from Graph API using leadgen_id
2. Extract form fields (name, email, phone)
3. Create FbLead record
4. Associate with business

### Postback Events
Handled similarly to messages but include a `postback.payload` field used for bot flow routing.

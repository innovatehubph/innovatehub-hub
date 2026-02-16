# Triggers

Cloud Code triggers that run automatically when data is created, updated, or deleted.

## Before Save Triggers

### Message (beforeSave)
- Validates message content is not empty
- Sets `processedAt` timestamp
- Associates with correct business via conversation

### FbLead (beforeSave)
- Validates required fields (name, email)
- Normalizes phone numbers
- Checks for duplicate leads

### Product (beforeSave)
- Validates price is positive
- Generates slug from product name
- Sets default status to "active"

## After Save Triggers

### WebhookLog (afterSave)
- Processes the webhook event based on type
- Routes to appropriate handler (message, lead, postback)
- Updates conversation records

### Conversation (afterSave)
- Updates the `lastMessageAt` timestamp
- Increments message count
- Updates unread status

## Before Delete Triggers

### Business (beforeDelete)
- Checks for associated data
- Warns if business has active campaigns
- Cascades deletion to related tokens

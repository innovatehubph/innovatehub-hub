# Cloud Functions

Back4App Cloud Functions provide server-side business logic accessible via the Parse SDK or REST API.

## Available Functions

### Business Operations
| Function | Description |
|----------|-------------|
| `getBusinessStats` | Returns aggregated statistics for a business |
| `syncBusinessData` | Syncs data from Facebook Graph API |
| `getBusinessConfig` | Returns configuration for a business |

### Messenger
| Function | Description |
|----------|-------------|
| `sendMessage` | Send a message via Facebook Messenger |
| `getConversation` | Retrieve conversation history |
| `markAsRead` | Mark a conversation as read |

### Products & Orders
| Function | Description |
|----------|-------------|
| `syncProducts` | Sync product catalog from Facebook |
| `updateProductStatus` | Change product availability |
| `processOrder` | Handle incoming order events |

### Leads
| Function | Description |
|----------|-------------|
| `processLead` | Process a Facebook Lead form submission |
| `exportLeads` | Export leads as CSV |

### Tokens
| Function | Description |
|----------|-------------|
| `refreshToken` | Refresh an expiring Facebook access token |
| `validateToken` | Check if a token is still valid |

## Usage Example

```javascript
// From the React dashboard
const result = await Parse.Cloud.run('getBusinessStats', {
  businessId: 'GTHxktOij6'
});
```

```bash
# Via REST API
curl -X POST \
  -H "X-Parse-Application-Id: APP_ID" \
  -H "X-Parse-REST-API-Key: REST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessId": "GTHxktOij6"}' \
  https://parseapi.back4app.com/functions/getBusinessStats
```

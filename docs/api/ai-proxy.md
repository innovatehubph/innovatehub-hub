# AI Proxy API

The AI Proxy server runs on port 3456 and handles Claude AI interactions and the code deployment pipeline.

## Endpoints

### Health Check
```
GET /health
```
Returns `{ status: "ok" }`

### Chat
```
POST /chat
Content-Type: application/json

{
  "message": "How do I add a new page?",
  "history": []
}
```
General-purpose chat with Claude AI about the dashboard codebase.

### Generate Code
```
POST /agent/generate
Content-Type: application/json

{
  "prompt": "Create a CRM Contacts page with a data table",
  "type": "page"
}
```

**Response:**
```json
{
  "plan": "Create CRM page with useParseQuery, DataTable, and StatCards...",
  "files": [
    { "path": "src/pages/CRMContacts.tsx", "content": "...", "action": "create" }
  ],
  "route": { "path": "crm-contacts", "element": "CRMContacts" },
  "navItem": { "label": "CRM Contacts", "icon": "Users", "path": "/crm-contacts" },
  "schema": { "className": "CRMContact", "fields": { "name": "String", "email": "String" } }
}
```

### Stage Code
```
POST /agent/apply
Content-Type: application/json

{
  "files": [...],
  "route": {...},
  "navItem": {...},
  "schema": {...}
}
```
Writes files to a staging branch, runs build, reports success/failure.

### QA Review
```
POST /agent/qa
Content-Type: application/json

{
  "files": [...],
  "plan": "..."
}
```

**Response:**
```json
{
  "score": 85,
  "issues": ["Missing loading state on form submit"],
  "suggestions": ["Add aria-labels to icon buttons"],
  "approved": true
}
```

### Deploy to Production
```
POST /agent/promote
```
Merges staging branch, rebuilds, and deploys to Back4App.

### Rollback
```
POST /agent/rollback
```
Discards the current staging branch.

### Source Tree
```
GET /agent/source
```
Returns the full dashboard source tree as JSON.

### Status
```
GET /agent/status
```
Returns current system status including staging state.

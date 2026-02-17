# InnovateHub Marketing Automation API

**Base URL:** `https://webhook.innoserver.cloud`  
**Version:** 2.0.0  
**Last Updated:** February 17, 2026

## Authentication

Most endpoints are internal and don't require authentication. For production, add API key middleware.

---

## Endpoints

### Health & Status

#### GET /health
Check server status.

**Response:**
```json
{
  "status": "ok",
  "service": "innovatehub-webhook-server",
  "uptime": 3600
}
```

---

### Leads

#### GET /api/leads/by-score
Get leads filtered by score tier.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| tier | string | - | Filter by tier: `hot`, `warm`, `cold` |
| minScore | number | - | Minimum lead score |
| limit | number | 50 | Max results |

**Response:**
```json
{
  "leads": [...],
  "count": 10,
  "summary": { "hot": 5, "warm": 10, "cold": 25 }
}
```

#### POST /api/leads/:id/recalculate-score
Recalculate lead score based on current data.

**Response:**
```json
{
  "success": true,
  "leadId": "abc123",
  "score": 65,
  "tier": "hot",
  "isHot": true,
  "reasons": ["Email provided (+15)", "Agent intent keywords (+20)"]
}
```

---

### Pipeline

#### POST /api/update-pipeline-stage
Move a lead to a new pipeline stage.

**Request Body:**
```json
{
  "leadId": "abc123",
  "newStage": "screening",
  "notes": "Passed initial screening"
}
```

**Valid Stages:** `inquiry`, `application`, `screening`, `training`, `onboarded`, `rejected`

**Response:**
```json
{
  "success": true,
  "leadId": "abc123",
  "oldStage": "inquiry",
  "newStage": "screening",
  "postOnboardingEnrolled": false
}
```

---

### Email

#### GET /api/email-templates
List all available email templates.

**Response:**
```json
{
  "templates": {
    "welcome_agent": { "name": "Welcome Agent", "description": "..." },
    "franchise_inquiry": { "name": "Franchise Inquiry", "description": "..." }
  },
  "count": 16
}
```

#### POST /api/send-email
Send a single email.

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "welcome_agent",
  "subject": "Welcome!",
  "data": { "name": "John" }
}
```

#### POST /api/send-bulk-email
Send emails to multiple recipients (max 500).

**Request Body:**
```json
{
  "recipients": [
    { "email": "a@example.com", "name": "Alice" },
    { "email": "b@example.com", "name": "Bob" }
  ],
  "template": "newsletter",
  "subject": "Monthly Update",
  "delayMs": 1000
}
```

#### POST /api/send-test-email
Send a test email (adds [TEST] prefix to subject).

#### POST /api/schedule-email
Schedule an email for future delivery.

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "welcome_agent",
  "sendAt": "2026-02-20T10:00:00Z",
  "subject": "Welcome!",
  "data": { "name": "John" }
}
```

#### GET /api/scheduled-emails
List pending scheduled emails.

#### DELETE /api/scheduled-emails/:id
Cancel a scheduled email.

---

### Webinar

#### POST /api/webinar/register
Register for a webinar and send confirmation.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "webinarDate": "February 20, 2026",
  "webinarTime": "2:00 PM",
  "meetingLink": "https://zoom.us/j/123456",
  "meetingId": "123456",
  "passcode": "abc123"
}
```

---

### Nurture Sequences

#### POST /api/enroll-in-nurture
Enroll a lead in a nurture sequence.

**Request Body:**
```json
{
  "businessId": "GTHxktOij6",
  "leadId": "abc123",
  "sequenceId": "xyz789"
}
```

#### POST /api/enroll-post-onboarding/:leadId
Manually enroll a lead in post-onboarding nurture.

---

### Bot Flows & A/B Testing

#### GET /api/ab-tests
List all A/B tests with conversion data.

**Response:**
```json
{
  "tests": [
    {
      "id": "test123",
      "flowId": "flow456",
      "stepIndex": 0,
      "variants": [
        { "id": "v0", "impressions": 100, "conversions": 15, "conversionRate": "15.0%" },
        { "id": "v1", "impressions": 98, "conversions": 22, "conversionRate": "22.4%" }
      ],
      "winner": "v1"
    }
  ],
  "count": 1
}
```

#### POST /api/flows/:flowId/ab-test
Create A/B test variants for a flow step.

**Request Body:**
```json
{
  "stepIndex": 0,
  "variants": [
    { "content": "Welcome! How can we help?" },
    { "content": "Hi there! What brings you to PlataPay?" }
  ]
}
```

#### POST /api/ab-tests/:testId/convert
Track a conversion for an A/B test variant.

---

### SLA & Operations

#### GET /api/sla-report
Get SLA compliance metrics.

**Response:**
```json
{
  "pendingConversations": 5,
  "slaCompliance": "92%",
  "withinSLA": 46,
  "outsideSLA": 4,
  "escalatedLast24h": 1,
  "period": "7 days"
}
```

#### POST /api/check-sla
Manually trigger SLA compliance check.

#### POST /api/send-daily-digest
Manually trigger admin daily digest email.

#### POST /api/trigger-reengagement
Manually trigger re-engagement for dormant contacts.

---

### Duplicate Management

#### GET /api/duplicates/:businessId
Find duplicate contacts by phone/email.

**Response:**
```json
{
  "totalContacts": 500,
  "duplicates": [
    { "type": "phone", "value": "+639171234567", "contacts": ["id1", "id2"] }
  ],
  "duplicateCount": 3
}
```

#### POST /api/merge-contacts
Merge two duplicate contacts.

**Request Body:**
```json
{
  "primaryContactId": "keep-this-one",
  "secondaryContactId": "merge-into-primary"
}
```

#### POST /api/auto-merge-duplicates/:businessId
Automatically merge all duplicates for a business.

---

### Analytics & Referrals

#### GET /api/analytics/referrals
Get referral source analytics.

**Response:**
```json
{
  "totalReferrals": 150,
  "sources": [
    { "source": "AGENT", "count": 80, "contacts": [...] },
    { "source": "WEBINAR", "count": 45, "contacts": [...] }
  ],
  "topSource": { "source": "AGENT", "count": 80 }
}
```

---

### Competitive Intelligence

#### POST /api/competitors
Add a competitor for monitoring.

**Request Body:**
```json
{
  "name": "GCash",
  "facebookPageId": "123456",
  "facebookPageName": "GCash",
  "website": "https://gcash.com",
  "keywords": ["e-wallet", "send money"],
  "industry": "fintech"
}
```

#### GET /api/competitors
List all monitored competitors.

#### POST /api/competitor-ads
Add a competitor ad for analysis.

**Request Body:**
```json
{
  "competitorId": "abc123",
  "platform": "facebook",
  "adType": "image",
  "headline": "Send Money Free!",
  "bodyText": "Zero fees when you...",
  "ctaText": "Learn More",
  "landingUrl": "https://gcash.com/promo"
}
```

#### GET /api/competitor-ads
List competitor ads with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| competitorId | string | Filter by competitor |
| platform | string | Filter by platform |
| limit | number | Max results (default 50) |

#### POST /api/competitor-ads/:id/analyze
Run AI analysis on a competitor ad.

**Response:**
```json
{
  "success": true,
  "adId": "abc123",
  "analysis": {
    "targetAudience": "Young professionals",
    "keyMessages": ["Free transfers", "Easy to use"],
    "emotionalAppeals": ["Convenience", "Trust"],
    "uniqueSellingPoints": ["Zero fees", "Instant transfer"],
    "callToActionStrength": "strong",
    "estimatedObjective": "conversion",
    "competitiveThreats": ["Price competition"],
    "opportunities": ["Highlight local support"],
    "recommendedCounterStrategy": "Emphasize agent network advantage"
  }
}
```

#### GET /api/competitive-report
Generate comprehensive competitive intelligence report.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Analysis period |

---

### Predictive Analytics

#### GET /api/analytics/historical
Get historical performance data.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| metric | string | leads | `leads`, `emails`, `conversations`, `messages` |
| days | number | 30 | Days to analyze |

**Response:**
```json
{
  "metric": "leads",
  "period": "30 days",
  "data": [
    { "date": "2026-01-18", "value": 12 },
    { "date": "2026-01-19", "value": 15 }
  ],
  "statistics": {
    "total": 350,
    "average": 11.67,
    "max": 25,
    "min": 3,
    "trend": "increasing",
    "trendSlope": 0.42
  }
}
```

#### GET /api/analytics/fatigue-detection
Detect creative/message fatigue.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 14 | Analysis period |

**Response:**
```json
{
  "period": "14 days",
  "fatigueIndicators": [
    {
      "type": "bot_flow",
      "id": "flow123",
      "name": "Agent Welcome",
      "firstHalfEngagement": 150,
      "secondHalfEngagement": 95,
      "changePercent": -37,
      "severity": "medium",
      "recommendation": "Consider refreshing bot flow messages"
    }
  ],
  "summary": { "totalIndicators": 1, "highSeverity": 0, "mediumSeverity": 1 },
  "generalRecommendations": [...]
}
```

#### GET /api/analytics/forecast
Get performance predictions.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| metric | string | leads | `leads` or `emails` |
| forecastDays | number | 7 | Days to forecast |

**Response:**
```json
{
  "metric": "leads",
  "historicalDays": 30,
  "forecastDays": 7,
  "historical": {
    "average": 12.5,
    "trend": "increasing",
    "trendPercent": 15,
    "standardDeviation": 4.2
  },
  "forecast": [
    { "date": "2026-02-18", "predicted": 14, "confidence": "medium" },
    { "date": "2026-02-19", "predicted": 15, "confidence": "medium" }
  ],
  "totalForecast": 95,
  "methodology": "Moving average with trend adjustment and day-of-week seasonality"
}
```

#### GET /api/analytics/budget-optimization
Get budget optimization recommendations.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Analysis period |

**Response:**
```json
{
  "period": "30 days",
  "totalLeadsAnalyzed": 250,
  "sourcePerformance": [
    {
      "source": "form_agent_recruitment",
      "totalLeads": 120,
      "hotLeads": 45,
      "converted": 18,
      "avgScore": 52,
      "hotLeadRate": 37.5,
      "conversionRate": 15.0,
      "efficiencyScore": 34.5
    }
  ],
  "recommendations": [
    {
      "type": "scaling",
      "priority": "high",
      "action": "Increase budget for form_agent_recruitment",
      "reason": "High conversion (15%) but could scale more",
      "potentialImpact": "Scaling could significantly increase qualified leads"
    }
  ],
  "summary": { "topPerformer": "form_agent_recruitment", "totalRecommendations": 2 }
}
```

---

### Webhooks

#### GET /facebook/webhook
Facebook webhook verification.

#### POST /facebook/webhook
Receive Facebook webhook events (messaging, leadgen, feed).

---

### Static Pages

| Endpoint | Description |
|----------|-------------|
| GET /demo | Live demo page for Facebook App Review |
| GET /privacy-policy | Privacy policy page |
| GET /terms | Terms of service |
| GET /data-deletion | Data deletion instructions |
| GET /data-deletion/status | Deletion status check |
| GET /email/unsubscribe | Email unsubscribe handler |

---

## Error Responses

All errors return:
```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `403` - Forbidden (webhook verification failed)
- `500` - Internal Server Error

---

## Rate Limits

- Email sending: 1 second delay between bulk emails
- Bulk email max: 500 recipients per request
- General: No hard limits (self-hosted)

---

## Webhook Events Handled

| Event Type | Description |
|------------|-------------|
| `messaging` | Messenger messages, postbacks |
| `leadgen` | Facebook Lead Ads submissions |
| `feed` | Page post comments |
| `referral` | m.me link referrals |

---

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digest | 8 AM Manila | Admin summary email |
| Re-engagement | 10 AM Manila | Dormant contact outreach |
| SLA Check | Every 30 min | Conversation SLA compliance |
| Scheduled Actions | Every 1 min | Process due emails/messages |
| Nurture Sequences | Every 1 hour | Process nurture steps |

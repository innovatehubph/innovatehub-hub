# Lead Management System

## Overview

InnovateHub Hub includes a complete lead management system that:
- Captures leads from Facebook Lead Ads automatically
- Scores leads based on engagement and profile
- Manages leads through a 6-stage pipeline
- Automates email nurturing sequences
- Tracks conversions to PlataPay agents

---

## Lead Sources

### 1. Facebook Lead Ads (Automatic)
Leads from Facebook Lead Ads are automatically captured via webhook:
```
POST /facebook/webhook
```

**Captured Data:**
- Full name, email, phone
- Ad ID, Form ID, Page ID
- Custom form fields
- Lead score (calculated)

### 2. Manual Entry (API)
```bash
POST /api/leads
{
  "email": "lead@example.com",
  "fullName": "Juan Dela Cruz",
  "phone": "+639171234567",
  "source": "website",
  "interestType": "agent"
}
```

---

## Pipeline Stages

| Stage | Description | Auto-Email |
|-------|-------------|------------|
| `inquiry` | New lead, initial interest | Welcome email |
| `application` | Submitted application form | Franchise info |
| `screening` | Under review | Review notification |
| `training` | Accepted, in training | Training materials |
| `onboarded` | Active agent | Welcome + next steps |
| `rejected` | Did not qualify | (none) |

### Update Pipeline Stage
```bash
POST /api/update-pipeline-stage
{
  "leadId": "abc123",
  "newStage": "application"
}
```

---

## Lead Scoring

Leads are automatically scored based on:

| Factor | Points |
|--------|--------|
| Has email | +20 |
| Has phone | +15 |
| Has full name | +10 |
| Interest type: agent | +25 |
| Location filled | +10 |
| Replied to messages | +5 each |
| Opened emails | +3 each |

### Get Leads by Score
```bash
GET /api/leads/by-score?businessId=xxx
```

**Response:**
```json
{
  "leads": [...],
  "segments": {
    "hot": 12,    // score >= 70
    "warm": 25,   // score 40-69
    "cold": 45    // score < 40
  }
}
```

### Recalculate Lead Score
```bash
POST /api/leads/:id/recalculate-score
```

---

## Nurture Sequences

Automated email sequences to convert leads to agents.

### Default 7-Day Drip Campaign

| Day | Email | Template |
|-----|-------|----------|
| 1 | Earnings Potential | `nurture_earnings` |
| 3 | Success Stories | `nurture_success` |
| 5 | Franchise Comparison | `drip_day5_franchise` |
| 7 | Final CTA | `nurture_final_cta` |

### Enroll Lead in Nurture
```bash
POST /api/enroll-in-nurture
{
  "leadId": "abc123",
  "sequenceId": "7day-drip"
}
```

### Post-Onboarding Nurture
```bash
POST /api/enroll-post-onboarding/:leadId
```

---

## Lead Magnets

Downloadable content to capture leads.

### Deliver Lead Magnet
```bash
POST /api/deliver-lead-magnet
{
  "leadId": "abc123",
  "magnetId": "earnings-guide"
}
```

**Available Lead Magnets:**
- PlataPay Earnings Calculator
- Agent Success Stories PDF
- Franchise Package Comparison
- Business Requirements Checklist

---

## Automation Triggers

### New Lead (from Facebook)
1. ✅ Create FbLead record
2. ✅ Calculate initial score
3. ✅ Set pipeline stage to `inquiry`
4. ✅ Send welcome email
5. ✅ Enroll in nurture sequence
6. ✅ Notify sales team (if high score)

### Stage Change
1. ✅ Update pipeline stage
2. ✅ Send stage-specific email
3. ✅ Log activity
4. ✅ Update stageChangedAt timestamp

### Re-engagement
Dormant leads (30+ days no activity) receive:
```bash
POST /api/trigger-reengagement
```

---

## Dashboard Views

| Page | Path | Features |
|------|------|----------|
| Agent Pipeline | `/agent-pipeline` | Kanban board, stage management |
| Lead Magnets | `/lead-magnets` | Create/manage magnets |
| Nurture Sequences | `/nurture-sequences` | Email sequence builder |

---

## SLA & Reporting

### SLA Report
```bash
GET /api/sla-report?businessId=xxx
```

**Tracks:**
- Response time to new leads
- Stage conversion rates
- Average time in each stage
- Overdue leads

### Daily Digest (Cron: 8 AM Manila)
- New leads count
- Pipeline movement
- Overdue follow-ups
- Top performing sources

### Weekly Report (Cron: Monday 8 AM)
- Week-over-week comparison
- Conversion funnel
- Lead source breakdown
- Revenue attribution

---

## Integration with Image Generator

Generate personalized images for lead campaigns:

```bash
POST /api/automation/generate-and-email
{
  "scene": "agent_success",
  "recipients": ["lead1@email.com", "lead2@email.com"],
  "subject": "See How PlataPay Agents Succeed"
}
```

This combines:
1. AI image generation (GPT-5)
2. Professional email template
3. Batch sending to multiple leads

# InnovateHub Marketing Platform

**AI-Powered Facebook Marketing & Lead Conversion Platform for PlataPay Philippines**

[![Status](https://img.shields.io/badge/Status-Production-green)]()
[![API](https://img.shields.io/badge/API%20Endpoints-68+-blue)]()
[![Email Templates](https://img.shields.io/badge/Email%20Templates-16-purple)]()

## 🚀 What is InnovateHub Hub?

InnovateHub Hub is a comprehensive marketing automation platform built specifically for **PlataPay** - a Philippine fintech providing bills payment, remittance, e-loading, and cash in/out services through community-based agents.

The platform combines:
- 🤖 **AI-Powered Image Generation** (GPT-5 Image)
- 📧 **Automated Email Marketing Campaigns**
- 📊 **Competitive Intelligence** (tracking GCash, Maya, PayMongo, etc.)
- 🎯 **Lead Nurturing & Agent Pipeline Management**
- 📱 **Facebook Ads Integration**

---

## 📍 Live URLs

| Service | URL |
|---------|-----|
| **Main Dashboard** | https://platapayph.innoserver.cloud |
| **Webhook API** | https://webhook.innoserver.cloud |
| **Documentation** | https://docs.innoserver.cloud |

---

## 🎯 Core Features

### 1. AI Image Generator
Generate professional marketing images using GPT-5 Image with PlataPay branding.

**10 Pre-built Scene Presets:**
- `ofw_remittance` - OFW families receiving money
- `rural_queue` - Provincial community access
- `school_students` - Students paying tuition
- `market_vendors` - Vendors depositing earnings
- `agent_success` - Proud outlet owners
- `senior_citizen` - Elderly receiving pension
- `motorcycle_delivery` - Delivery riders
- `fiesta_celebration` - Town fiesta payments
- `micro_business` - Sari-sari store integration
- `tech_savvy_youth` - Young professionals

**Quick Start:**
```bash
# Generate image from scene
curl -X POST https://webhook.innoserver.cloud/api/platapay/generate-scene \
  -H "Content-Type: application/json" \
  -d '{"scene": "ofw_remittance"}'
```

### 2. Email Marketing System
16 professional email templates with automatic sending.

**Templates:**
- `agent_recruitment` - Convert leads to PlataPay agents
- `welcome_agent` - Onboarding new agents
- `franchise_inquiry` - Franchise package info
- `nurture_earnings` - Earnings potential
- `nurture_success` - Success stories
- `webinar_registration` - Event confirmations
- 7-day drip campaign series
- And more...

**Quick Start:**
```bash
curl -X POST https://webhook.innoserver.cloud/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "lead@example.com",
    "template": "agent_recruitment",
    "subject": "Start Your Own PlataPay Outlet",
    "data": {
      "heroImage": "https://webhook.innoserver.cloud/assets/generated/xxx.png",
      "name": "Juan"
    }
  }'
```

### 3. One-Click Marketing Automation
Generate image + send emails in a single API call.

```bash
curl -X POST https://webhook.innoserver.cloud/api/automation/generate-and-email \
  -H "Content-Type: application/json" \
  -d '{
    "scene": "agent_success",
    "recipients": ["lead1@email.com", "lead2@email.com"],
    "subject": "Become a PlataPay Agent Today!"
  }'
```

### 4. Competitive Intelligence
Track 7 Philippine fintech competitors:
- GCash
- Maya (PayMaya)
- Coins.ph
- PayMongo
- Bayad Center
- Cebuana Lhuillier
- Palawan Express

### 5. Agent Pipeline Management
- Lead capture from Facebook/website
- Automated nurture sequences
- SLA tracking and alerts
- Conversion analytics

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INNOVATEHUB HUB                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Dashboard  │  │   Webhook   │  │   Image Generator   │  │
│  │   (React)   │  │   Server    │  │   (GPT-5 Image)     │  │
│  │  Port 3457  │  │  Port 3790  │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │               │                    │              │
│         └───────────────┼────────────────────┘              │
│                         │                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Back4App (Parse)                  │    │
│  │  • Businesses  • Leads  • Agents  • Campaigns       │    │
│  │  • EmailLogs   • Competitors  • Analytics           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                External Services                     │    │
│  │  • OpenRouter (GPT-5 Image)  • Hostinger SMTP       │    │
│  │  • Facebook Graph API        • Cloudflare           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 API Reference

### Image Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/platapay/generate-scene` | POST | Generate from preset scene |
| `/api/platapay/generate-image` | POST | Generate from custom prompt |
| `/api/platapay/scenes` | GET | List available scenes |
| `/api/automation/quick-image/:scene` | GET | Quick generate for ads |

### Email Marketing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/send-email` | POST | Send single email |
| `/api/send-bulk-email` | POST | Send to multiple recipients |
| `/api/send-test-email` | POST | Test email template |
| `/api/schedule-email` | POST | Schedule future email |
| `/api/scheduled-emails` | GET | List scheduled emails |

### Automation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/automation/generate-and-email` | POST | Generate image + send emails |
| `/api/trigger-reengagement` | POST | Trigger re-engagement campaign |
| `/api/send-daily-digest` | POST | Send daily digest |
| `/api/send-weekly-report` | POST | Send weekly performance report |

### Lead Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | GET/POST | Manage leads |
| `/api/update-pipeline-stage` | POST | Update lead stage |
| `/api/webinar/register` | POST | Register for webinar |
| `/api/sla-report` | GET | Get SLA report |

### Competitive Intelligence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/competitors` | GET/POST | Manage competitors |
| `/api/competitor-ads` | GET | Get competitor ad data |

---

## 🖥️ Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview & analytics |
| Image Generator | `/image-generator` | AI image generation UI |
| Lead Magnets | `/lead-magnets` | Manage lead magnets |
| Nurture Sequences | `/nurture-sequences` | Email drip campaigns |
| Agent Pipeline | `/agent-pipeline` | Lead to agent conversion |
| Competitive Intel | `/competitive-intel` | Competitor tracking |
| Predictive Analytics | `/predictive-analytics` | Forecasting |
| Campaigns | `/campaigns` | Ad campaigns |
| AI Workshop | `/ai-workshop` | AI tools & testing |

---

## ⚡ Quick Start

### 1. Generate Marketing Image
```bash
curl -X POST https://webhook.innoserver.cloud/api/platapay/generate-scene \
  -H "Content-Type: application/json" \
  -d '{"scene": "agent_success"}'
```

### 2. Send Marketing Email
```bash
curl -X POST https://webhook.innoserver.cloud/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "prospect@email.com",
    "template": "agent_recruitment",
    "subject": "Start Your PlataPay Business",
    "data": {"heroImage": "URL_FROM_STEP_1"}
  }'
```

### 3. One-Click Campaign
```bash
curl -X POST https://webhook.innoserver.cloud/api/automation/generate-and-email \
  -H "Content-Type: application/json" \
  -d '{
    "scene": "ofw_remittance",
    "recipients": ["lead1@email.com", "lead2@email.com"],
    "subject": "Help OFW Families in Your Community"
  }'
```

---

## 📈 Platform Stats

| Metric | Count |
|--------|-------|
| API Endpoints | 68+ |
| Email Templates | 16 |
| Image Scene Presets | 10 |
| Dashboard Pages | 21 |
| Competitors Tracked | 7 |
| Cron Jobs | 5 |

---

## 🔧 Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Back4App (Parse)
- **AI:** OpenRouter (GPT-5 Image)
- **Email:** Hostinger SMTP (admin@innovatehub.ph)
- **Hosting:** Hostinger VPS + Cloudflare

---

## 📞 Support

- **Email:** admin@innovatehub.ph
- **Website:** https://innovatehub.ph
- **PlataPay:** https://platapay.ph

---

**Built with ❤️ by InnovateHub Philippines**

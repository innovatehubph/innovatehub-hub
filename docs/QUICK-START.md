# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Use the Dashboard (No Code)

1. **Open Dashboard:** https://platapayph.innoserver.cloud
2. **Login** with your credentials
3. **Navigate to Image Generator** (`/image-generator`)
4. **Select a scene** (e.g., "OFW Remittance")
5. **Click Generate** (~30-60 seconds)
6. **Enter recipient emails**
7. **Click Send** ✅

---

### Option 2: API Integration (For Developers)

#### Generate Marketing Image
```bash
curl -X POST https://webhook.innoserver.cloud/api/platapay/generate-scene \
  -H "Content-Type: application/json" \
  -d '{"scene": "agent_success"}'
```

**Response:**
```json
{
  "success": true,
  "publicUrl": "https://webhook.innoserver.cloud/assets/generated/agent_success_xxx.png",
  "emailUrl": "https://webhook.innoserver.cloud/assets/generated/agent_success_xxx_email.jpg"
}
```

#### Send Marketing Email
```bash
curl -X POST https://webhook.innoserver.cloud/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "prospect@email.com",
    "template": "agent_recruitment",
    "subject": "Start Your PlataPay Business",
    "data": {
      "heroImage": "URL_FROM_ABOVE",
      "name": "Juan"
    }
  }'
```

#### One-Click Campaign (Generate + Send)
```bash
curl -X POST https://webhook.innoserver.cloud/api/automation/generate-and-email \
  -H "Content-Type: application/json" \
  -d '{
    "scene": "ofw_remittance",
    "recipients": ["lead1@email.com", "lead2@email.com"],
    "subject": "Help OFW Families - Become a PlataPay Agent"
  }'
```

---

### Option 3: n8n / Make / Zapier Integration

**Webhook URL:** `https://webhook.innoserver.cloud/api/automation/generate-and-email`

**Method:** POST

**Body:**
```json
{
  "scene": "{{scene_from_trigger}}",
  "recipients": ["{{email_from_trigger}}"],
  "subject": "{{custom_subject}}"
}
```

---

## 📸 Available Image Scenes

| Scene ID | Best For |
|----------|----------|
| `ofw_remittance` | OFW-targeted campaigns |
| `rural_queue` | Provincial expansion |
| `school_students` | Back-to-school campaigns |
| `market_vendors` | Palengke area marketing |
| `agent_success` | Recruitment campaigns |
| `senior_citizen` | Pension/senior services |
| `motorcycle_delivery` | Rider partnerships |
| `fiesta_celebration` | Holiday campaigns |
| `micro_business` | Sari-sari store owners |
| `tech_savvy_youth` | Digital-first audience |

---

## 📧 Email Templates

| Template ID | Use Case |
|-------------|----------|
| `agent_recruitment` | Convert leads to agents |
| `welcome_agent` | New agent onboarding |
| `franchise_inquiry` | Franchise info |
| `nurture_earnings` | Earnings potential |
| `nurture_success` | Success stories |
| `webinar_registration` | Event confirmations |

---

## 💡 Tips

1. **For Facebook Ads:** Use `publicUrl` (full quality PNG)
2. **For Email Campaigns:** Use `emailUrl` (optimized JPG, ~70KB)
3. **Cost:** ~$0.05 per image generation
4. **Speed:** 30-60 seconds per image

---

## 🆘 Need Help?

- **Dashboard:** https://platapayph.innoserver.cloud
- **API Docs:** https://webhook.innoserver.cloud/assets/docs/
- **Email:** admin@innovatehub.ph

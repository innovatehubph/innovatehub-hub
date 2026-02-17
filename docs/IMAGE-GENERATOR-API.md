# PlataPay AI Image Generator API

## Base URL
```
https://webhook.innoserver.cloud
```

## 1. Generate Image from Scene Preset

```bash
POST /api/platapay/generate-scene
Content-Type: application/json

{
  "scene": "ofw_remittance"
}
```

**Available Scenes:**
| Scene ID | Description |
|----------|-------------|
| `ofw_remittance` | Family receiving OFW money |
| `rural_queue` | Provincial queue at outlet |
| `school_students` | Students paying tuition |
| `market_vendors` | Vendors depositing earnings |
| `agent_success` | Proud outlet owner |
| `senior_citizen` | Elderly receiving pension |
| `motorcycle_delivery` | Delivery rider cashing out |
| `fiesta_celebration` | Town fiesta payments |
| `micro_business` | Sari-sari store integration |
| `tech_savvy_youth` | Young professionals |

**Response:**
```json
{
  "success": true,
  "url": "https://webhook.innoserver.cloud/assets/generated/ofw_remittance_xxx.png",
  "publicUrl": "https://webhook.innoserver.cloud/assets/generated/ofw_remittance_xxx.png",
  "emailUrl": "https://webhook.innoserver.cloud/assets/generated/ofw_remittance_xxx_email.jpg",
  "scene": "ofw_remittance",
  "cost": 0.047
}
```

## 2. Generate Image from Custom Prompt

```bash
POST /api/platapay/generate-image
Content-Type: application/json

{
  "prompt": "Filipino family celebrating at a PlataPay outlet after receiving remittance",
  "style": "photorealistic"
}
```

## 3. Send Marketing Email with Image

```bash
POST /api/send-email
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Start Your Own PlataPay Outlet – Earn Up to ₱50,000/Month",
  "template": "agent_recruitment",
  "data": {
    "heroImage": "https://webhook.innoserver.cloud/assets/generated/xxx.png",
    "name": "Juan",
    "preheader": "Be your own boss. Join 500+ successful agents."
  }
}
```

## 4. Full Automation Workflow (n8n/Make/Zapier)

### Step 1: Generate Image
```bash
curl -X POST https://webhook.innoserver.cloud/api/platapay/generate-scene \
  -H "Content-Type: application/json" \
  -d '{"scene": "agent_success"}'
```

### Step 2: Send Email Campaign
```bash
curl -X POST https://webhook.innoserver.cloud/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "lead@example.com",
    "subject": "Start Your Own PlataPay Outlet",
    "template": "agent_recruitment",
    "data": {
      "heroImage": "<URL_FROM_STEP_1>",
      "name": "Juan"
    }
  }'
```

### Step 3: Use for Facebook Ads
The `publicUrl` from Step 1 can be used directly as the image URL for Facebook Ad creatives.

## 5. Bulk Email Campaign

```bash
POST /api/send-bulk-email
Content-Type: application/json

{
  "recipients": ["email1@example.com", "email2@example.com"],
  "subject": "Start Your Own PlataPay Outlet",
  "template": "agent_recruitment",
  "data": {
    "heroImage": "https://webhook.innoserver.cloud/assets/generated/xxx.png"
  }
}
```

## Image URLs

- **Full Quality (PNG):** `publicUrl` - For web, social media, high-res prints
- **Email Optimized (JPG):** `emailUrl` - Compressed for email campaigns (~70KB)

## Cost
- ~$0.047 per image generation (GPT-5 Image via OpenRouter)

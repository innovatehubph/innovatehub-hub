# InnovateHub AI Image Generator

AI-powered image generation for InnovateHub/PlataPay marketing, products, and content.

## Features

- **Multi-Provider Support**: Pollinations (free), OpenAI DALL-E 3, Replicate, Stability AI
- **12 Template Presets**: Facebook ads, Instagram posts/stories, YouTube thumbnails, email headers, etc.
- **12 Style Presets**: Photorealistic, illustration, 3D render, corporate, cinematic, etc.
- **Brand Presets**: PlataPay and InnovateHub brand guidelines built-in
- **Campaign Generation**: Generate assets for multiple platforms at once
- **Specialized Generators**: Agent profiles, branch locations, product mockups

## Quick Start

### API Endpoints

Base URL: `http://localhost:3790`

#### Generate Single Image

```bash
POST /api/images/generate
{
  "prompt": "Filipino family using mobile phone for payments",
  "template": "facebook_ad",
  "brand": "platapay",
  "style": "photorealistic"
}
```

#### Generate Campaign (Multiple Platforms)

```bash
POST /api/images/campaign
{
  "name": "Summer Promo 2026",
  "prompt": "PlataPay cashback rewards, happy customers",
  "platforms": ["facebook_ad", "instagram_post", "instagram_story"]
}
```

#### Generate Agent Profile

```bash
POST /api/images/agent-profile
{
  "gender": "female",
  "age": "young professional",
  "attire": "business casual"
}
```

#### Generate Branch Image

```bash
POST /api/images/branch
{
  "locationType": "mall kiosk",
  "features": "LED screens, payment terminals"
}
```

#### Quick Generate (GET)

```bash
GET /api/images/quick/facebook?prompt=Your+prompt+here
GET /api/images/quick/instagram?prompt=Your+prompt+here
GET /api/images/quick/story?prompt=Your+prompt+here
GET /api/images/quick/banner?prompt=Your+prompt+here
GET /api/images/quick/email?prompt=Your+prompt+here
```

### CLI Usage

```bash
# Install globally
cd image-generator && npm link

# Basic generation
ih-imagine "PlataPay mobile payment app" --template instagram_post --brand platapay

# Campaign mode
ih-imagine "Summer sale promotion" --campaign "Summer 2026" --platforms facebook_ad,instagram_post

# Agent profile
ih-imagine --agent-profile --gender female --age "young professional"

# Branch location
ih-imagine --branch-image --location "mall kiosk"

# List available options
ih-imagine --list-templates
ih-imagine --list-styles
ih-imagine --list-providers
```

## Templates

| Template | Size | Use Case |
|----------|------|----------|
| `facebook_ad` | 1200x628 | Facebook/Meta ads |
| `instagram_post` | 1080x1080 | Instagram feed posts |
| `instagram_story` | 1080x1920 | Instagram/FB stories |
| `youtube_thumbnail` | 1280x720 | YouTube video thumbnails |
| `linkedin_post` | 1200x627 | LinkedIn posts |
| `email_header` | 600x200 | Email banner headers |
| `product_shot` | 1024x1024 | Product photography |
| `infographic` | 800x2000 | Infographic designs |
| `hero_banner` | 1920x600 | Website hero sections |
| `agent_profile` | 512x512 | Staff/agent headshots |
| `branch_location` | 1200x800 | Store/kiosk photos |
| `app_screenshot` | 1284x2778 | Mobile app mockups |

## Styles

| Style | Description |
|-------|-------------|
| `photorealistic` | 8K professional photography |
| `illustration` | Digital vector art |
| `3d_render` | Octane 3D rendering |
| `flat_design` | Minimal modern graphics |
| `corporate` | Business stock photo style |
| `cinematic` | Movie poster dramatic |
| `minimalist` | Clean white space |
| `neon` | Cyberpunk glowing |
| `anime` | Japanese animation |
| `watercolor` | Artistic painting |
| `vintage` | Retro nostalgic |
| `hand_drawn` | Pencil sketch |

## Providers

| Provider | Free | Models |
|----------|------|--------|
| **Pollinations** | ✅ Yes | flux, flux-realism, flux-anime, flux-3d, turbo |
| **OpenAI** | ❌ API Key | dall-e-3, dall-e-2 |
| **Replicate** | ❌ API Key | flux-schnell, flux-dev, sdxl |
| **Stability AI** | ❌ API Key | stable-diffusion-xl, sd-v1-6 |

## Brand Presets

### PlataPay
- Colors: Blue and white, professional fintech aesthetic
- Style: Modern, clean, trustworthy, Filipino market
- Keywords: Digital payments, mobile wallet, financial inclusion

### InnovateHub
- Colors: Blue gradient, tech-forward
- Style: Innovative, cutting-edge, professional
- Keywords: Technology, innovation, digital transformation

## Environment Variables

```bash
# Optional: For premium providers
OPENAI_API_KEY=sk-xxx
REPLICATE_API_TOKEN=r8_xxx
STABILITY_API_KEY=sk-xxx
```

## Example Use Cases

### 1. Facebook Ad Campaign
```bash
curl -X POST http://localhost:3790/api/images/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Recruitment",
    "prompt": "Join PlataPay as an agent, earn extra income, serve your community",
    "platforms": ["facebook_ad", "instagram_post"],
    "brand": "platapay",
    "style": "corporate"
  }'
```

### 2. Product Mockup
```bash
curl -X POST http://localhost:3790/api/images/product \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "PlataPay Mobile App",
    "description": "Digital wallet with QR payments and bills payment",
    "category": "fintech mobile app"
  }'
```

### 3. Staff Directory Photos
```bash
curl -X POST http://localhost:3790/api/images/agent-profile \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "age": "middle-aged",
    "attire": "PlataPay polo shirt",
    "background": "payment center"
  }'
```

### 4. Branch Opening Announcement
```bash
curl -X POST http://localhost:3790/api/images/branch \
  -H "Content-Type: application/json" \
  -d '{
    "locationType": "retail store",
    "setting": "SM Mall Philippines",
    "features": "grand opening banner, balloons, customers"
  }'
```

## Integration with Marketing Platform

The image generator is integrated with the InnovateHub webhook server and can be used in:

- **Email Campaigns**: Generate email headers dynamically
- **Social Media Automation**: Create posts with AI-generated visuals
- **Lead Magnets**: Generate ebook covers, infographics
- **A/B Testing**: Create multiple ad variations
- **Agent Onboarding**: Auto-generate profile photos

## Notes

- Pollinations is free and requires no API key
- Generated images are accessible via URL immediately
- For production, consider caching generated images
- Brand presets ensure consistent visual identity

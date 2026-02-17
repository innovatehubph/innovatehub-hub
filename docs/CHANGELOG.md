# Changelog

## [2026-02-17] - AI Image Generator & Marketing Automation

### Added
- **AI Image Generator** powered by GPT-5 Image (OpenRouter)
  - 10 PlataPay marketing scene presets
  - Custom prompt support
  - Auto-optimized images for email (PNG→JPG, ~70KB)
  - Public URL storage at `/assets/generated/`

- **Agent Recruitment Email Template**
  - Professional HTML email with hero image support
  - Services grid (Cash In/Out, E-Loading, Bills Payment, Remittance)
  - Earnings highlight box (₱30K-50K/month)
  - CTA button with tracking

- **Marketing Automation Endpoints**
  - `POST /api/automation/generate-and-email` - One-click campaign
  - `GET /api/automation/quick-image/:scene` - Quick image for ads
  - `POST /api/platapay/generate-scene` - Scene-based generation
  - `POST /api/platapay/generate-image` - Custom prompt generation

- **Dashboard Image Generator Page**
  - Scene preset selector
  - Custom prompt input
  - Image preview gallery
  - Direct email sending UI

### Technical
- OpenRouter integration for GPT-5 Image API
- ImageMagick auto-optimization for email images
- Express 4.x compatibility fix for dashboard server

---

## [2026-02-16] - Competitive Intelligence & Analytics

### Added
- **Competitive Intelligence Module**
  - 7 Philippine fintech competitors tracked
  - Ad creative monitoring
  - Market positioning analysis

- **Predictive Analytics Dashboard**
  - Lead conversion forecasting
  - Revenue projections
  - Seasonal trend analysis

- **Email Marketing System**
  - 16 professional email templates
  - 7-day drip campaign series
  - Automated nurture sequences
  - SLA tracking and alerts

### Enhanced
- Agent Pipeline with stage tracking
- Lead magnet management
- Webinar registration flow

---

## [2026-02-15] - Core Platform Launch

### Added
- React Dashboard with 21 pages
- Webhook Server with 68+ API endpoints
- Back4App (Parse) integration
- Facebook Webhook integration
- MCP Server for Claude integration

### Infrastructure
- PM2 process management
- Cloudflare SSL/CDN
- Hostinger SMTP email

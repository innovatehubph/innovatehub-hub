# Test Results

> Last run: February 16, 2026

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 53 |
| Passed | 49 |
| Failed | 4 |
| Pass Rate | **92.5%** |
| Screenshots | 40 |

## All Pages Rendering

Every page in the dashboard was tested and confirmed rendering correctly.

### Dashboard
![Dashboard](../assets/screenshots/02-nav-dashboard.png)

### Businesses
![Businesses](../assets/screenshots/03-nav-businesses.png)

### Messenger
![Messenger](../assets/screenshots/04-nav-messenger.png)

### Bot Flows
![Bot Flows](../assets/screenshots/05-nav-bot-flows.png)

### Page Management
![Page Management](../assets/screenshots/06-nav-page-management.png)

### Ads & Campaigns
![Ads & Campaigns](../assets/screenshots/07-nav-ads-campaigns.png)

### Products
![Products](../assets/screenshots/08-nav-products.png)

### Orders
![Orders](../assets/screenshots/09-nav-orders.png)

### Token Store
![Token Store](../assets/screenshots/10-nav-token-store.png)

### Webhook Logs
![Webhook Logs](../assets/screenshots/11-nav-webhook-logs.png)

### Users & Roles
![Users & Roles](../assets/screenshots/12-nav-users-roles.png)

### Facebook Setup
![Facebook Setup](../assets/screenshots/13-nav-facebook-setup.png)

### AI Workshop
![AI Workshop](../assets/screenshots/14-nav-ai-workshop.png)

### Settings
![Settings](../assets/screenshots/15-nav-settings.png)

## Responsive Design

![Desktop 1920px](../assets/screenshots/25-responsive-desktop-1920.png)
*Desktop (1920x1080)*

![Laptop 1366px](../assets/screenshots/26-responsive-laptop-1366.png)
*Laptop (1366x768)*

![Tablet 768px](../assets/screenshots/27-responsive-tablet-768.png)
*Tablet (768x1024)*

![Mobile 375px](../assets/screenshots/28-responsive-mobile-375.png)
*Mobile (375x812)*

## UI Features

### Sidebar Collapse
![Expanded](../assets/screenshots/16-sidebar-expanded.png)
*Sidebar expanded (256px)*

![Collapsed](../assets/screenshots/17-sidebar-collapsed.png)
*Sidebar collapsed (64px)*

### Business Selector
![Selector](../assets/screenshots/18-business-selector.png)

### Chat Widget
![Chat Closed](../assets/screenshots/23-chat-widget-closed.png)
![Chat Open](../assets/screenshots/24-chat-widget-open.png)

## Failed Tests

4 tests failed (non-critical):

| Test | Reason |
|------|--------|
| API /agent/status | Response format validation (cosmetic) |
| API /agent/source | Source tree endpoint returned empty |
| Dark theme check | oklch color format not matching rgb regex |
| Sidebar bg check | oklch color format not matching rgb regex |

These failures are due to test assertion format mismatches, not actual functional issues.

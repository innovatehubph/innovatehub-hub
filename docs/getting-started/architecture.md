# Architecture

## System Overview

```
+--------------------------------------------------+
|                  Browser Client                   |
|    React 19 + TypeScript + Tailwind CSS v4        |
|         HashRouter (SPA) + Parse SDK              |
+----------------+-----------------+----------------+
                 |                 |
                 v                 v
+------------------------+  +----------------------+
|     Back4App Server    |  |    AI Proxy (VPS)    |
|  Parse Server + MongoDB|  |  Express + Claude AI |
|  Cloud Code (Node.js)  |  |  Port 3456           |
|  Webhooks + REST API   |  |  Code Gen + Deploy   |
+------------------------+  +----------------------+
         ^                           ^
         |                           |
+--------+---------------------------+----------+
|              Facebook Graph API               |
|   Pages - Messenger - Ads - Product Catalog   |
+-----------------------------------------------+
```

## Frontend Architecture

The dashboard is a single-page application built with:

- **React 19** with functional components and hooks
- **TypeScript** for type safety
- **Vite 7** for fast builds with HMR
- **Tailwind CSS v4** via @tailwindcss/vite plugin
- **HashRouter** for static hosting compatibility
- **Parse SDK v8** for direct database access

### Key Patterns

- **useParseQuery** hook — Reusable data fetching with CRUD operations
- **DataTable** component — Sortable, paginated tables with search
- **StatCard** component — Dashboard metric cards with loading states
- **Layout** component — Responsive sidebar navigation with collapse

## Backend Architecture

### Back4App Cloud Code
- 18+ Cloud Functions for business logic
- Background Jobs for scheduled tasks (token refresh, analytics sync)
- Triggers for data validation and computed fields
- Express middleware for Facebook webhook handling

### AI Proxy Server
- Proxies requests to Claude AI API
- Source code analysis and generation
- Staging pipeline (generate -> stage -> QA -> deploy)
- Build automation (npm build -> deploy)

## Data Flow

1. **User interacts** with React dashboard
2. **Parse SDK** sends queries to Back4App REST API
3. **Cloud Code** validates and processes requests
4. **Facebook Graph API** is called for external data
5. **Webhooks** receive real-time events from Facebook
6. **AI Proxy** generates code on demand via Claude AI

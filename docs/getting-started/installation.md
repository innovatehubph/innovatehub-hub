# Installation

## Prerequisites

- Node.js 18+ and npm
- Git
- Back4App account with an application created
- Facebook Developer account (for integration features)

## Clone the Repository

```bash
git clone https://github.com/innovatehubph/innovatehub-hub.git
cd innovatehub-hub
```

## Install Dashboard Dependencies

```bash
cd dashboard
npm install
```

## Build the Dashboard

```bash
npm run build
```

The built files will be in `dashboard/dist/`.

## Run Locally

### Option 1: Vite Dev Server
```bash
cd dashboard
npm run dev
```
Dashboard will be available at `http://localhost:5173`

### Option 2: Static Server (Production)
```bash
node dashboard-server.js
```
Dashboard will be available at `http://localhost:3457`

## Deploy to Back4App

```bash
# Copy build to deploy directory
cp -r dashboard/dist/* b4a-deploy/public/
cp cloud/main.js b4a-deploy/cloud/
cp cloud/app.js b4a-deploy/cloud/

# Deploy
cd b4a-deploy
b4a deploy -f
```

## Start AI Proxy

```bash
cd ai-proxy
npm install
node server.js
```
AI Proxy will run on `http://localhost:3456`

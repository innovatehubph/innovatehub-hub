#!/usr/bin/env node
// Refreshes the Claude OAuth token and updates Parse Config.
// Cron: every 30 min: */30 * * * * /usr/bin/node /root/innovatehub-hub/ai-proxy/refresh-token.js >> /var/log/claude-token-refresh.log 2>&1

import { readFileSync, writeFileSync } from 'fs';

const CREDENTIALS_PATH = '/root/.claude/.credentials.json';
const REFRESH_URL = 'https://console.anthropic.com/v1/oauth/token';
const PARSE_CONFIG_URL = 'https://parseapi.back4app.com/config';
const APP_ID = 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN';
const MASTER_KEY = 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h';

async function main() {
  const now = new Date().toISOString();
  console.log(`[${now}] Checking token...`);

  const fullCreds = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const creds = fullCreds.claudeAiOauth;

  // Only refresh if token expires within 10 minutes
  if (creds.expiresAt > Date.now() + 600000) {
    const minutesLeft = Math.round((creds.expiresAt - Date.now()) / 60000);
    console.log(`[${now}] Token still valid for ${minutesLeft} minutes, skipping refresh`);

    // Still update Parse Config with current token
    await updateParseConfig(creds.accessToken);
    return;
  }

  console.log(`[${now}] Refreshing token...`);

  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[${now}] Refresh failed:`, err);
    process.exit(1);
  }

  const data = await res.json();

  // Update local credentials
  fullCreds.claudeAiOauth.accessToken = data.access_token;
  if (data.refresh_token) fullCreds.claudeAiOauth.refreshToken = data.refresh_token;
  fullCreds.claudeAiOauth.expiresAt = Date.now() + (data.expires_in * 1000);
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(fullCreds));

  console.log(`[${now}] Token refreshed, expires in ${data.expires_in}s`);

  // Update Parse Config
  await updateParseConfig(data.access_token);
}

async function updateParseConfig(token) {
  const res = await fetch(PARSE_CONFIG_URL, {
    method: 'PUT',
    headers: {
      'X-Parse-Application-Id': APP_ID,
      'X-Parse-Master-Key': MASTER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ params: { anthropicApiKey: token } }),
  });

  if (res.ok) {
    console.log(`[${new Date().toISOString()}] Parse Config updated with token`);
  } else {
    console.error(`[${new Date().toISOString()}] Failed to update Parse Config:`, await res.text());
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

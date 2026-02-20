/**
 * Google OAuth Login Handler
 * Provides a web-based OAuth flow for refreshing Google API tokens
 */

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// OAuth Configuration
// You can set your own client credentials via environment variables
const OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '338689075775-o75k922vn5fdl18qergr96rp8g63e4d7.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '', // Set this for refresh to work
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://webhook.innoserver.cloud/oauth/callback',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
};

const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

/**
 * Generate OAuth authorization URL
 */
function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: OAUTH_CONFIG.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  const params = {
    client_id: OAUTH_CONFIG.clientId,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: OAUTH_CONFIG.redirectUri
  };
  
  // Add client_secret if available
  if (OAUTH_CONFIG.clientSecret) {
    params.client_secret = OAUTH_CONFIG.clientSecret;
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token exchange failed');
  }
  
  return response.json();
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
  const params = {
    client_id: OAUTH_CONFIG.clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  };
  
  // Add client_secret if available
  if (OAUTH_CONFIG.clientSecret) {
    params.client_secret = OAUTH_CONFIG.clientSecret;
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token refresh failed');
  }
  
  return response.json();
}

/**
 * Save tokens to file
 */
function saveTokens(tokens) {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Merge with existing tokens if refresh token is missing
  let existingTokens = {};
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      existingTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    } catch (e) {}
  }
  
  const newTokens = {
    ...existingTokens,
    access_token: tokens.access_token,
    expiry_date: Date.now() + (tokens.expires_in * 1000),
    token_type: tokens.token_type || 'Bearer',
    scope: tokens.scope || OAUTH_CONFIG.scopes.join(' ')
  };
  
  // Only update refresh token if we got a new one
  if (tokens.refresh_token) {
    newTokens.refresh_token = tokens.refresh_token;
  }
  
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(newTokens, null, 2));
  console.log('[OAuth] Tokens saved to:', TOKEN_PATH);
  
  return newTokens;
}

/**
 * Load tokens from file
 */
function loadTokens() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Check if tokens are valid
 */
function isTokenValid() {
  const tokens = loadTokens();
  if (!tokens || !tokens.access_token) return false;
  
  // Check if expired (with 5 minute buffer)
  return tokens.expiry_date > Date.now() + 300000;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken() {
  const tokens = loadTokens();
  
  if (!tokens) {
    throw new Error('No tokens found. Please login via /oauth/login');
  }
  
  // Check if token is still valid
  if (tokens.expiry_date > Date.now() + 300000) {
    return tokens.access_token;
  }
  
  // Refresh the token
  if (!tokens.refresh_token) {
    throw new Error('No refresh token. Please login again via /oauth/login');
  }
  
  console.log('[OAuth] Refreshing access token...');
  const newTokens = await refreshAccessToken(tokens.refresh_token);
  saveTokens(newTokens);
  
  return newTokens.access_token;
}

/**
 * Setup OAuth routes
 */
function setupOAuthRoutes(app) {
  // Login page - redirects to Google
  app.get('/oauth/login', (req, res) => {
    const authUrl = getAuthUrl();
    
    // If request wants JSON, return URL
    if (req.query.json === 'true') {
      return res.json({ authUrl });
    }
    
    // Otherwise show a nice login page
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>PlataPay - Google Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #57317A 0%, #28a745 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
    h1 { color: #57317A; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    .btn { display: inline-flex; align-items: center; gap: 12px; background: #4285F4; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; transition: all 0.2s; }
    .btn:hover { background: #3367D6; transform: translateY(-2px); }
    .btn img { width: 24px; height: 24px; }
    .scopes { text-align: left; background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
    .scopes h4 { margin: 0 0 10px; color: #333; }
    .scopes ul { margin: 0; padding-left: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://webhook.innoserver.cloud/assets/PlataPay.png" alt="PlataPay" style="width: 120px; margin-bottom: 20px;">
    <h1>Connect Google Account</h1>
    <p>Sign in with Google to enable Sheets, Gmail, and Calendar access for PlataPay automation.</p>
    
    <a href="${authUrl}" class="btn">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
      Sign in with Google
    </a>
    
    <div class="scopes">
      <h4>Permissions requested:</h4>
      <ul>
        <li>Google Sheets (read/write)</li>
        <li>Gmail (send emails)</li>
        <li>Google Calendar (events)</li>
        <li>Google Drive (files)</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `);
  });
  
  // OAuth callback
  app.get('/oauth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).send(`
        <h1>Login Failed</h1>
        <p>Error: ${error}</p>
        <a href="/oauth/login">Try again</a>
      `);
    }
    
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }
    
    try {
      const tokens = await exchangeCodeForTokens(code);
      saveTokens(tokens);
      
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Success - PlataPay</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
    .success { color: #28a745; font-size: 60px; }
    h1 { color: #333; }
    p { color: #666; }
    .btn { display: inline-block; background: #57317A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h1>Connected Successfully!</h1>
    <p>Your Google account is now connected to PlataPay.</p>
    <p>Token expires: ${new Date(Date.now() + tokens.expires_in * 1000).toLocaleString()}</p>
    <a href="/oauth/status" class="btn">Check Status</a>
  </div>
</body>
</html>
      `);
    } catch (err) {
      console.error('[OAuth] Callback error:', err);
      res.status(500).send(`
        <h1>Login Failed</h1>
        <p>Error: ${err.message}</p>
        <a href="/oauth/login">Try again</a>
      `);
    }
  });
  
  // Token status
  app.get('/oauth/status', (req, res) => {
    const tokens = loadTokens();
    
    if (!tokens) {
      return res.json({
        authenticated: false,
        message: 'Not logged in',
        loginUrl: '/oauth/login'
      });
    }
    
    const isValid = tokens.expiry_date > Date.now();
    const expiresIn = Math.round((tokens.expiry_date - Date.now()) / 1000 / 60);
    
    res.json({
      authenticated: true,
      valid: isValid,
      expiresAt: new Date(tokens.expiry_date).toISOString(),
      expiresIn: isValid ? `${expiresIn} minutes` : 'Expired',
      hasRefreshToken: !!tokens.refresh_token,
      scopes: tokens.scope?.split(' ') || []
    });
  });
  
  // Manual refresh
  app.post('/oauth/refresh', async (req, res) => {
    try {
      const tokens = loadTokens();
      
      if (!tokens?.refresh_token) {
        return res.status(400).json({ error: 'No refresh token. Please login again.' });
      }
      
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      saveTokens(newTokens);
      
      res.json({
        success: true,
        message: 'Token refreshed',
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  console.log('[OAuth] Routes setup complete');
  console.log('[OAuth] Login URL: https://webhook.innoserver.cloud/oauth/login');
}

module.exports = {
  setupOAuthRoutes,
  getValidAccessToken,
  isTokenValid,
  loadTokens,
  saveTokens,
  refreshAccessToken,
  OAUTH_CONFIG
};

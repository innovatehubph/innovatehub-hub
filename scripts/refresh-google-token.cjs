#!/usr/bin/env node
/**
 * Google OAuth Token Refresh Script
 * Refreshes the Google Workspace MCP tokens using the refresh_token
 * 
 * The google-workspace-mcp uses a cloud function for token refresh.
 * This script calls that endpoint directly.
 */

const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

async function refreshToken() {
  console.log('🔄 Google OAuth Token Refresh\n');
  
  // Load current tokens
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('✅ Loaded existing tokens');
    console.log(`   Access token: ${tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`   Refresh token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`   Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'UNKNOWN'}`);
    console.log(`   Expired: ${tokens.expiry_date ? (Date.now() > tokens.expiry_date ? 'YES' : 'NO') : 'UNKNOWN'}`);
  } catch (err) {
    console.error('❌ Failed to load tokens:', err.message);
    process.exit(1);
  }
  
  if (!tokens.refresh_token) {
    console.error('\n❌ No refresh_token available. Need to re-authenticate via browser.');
    console.log('\nRun this command to re-authenticate:');
    console.log('  npx @presto-ai/google-workspace-mcp');
    process.exit(1);
  }
  
  console.log('\n🔄 Calling Google Workspace MCP refresh endpoint...');
  
  try {
    const response = await fetch('https://google-workspace-extension.geminicli.com/refreshToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokens.refresh_token
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }
    
    const newTokens = await response.json();
    
    // Merge with existing tokens (keep refresh_token if not provided)
    const updatedTokens = {
      ...newTokens,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      scope: newTokens.scope || tokens.scope,
      token_type: newTokens.token_type || tokens.token_type || 'Bearer'
    };
    
    // Save updated tokens
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedTokens, null, 2));
    
    console.log('\n✅ Token refreshed successfully!');
    console.log(`   New access token: ${updatedTokens.access_token.substring(0, 20)}...`);
    console.log(`   New expiry: ${new Date(updatedTokens.expiry_date).toISOString()}`);
    console.log(`   Valid for: ${Math.round((updatedTokens.expiry_date - Date.now()) / 1000 / 60)} minutes`);
    
    return updatedTokens;
    
  } catch (err) {
    console.error('\n❌ Token refresh failed:', err.message);
    
    if (err.message.includes('invalid_grant')) {
      console.log('\n⚠️  The refresh token has been revoked or expired.');
      console.log('   You need to re-authenticate via browser.');
      console.log('\n   Run: npx @presto-ai/google-workspace-mcp');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  refreshToken()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { refreshToken };

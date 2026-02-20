/**
 * PlataPay Knowledge Base Updater
 * Monitors and updates AI knowledge from multiple sources:
 * - platapay.ph website
 * - PlataPay Facebook page
 * - Google Sheets (Agents, Packages)
 * 
 * Run via cron or manually: node knowledge-updater.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Configuration
const KNOWLEDGE_BASE_PATH = path.join(__dirname, 'knowledge-base.json');
const PLATAPAY_URL = 'https://platapay.ph';
const FACEBOOK_PAGE_ID = '267252936481761';
const AGENTS_SHEET_ID = '1Co0RkDiitvD71LqEwEan8ErPqj6fXm-R7RK2DJJIAfk';
const PACKAGES_SHEET_ID = '1jsTjNZZJNyHRBPrPt9CpqbaOFJ3KREn_qSI-UlPC1bU';
const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

// Load existing knowledge base
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(KNOWLEDGE_BASE_PATH)) {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[KB] Error loading knowledge base:', err.message);
  }
  return {
    lastUpdated: null,
    website: {},
    facebook: {},
    agents: {},
    packages: {},
    updates: []
  };
}

// Save knowledge base
function saveKnowledgeBase(kb) {
  kb.lastUpdated = new Date().toISOString();
  fs.writeFileSync(KNOWLEDGE_BASE_PATH, JSON.stringify(kb, null, 2));
  console.log('[KB] Knowledge base saved:', KNOWLEDGE_BASE_PATH);
}

// Fetch and parse platapay.ph website
async function updateFromWebsite(kb) {
  console.log('[KB] Fetching platapay.ph...');
  try {
    const res = await fetch(PLATAPAY_URL, {
      headers: { 'User-Agent': 'PlataPay-KnowledgeBot/1.0' },
      timeout: 30000
    });
    
    if (!res.ok) {
      console.error('[KB] Website fetch failed:', res.status);
      return false;
    }
    
    const html = await res.text();
    
    // Extract key information from the page
    const updates = {
      fetchedAt: new Date().toISOString(),
      title: extractMeta(html, 'title'),
      description: extractMeta(html, 'description'),
      services: extractServices(html),
      packages: extractPackages(html),
      contact: extractContact(html),
      stats: extractStats(html)
    };
    
    // Check for changes
    const oldHash = JSON.stringify(kb.website.services || []);
    const newHash = JSON.stringify(updates.services || []);
    
    if (oldHash !== newHash) {
      console.log('[KB] Website content changed!');
      kb.updates.push({
        source: 'website',
        timestamp: new Date().toISOString(),
        type: 'content_change',
        summary: 'Services or content updated on platapay.ph'
      });
    }
    
    kb.website = updates;
    return true;
  } catch (err) {
    console.error('[KB] Website error:', err.message);
    return false;
  }
}

// Helper: Extract meta content
function extractMeta(html, name) {
  const match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
                html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'));
  return match ? match[1] : '';
}

// Helper: Extract services from HTML
function extractServices(html) {
  const services = [];
  // Look for common service-related patterns
  const servicePatterns = [
    /bills?\s*payment/gi,
    /e-?load(?:ing)?/gi,
    /remittance/gi,
    /cash[- ]?in/gi,
    /cash[- ]?out/gi,
    /bank\s*transfer/gi,
    /insurance/gi,
    /travel/gi,
    /lotto/gi,
    /scratch\s*it/gi,
    /j&?t/gi,
    /atm\s*withdrawal/gi,
    /qr\s*ph/gi
  ];
  
  for (const pattern of servicePatterns) {
    if (pattern.test(html)) {
      const match = html.match(pattern);
      if (match) services.push(match[0]);
    }
  }
  
  return [...new Set(services)];
}

// Helper: Extract package info
function extractPackages(html) {
  const packages = [];
  // Look for price patterns (Philippine Peso)
  const priceMatches = html.matchAll(/₱[\d,]+(?:\.\d{2})?|PHP\s*[\d,]+/gi);
  for (const match of priceMatches) {
    packages.push(match[0]);
  }
  return [...new Set(packages)].slice(0, 10); // Limit to 10
}

// Helper: Extract contact info
function extractContact(html) {
  const contact = {};
  
  // Phone numbers
  const phoneMatch = html.match(/(?:\+63|0)9\d{9}/);
  if (phoneMatch) contact.phone = phoneMatch[0];
  
  // Email
  const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contact.email = emailMatch[0];
  
  return contact;
}

// Helper: Extract stats
function extractStats(html) {
  const stats = {};
  
  // Look for number patterns with keywords
  const agentMatch = html.match(/(\d{1,3}(?:,\d{3})*)\+?\s*(?:agents?|partners?)/i);
  if (agentMatch) stats.agents = agentMatch[1];
  
  const transactionMatch = html.match(/(\d{1,3}(?:,\d{3})*)\+?\s*transactions?/i);
  if (transactionMatch) stats.transactions = transactionMatch[1];
  
  return stats;
}

// Fetch Facebook page updates (using Graph API if available)
async function updateFromFacebook(kb) {
  console.log('[KB] Checking Facebook page...');
  try {
    // Try to get page info from Parse database (where we store FB apps)
    const Parse = require('parse/node');
    Parse.initialize('FpGt0RFQWM5pXjKNgOAwIB0IKhOdaImCUbKMolJo', 'kCB5pa1DDrLOHCluWqTOD0hx5S1gf1BZQ5EAO7ea', 'i7dLwHDcxKcvfG4hRqFCOJXEtpN09qHIE87GZZYN');
    Parse.serverURL = 'https://parseapi.back4app.com/';
    
    const query = new Parse.Query('FacebookApp');
    query.equalTo('pageId', FACEBOOK_PAGE_ID);
    const fbApp = await query.first({ useMasterKey: true });
    
    if (fbApp && fbApp.get('pageAccessToken')) {
      const token = fbApp.get('pageAccessToken');
      
      // Fetch recent posts
      const postsRes = await fetch(
        `https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}/posts?fields=message,created_time,permalink_url&limit=5&access_token=${token}`
      );
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData.data || [];
        
        // Check for new posts
        const latestPostTime = posts[0]?.created_time;
        if (latestPostTime && latestPostTime !== kb.facebook.latestPostTime) {
          console.log('[KB] New Facebook post detected!');
          kb.updates.push({
            source: 'facebook',
            timestamp: new Date().toISOString(),
            type: 'new_post',
            summary: posts[0]?.message?.substring(0, 100) || 'New post'
          });
        }
        
        kb.facebook = {
          fetchedAt: new Date().toISOString(),
          pageId: FACEBOOK_PAGE_ID,
          latestPostTime,
          recentPosts: posts.map(p => ({
            message: p.message?.substring(0, 200),
            created: p.created_time,
            url: p.permalink_url
          }))
        };
        
        return true;
      }
    }
    
    console.log('[KB] Facebook: No valid access token or fetch failed');
    kb.facebook.fetchedAt = new Date().toISOString();
    kb.facebook.status = 'no_token';
    return false;
  } catch (err) {
    console.error('[KB] Facebook error:', err.message);
    return false;
  }
}

// Fetch Google Sheets data
async function updateFromSheets(kb) {
  console.log('[KB] Fetching Google Sheets...');
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch Agents count and locations
    const agentsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: AGENTS_SHEET_ID,
      range: 'Agents Onboarded!A2:H1000'
    });
    
    const agentRows = agentsRes.data.values || [];
    const activeAgents = agentRows.filter(row => {
      const rowStr = (row || []).join(' ').toLowerCase();
      return !rowStr.includes('inactive') && !rowStr.includes('expired');
    });
    
    // Extract locations
    const locations = {};
    for (const row of activeAgents) {
      const loc = row[5] || ''; // Location column
      // Extract province/city
      const locLower = loc.toLowerCase();
      const provinces = ['batangas', 'cavite', 'laguna', 'bulacan', 'pampanga', 'cebu', 'davao', 'iloilo', 'manila', 'quezon'];
      for (const prov of provinces) {
        if (locLower.includes(prov)) {
          locations[prov] = (locations[prov] || 0) + 1;
        }
      }
    }
    
    // Check for changes
    const oldCount = kb.agents.totalActive || 0;
    const newCount = activeAgents.length;
    
    if (newCount !== oldCount) {
      console.log(`[KB] Agent count changed: ${oldCount} → ${newCount}`);
      kb.updates.push({
        source: 'sheets',
        timestamp: new Date().toISOString(),
        type: 'agent_count_change',
        summary: `Agent count: ${oldCount} → ${newCount}`
      });
    }
    
    kb.agents = {
      fetchedAt: new Date().toISOString(),
      totalActive: activeAgents.length,
      totalRows: agentRows.length,
      byLocation: locations,
      topLocations: Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([loc, count]) => `${loc}: ${count}`)
    };
    
    // Fetch Packages info
    try {
      const packagesRes = await sheets.spreadsheets.values.get({
        spreadsheetId: PACKAGES_SHEET_ID,
        range: 'PlataPay Business Package & Revenue!A1:Z20'
      });
      
      const packageRows = packagesRes.data.values || [];
      kb.packages = {
        fetchedAt: new Date().toISOString(),
        data: packageRows.slice(0, 10) // First 10 rows
      };
    } catch (pkgErr) {
      console.log('[KB] Packages sheet error:', pkgErr.message);
    }
    
    return true;
  } catch (err) {
    console.error('[KB] Sheets error:', err.message);
    return false;
  }
}

// Generate AI-friendly summary
function generateAISummary(kb) {
  const summary = [];
  
  summary.push(`# PlataPay Knowledge Base`);
  summary.push(`Last Updated: ${kb.lastUpdated}`);
  summary.push('');
  
  // Agents info
  if (kb.agents.totalActive) {
    summary.push(`## Active Agents`);
    summary.push(`- Total Active: ${kb.agents.totalActive}`);
    summary.push(`- Top Locations: ${kb.agents.topLocations?.join(', ') || 'N/A'}`);
    summary.push('');
  }
  
  // Website info
  if (kb.website.services?.length) {
    summary.push(`## Services (from website)`);
    summary.push(kb.website.services.join(', '));
    summary.push('');
  }
  
  // Recent Facebook posts
  if (kb.facebook.recentPosts?.length) {
    summary.push(`## Recent Facebook Posts`);
    for (const post of kb.facebook.recentPosts.slice(0, 3)) {
      summary.push(`- ${post.created}: ${post.message || '[No text]'}`);
    }
    summary.push('');
  }
  
  // Recent updates
  if (kb.updates?.length) {
    summary.push(`## Recent Updates`);
    for (const update of kb.updates.slice(-5)) {
      summary.push(`- [${update.source}] ${update.summary}`);
    }
  }
  
  return summary.join('\n');
}

// Main update function
async function updateKnowledgeBase() {
  console.log('========================================');
  console.log('[KB] Starting knowledge base update...');
  console.log('========================================');
  
  const kb = loadKnowledgeBase();
  
  // Keep only last 20 updates
  kb.updates = (kb.updates || []).slice(-20);
  
  // Update from all sources
  await updateFromWebsite(kb);
  await updateFromFacebook(kb);
  await updateFromSheets(kb);
  
  // Save updated knowledge base
  saveKnowledgeBase(kb);
  
  // Generate AI summary
  const summary = generateAISummary(kb);
  const summaryPath = path.join(__dirname, 'knowledge-summary.md');
  fs.writeFileSync(summaryPath, summary);
  console.log('[KB] AI summary saved:', summaryPath);
  
  console.log('========================================');
  console.log('[KB] Update complete!');
  console.log(`[KB] Active Agents: ${kb.agents.totalActive || 'N/A'}`);
  console.log(`[KB] Recent Updates: ${kb.updates.length}`);
  console.log('========================================');
  
  return kb;
}

// Export for use in other modules
module.exports = {
  updateKnowledgeBase,
  loadKnowledgeBase,
  generateAISummary
};

// Run if called directly
if (require.main === module) {
  updateKnowledgeBase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[KB] Fatal error:', err);
      process.exit(1);
    });
}

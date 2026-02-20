#!/usr/bin/env node
/**
 * Setup Google Sheets with dropdowns, styling, and campaign tracking
 * Uses existing Google Workspace MCP tokens
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load tokens from Google Workspace MCP
const TOKENS_PATH = path.join(process.env.HOME, '.config/google-workspace-mcp/tokens.json');

// Sheet IDs from Boss Marc
const SHEET_IDS = [
  '1Co0RkDiitvD71LqEwEan8ErPqj6fXm-R7RK2DJJIAfk',
  '1jsTjNZZJNyHRBPrPt9CpqbaOFJ3KREn_qSI-UlPC1bU'
];

// Configuration
const CONFIG = {
  headers: [
    'Lead ID',
    'Name', 
    'Email',
    'Phone',
    'Location',
    'Source',
    'Status',
    'Email Type',
    'Campaign',
    'Last Contact',
    'Next Follow-up',
    'Notes',
    'Created Date',
    'Updated Date'
  ],
  
  dropdowns: {
    'Status': [
      'New',
      'Contacted', 
      'Qualified',
      'Proposal Sent',
      'Negotiation',
      'Converted',
      'Lost',
      'On Hold',
      'Unresponsive'
    ],
    'Email Type': [
      'None',
      'Marketing - Initial',
      'Marketing - Promo',
      'Marketing - Newsletter',
      'Follow-up - 1st',
      'Follow-up - 2nd',
      'Follow-up - 3rd',
      'Follow-up - Final',
      'Drip - Welcome',
      'Drip - Day 3',
      'Drip - Day 7',
      'Drip - Day 14',
      'Re-engagement',
      'Post-Onboarding',
      'Webinar Invite',
      'Webinar Reminder',
      'Webinar Follow-up'
    ],
    'Campaign': [
      'None',
      'Agent Recruitment 2026',
      'PlataPay Launch',
      'Merchant Acquisition',
      'Holiday Promo Q1',
      'Referral Program',
      'Webinar Series',
      'Re-engagement Feb 2026',
      'Cross-sell Campaign',
      'Brand Awareness'
    ],
    'Source': [
      'Facebook Messenger',
      'Facebook Page',
      'Facebook Ads',
      'Website Form',
      'Referral',
      'Walk-in',
      'Phone Inquiry',
      'Email',
      'Event/Webinar',
      'Partner',
      'Other'
    ]
  },
  
  colors: {
    headerBg: { red: 0.102, green: 0.451, blue: 0.91 }, // #1a73e8
    headerText: { red: 1, green: 1, blue: 1 },
    alternateBg: { red: 0.973, green: 0.976, blue: 0.98 }
  }
};

// Load tokens
function loadTokens() {
  try {
    const data = fs.readFileSync(TOKENS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load tokens:', err.message);
    process.exit(1);
  }
}

// Make API request
function apiRequest(method, url, body, accessToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Get sheet metadata
async function getSheetMetadata(sheetId, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  return apiRequest('GET', url, null, accessToken);
}

// Batch update sheet
async function batchUpdate(sheetId, requests, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  return apiRequest('POST', url, { requests }, accessToken);
}

// Update values
async function updateValues(sheetId, range, values, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  return apiRequest('PUT', url, { values }, accessToken);
}

// Setup a single sheet
async function setupSheet(sheetId, accessToken) {
  console.log(`\n📊 Setting up sheet: ${sheetId}`);
  
  // Get sheet info
  const metadata = await getSheetMetadata(sheetId, accessToken);
  const sheet = metadata.sheets[0];
  const sheetGid = sheet.properties.sheetId;
  const sheetTitle = sheet.properties.title;
  console.log(`   Sheet: "${sheetTitle}" (GID: ${sheetGid})`);

  // 1. Set headers
  console.log('   ✓ Setting headers...');
  await updateValues(sheetId, `${sheetTitle}!A1:N1`, [CONFIG.headers], accessToken);

  // 2. Build batch update requests
  const requests = [];

  // Header formatting
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetGid,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: CONFIG.headers.length
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: CONFIG.colors.headerBg,
          textFormat: {
            foregroundColor: CONFIG.colors.headerText,
            bold: true,
            fontSize: 11
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE'
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
    }
  });

  // Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: sheetGid,
        gridProperties: {
          frozenRowCount: 1
        }
      },
      fields: 'gridProperties.frozenRowCount'
    }
  });

  // Column widths
  const columnWidths = [100, 150, 200, 130, 120, 130, 110, 150, 160, 120, 120, 250, 120, 120];
  columnWidths.forEach((width, index) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: sheetGid,
          dimension: 'COLUMNS',
          startIndex: index,
          endIndex: index + 1
        },
        properties: { pixelSize: width },
        fields: 'pixelSize'
      }
    });
  });

  // Header row height
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId: sheetGid,
        dimension: 'ROWS',
        startIndex: 0,
        endIndex: 1
      },
      properties: { pixelSize: 40 },
      fields: 'pixelSize'
    }
  });

  // Data validation (dropdowns)
  const dropdownColumns = {
    'Source': 5,      // Column F
    'Status': 6,      // Column G
    'Email Type': 7,  // Column H
    'Campaign': 8     // Column I
  };

  for (const [field, colIndex] of Object.entries(dropdownColumns)) {
    if (CONFIG.dropdowns[field]) {
      requests.push({
        setDataValidation: {
          range: {
            sheetId: sheetGid,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: colIndex,
            endColumnIndex: colIndex + 1
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: CONFIG.dropdowns[field].map(v => ({ userEnteredValue: v }))
            },
            showCustomUi: true,
            strict: true
          }
        }
      });
    }
  }

  // Conditional formatting for Status column
  const statusColors = [
    { status: 'New', color: { red: 0.91, green: 0.96, blue: 0.91 } },
    { status: 'Contacted', color: { red: 1, green: 0.95, blue: 0.88 } },
    { status: 'Qualified', color: { red: 0.89, green: 0.95, blue: 0.99 } },
    { status: 'Proposal Sent', color: { red: 0.95, green: 0.9, blue: 0.96 } },
    { status: 'Negotiation', color: { red: 0.99, green: 0.89, blue: 0.93 } },
    { status: 'Converted', color: { red: 0.78, green: 0.9, blue: 0.79 } },
    { status: 'Lost', color: { red: 1, green: 0.8, blue: 0.82 } },
    { status: 'On Hold', color: { red: 1, green: 0.98, blue: 0.77 } },
    { status: 'Unresponsive', color: { red: 0.96, green: 0.96, blue: 0.96 } }
  ];

  statusColors.forEach(item => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: sheetGid,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 6,
            endColumnIndex: 7
          }],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: item.status }]
            },
            format: {
              backgroundColor: item.color
            }
          }
        },
        index: 0
      }
    });
  });

  // Apply all updates
  console.log('   ✓ Applying formatting...');
  await batchUpdate(sheetId, requests, accessToken);
  
  console.log(`   ✅ Sheet setup complete!`);
}

// Main
async function main() {
  console.log('🚀 InnovateHub/PlataPay Sheet Setup\n');
  
  const tokens = loadTokens();
  console.log('✓ Loaded Google tokens');
  
  // Check if token is expired
  const now = Date.now();
  if (tokens.expiry_date && tokens.expiry_date < now) {
    console.error('❌ Access token expired. Need to refresh.');
    console.log('   Run: gog auth add <email> --services sheets,calendar,gmail');
    process.exit(1);
  }
  
  for (const sheetId of SHEET_IDS) {
    try {
      await setupSheet(sheetId, tokens.access_token);
    } catch (err) {
      console.error(`❌ Failed for ${sheetId}:`, err.message);
    }
  }
  
  console.log('\n✅ All sheets configured!');
  console.log('\nFeatures added:');
  console.log('  • Status dropdown (9 options with color coding)');
  console.log('  • Email Type dropdown (17 options)');
  console.log('  • Campaign dropdown (10 options)');
  console.log('  • Source dropdown (11 options)');
  console.log('  • Header styling (blue with white text)');
  console.log('  • Frozen header row');
  console.log('  • Optimized column widths');
}

main().catch(console.error);

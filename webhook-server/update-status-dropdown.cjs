#!/usr/bin/env node
/**
 * Update Status dropdown in Maps Leads spreadsheet
 * Adds "Qualified" and "Needs Email" status options
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');
const CONFIG_PATH = path.join(__dirname, 'maps-leads-config.json');

// Updated status options - Qualified leads have email, Needs Email = phone only
const STATUS_OPTIONS = [
  'Qualified',        // Has email - ready for campaigns
  'Needs Email',      // Has phone but no email
  'New',
  'Verified',
  'Contacted',
  'Interested',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Not Interested',
  'Invalid/Closed',
  'Duplicate',
  'On Hold'
];

// Status colors for conditional formatting
const STATUS_COLORS = {
  'Qualified': { red: 0.6, green: 0.9, blue: 0.6 },      // Green - ready for campaign
  'Needs Email': { red: 1, green: 0.9, blue: 0.6 },      // Orange - needs attention
  'New': { red: 0.9, green: 0.9, blue: 0.9 },
  'Verified': { red: 0.8, green: 0.9, blue: 1 },
  'Contacted': { red: 1, green: 0.95, blue: 0.8 },
  'Interested': { red: 0.8, green: 1, blue: 0.8 },
  'Meeting Scheduled': { red: 0.7, green: 0.9, blue: 1 },
  'Converted': { red: 0.4, green: 0.8, blue: 0.4 },
  'Not Interested': { red: 1, green: 0.8, blue: 0.8 },
  'Invalid/Closed': { red: 0.8, green: 0.8, blue: 0.8 }
};

async function getSheets() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth });
}

async function updateStatusDropdown() {
  console.log('🔄 Updating Status dropdown options...\n');
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const spreadsheetId = config.spreadsheetId;
  
  const sheets = await getSheets();
  
  // Get all sheet IDs
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false
  });
  
  const sheetMap = {};
  for (const sheet of metadata.data.sheets) {
    sheetMap[sheet.properties.title] = sheet.properties.sheetId;
  }
  
  const regionalSheets = Object.entries(sheetMap).filter(
    ([name]) => name !== 'Summary'
  );
  
  console.log(`📑 Updating ${regionalSheets.length} sheets...\n`);
  
  const requests = [];
  
  for (const [sheetName, sheetId] of regionalSheets) {
    // Update data validation for Status column (Column S = index 18)
    requests.push({
      setDataValidation: {
        range: { 
          sheetId, 
          startColumnIndex: 18, 
          endColumnIndex: 19, 
          startRowIndex: 1 
        },
        rule: {
          condition: { 
            type: 'ONE_OF_LIST', 
            values: STATUS_OPTIONS.map(v => ({ userEnteredValue: v })) 
          },
          showCustomUi: true,
          strict: false
        }
      }
    });
    
    // Clear existing conditional formatting for status column
    // Then add new ones
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 18, endColumnIndex: 19 }],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: status }] },
              format: { backgroundColor: color }
            }
          },
          index: 0
        }
      });
    }
  }
  
  // Execute batch update
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests }
  });
  
  console.log('✅ Status dropdown updated with new options:');
  STATUS_OPTIONS.forEach(s => console.log(`   • ${s}`));
  console.log('\n🎨 Conditional formatting applied:');
  console.log('   • Qualified = Green (ready for email campaign)');
  console.log('   • Needs Email = Orange (has phone, needs email)');
  console.log('\n🎉 Done!');
}

updateStatusDropdown().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * PlataPay Maps Leads - Regional Spreadsheet Setup
 * Creates a dedicated spreadsheet for Google Maps scraped leads
 * Organized by Philippine regions with standardized fields
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

// Philippine Regions Configuration
const REGIONS = [
  { name: 'NCR', title: 'NCR (Metro Manila)', color: { red: 0.2, green: 0.4, blue: 0.8 } },
  { name: 'Region I', title: 'Region I (Ilocos)', color: { red: 0.8, green: 0.2, blue: 0.2 } },
  { name: 'Region II', title: 'Region II (Cagayan Valley)', color: { red: 0.2, green: 0.6, blue: 0.4 } },
  { name: 'Region III', title: 'Region III (Central Luzon)', color: { red: 0.6, green: 0.4, blue: 0.2 } },
  { name: 'Region IV-A', title: 'Region IV-A (CALABARZON)', color: { red: 0.4, green: 0.2, blue: 0.6 } },
  { name: 'Region IV-B', title: 'Region IV-B (MIMAROPA)', color: { red: 0.2, green: 0.8, blue: 0.6 } },
  { name: 'Region V', title: 'Region V (Bicol)', color: { red: 0.8, green: 0.6, blue: 0.2 } },
  { name: 'Region VI', title: 'Region VI (Western Visayas)', color: { red: 0.4, green: 0.6, blue: 0.8 } },
  { name: 'Region VII', title: 'Region VII (Central Visayas)', color: { red: 0.6, green: 0.2, blue: 0.4 } },
  { name: 'Region VIII', title: 'Region VIII (Eastern Visayas)', color: { red: 0.2, green: 0.4, blue: 0.4 } },
  { name: 'Region IX', title: 'Region IX (Zamboanga)', color: { red: 0.8, green: 0.4, blue: 0.6 } },
  { name: 'Region X', title: 'Region X (Northern Mindanao)', color: { red: 0.4, green: 0.8, blue: 0.4 } },
  { name: 'Region XI', title: 'Region XI (Davao)', color: { red: 0.6, green: 0.6, blue: 0.2 } },
  { name: 'Region XII', title: 'Region XII (SOCCSKSARGEN)', color: { red: 0.2, green: 0.2, blue: 0.6 } },
  { name: 'Region XIII', title: 'Region XIII (Caraga)', color: { red: 0.8, green: 0.8, blue: 0.4 } },
  { name: 'CAR', title: 'CAR (Cordillera)', color: { red: 0.4, green: 0.4, blue: 0.8 } },
  { name: 'BARMM', title: 'BARMM (Bangsamoro)', color: { red: 0.6, green: 0.8, blue: 0.6 } },
  { name: 'Summary', title: 'Summary Dashboard', color: { red: 0.1, green: 0.1, blue: 0.1 } }
];

// Standard headers for each regional tab
const HEADERS = [
  'Lead ID',
  'Business Name',
  'Business Type',
  'Address',
  'City/Municipality',
  'Province',
  'Phone',
  'Email',
  'Website',
  'Rating',
  'Reviews Count',
  'Google Maps URL',
  'Plus Code',
  'Latitude',
  'Longitude',
  'Operating Hours',
  'Scrape Date',
  'Scrape Source',
  'Status',
  'Priority',
  'Assigned To',
  'Contact Date',
  'Follow-up Date',
  'Conversion Date',
  'Notes',
  'Tags'
];

// Business types for dropdown
const BUSINESS_TYPES = [
  'Sari-sari Store',
  'Convenience Store',
  'Payment Center',
  'Remittance Center',
  'Pawnshop',
  'Loading Station',
  'Internet Cafe',
  'Pharmacy',
  'Hardware Store',
  'Grocery Store',
  'Water Refilling Station',
  'Laundry Shop',
  'Computer Shop',
  'Mobile Phone Shop',
  'General Merchandise',
  'Cooperative',
  'Rural Bank',
  'Microfinance',
  'Other'
];

// Status options
const STATUS_OPTIONS = [
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

// Priority options
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

// Scrape source options
const SCRAPE_SOURCES = [
  'Google Places API',
  'SerpAPI',
  'Web Scrape',
  'Manual Entry',
  'Referral',
  'Facebook',
  'Other'
];

async function getAuth() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  return auth;
}

async function createSpreadsheet() {
  console.log('🗺️  Creating PlataPay Maps Leads - Regional Spreadsheet...\n');
  
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  
  // Create spreadsheet with all regional tabs
  const sheetRequests = REGIONS.map((region, index) => ({
    properties: {
      title: region.name,
      index: index,
      tabColor: region.color,
      gridProperties: {
        frozenRowCount: 1,
        frozenColumnCount: 2
      }
    }
  }));
  
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'PlataPay Maps Leads - Regional',
        locale: 'en_US',
        timeZone: 'Asia/Manila'
      },
      sheets: sheetRequests
    }
  });
  
  const spreadsheetId = createResponse.data.spreadsheetId;
  const spreadsheetUrl = createResponse.data.spreadsheetUrl;
  
  console.log(`✅ Spreadsheet created: ${spreadsheetId}`);
  console.log(`🔗 URL: ${spreadsheetUrl}\n`);
  
  // Get sheet IDs
  const sheetIds = {};
  createResponse.data.sheets.forEach(sheet => {
    sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  });
  
  // Add headers to all regional tabs (except Summary)
  const headerRequests = [];
  for (const region of REGIONS) {
    if (region.name === 'Summary') continue;
    
    headerRequests.push({
      range: `'${region.name}'!A1:Z1`,
      values: [HEADERS]
    });
  }
  
  // Add Summary dashboard headers
  headerRequests.push({
    range: "'Summary'!A1:H1",
    values: [['Region', 'Total Leads', 'New', 'Contacted', 'Interested', 'Converted', 'Conversion Rate', 'Last Updated']]
  });
  
  // Add summary formulas for each region
  const summaryFormulas = REGIONS
    .filter(r => r.name !== 'Summary')
    .map((region, idx) => [
      region.title,
      `=COUNTA('${region.name}'!A:A)-1`,
      `=COUNTIF('${region.name}'!S:S,"New")`,
      `=COUNTIF('${region.name}'!S:S,"Contacted")`,
      `=COUNTIF('${region.name}'!S:S,"Interested")`,
      `=COUNTIF('${region.name}'!S:S,"Converted")`,
      `=IF(B${idx+2}>0,F${idx+2}/B${idx+2},0)`,
      `=NOW()`
    ]);
  
  headerRequests.push({
    range: "'Summary'!A2:H18",
    values: summaryFormulas
  });
  
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: headerRequests
    }
  });
  
  console.log('✅ Headers added to all tabs\n');
  
  // Apply formatting and data validation
  const formatRequests = [];
  
  for (const region of REGIONS) {
    const sheetId = sheetIds[region.name];
    
    if (region.name === 'Summary') {
      // Summary tab formatting
      formatRequests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat'
        }
      });
      
      // Conversion rate as percentage
      formatRequests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 6, endColumnIndex: 7, startRowIndex: 1 },
          cell: {
            userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } }
          },
          fields: 'userEnteredFormat.numberFormat'
        }
      });
      
      continue;
    }
    
    // Header row formatting
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: region.color,
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
            wrapStrategy: 'WRAP'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
    
    // Auto-resize columns
    formatRequests.push({
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 26 }
      }
    });
    
    // Data validation: Business Type (Column C)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId, startColumnIndex: 2, endColumnIndex: 3, startRowIndex: 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: BUSINESS_TYPES.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false
        }
      }
    });
    
    // Data validation: Status (Column S)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId, startColumnIndex: 18, endColumnIndex: 19, startRowIndex: 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: STATUS_OPTIONS.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false
        }
      }
    });
    
    // Data validation: Priority (Column T)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId, startColumnIndex: 19, endColumnIndex: 20, startRowIndex: 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: PRIORITY_OPTIONS.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false
        }
      }
    });
    
    // Data validation: Scrape Source (Column R)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId, startColumnIndex: 17, endColumnIndex: 18, startRowIndex: 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: SCRAPE_SOURCES.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false
        }
      }
    });
    
    // Conditional formatting: Status colors
    const statusColors = [
      { status: 'New', color: { red: 0.9, green: 0.9, blue: 0.9 } },
      { status: 'Verified', color: { red: 0.8, green: 0.9, blue: 1 } },
      { status: 'Contacted', color: { red: 1, green: 0.95, blue: 0.8 } },
      { status: 'Interested', color: { red: 0.8, green: 1, blue: 0.8 } },
      { status: 'Meeting Scheduled', color: { red: 0.7, green: 0.9, blue: 1 } },
      { status: 'Converted', color: { red: 0.6, green: 0.9, blue: 0.6 } },
      { status: 'Not Interested', color: { red: 1, green: 0.8, blue: 0.8 } },
      { status: 'Invalid/Closed', color: { red: 0.8, green: 0.8, blue: 0.8 } }
    ];
    
    statusColors.forEach(({ status, color }) => {
      formatRequests.push({
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
    });
    
    // Priority colors
    const priorityColors = [
      { priority: 'High', color: { red: 1, green: 0.8, blue: 0.8 } },
      { priority: 'Medium', color: { red: 1, green: 1, blue: 0.8 } },
      { priority: 'Low', color: { red: 0.9, green: 0.9, blue: 0.9 } }
    ];
    
    priorityColors.forEach(({ priority, color }) => {
      formatRequests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 19, endColumnIndex: 20 }],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: priority }] },
              format: { backgroundColor: color }
            }
          },
          index: 0
        }
      });
    });
  }
  
  // Apply all formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests }
  });
  
  console.log('✅ Formatting and data validation applied\n');
  
  // Share with Boss Marc's email
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: 'mragbay@gmail.com'
      }
    });
    console.log('✅ Shared with mragbay@gmail.com\n');
  } catch (err) {
    console.log('⚠️  Could not auto-share (may need manual sharing)\n');
  }
  
  // Save spreadsheet ID for future use
  const config = {
    spreadsheetId,
    spreadsheetUrl,
    createdAt: new Date().toISOString(),
    regions: REGIONS.map(r => r.name),
    headers: HEADERS
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'maps-leads-config.json'),
    JSON.stringify(config, null, 2)
  );
  
  console.log('📁 Config saved to maps-leads-config.json\n');
  
  // Print summary
  console.log('═'.repeat(60));
  console.log('📊 PlataPay Maps Leads - Regional Spreadsheet');
  console.log('═'.repeat(60));
  console.log(`\n🆔 Spreadsheet ID: ${spreadsheetId}`);
  console.log(`🔗 URL: ${spreadsheetUrl}`);
  console.log(`\n📑 Tabs Created: ${REGIONS.length}`);
  REGIONS.forEach(r => console.log(`   • ${r.title}`));
  console.log(`\n📋 Fields per lead: ${HEADERS.length}`);
  console.log(`\n✅ Ready to receive scraped leads!\n`);
  
  return { spreadsheetId, spreadsheetUrl };
}

// Run if called directly
if (require.main === module) {
  createSpreadsheet()
    .then(result => {
      console.log('🎉 Setup complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { createSpreadsheet, REGIONS, HEADERS, BUSINESS_TYPES, STATUS_OPTIONS };

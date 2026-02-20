#!/usr/bin/env node
/**
 * Sync NCR tab formatting to all other regional tabs
 * Copies column widths, row heights, and other spacing from NCR
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');
const CONFIG_PATH = path.join(__dirname, '../webhook-server/maps-leads-config.json');

async function getSheets() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth });
}

async function syncFormatting() {
  console.log('🔄 Syncing NCR formatting to all regional tabs...\n');
  
  // Load config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ Could not load maps-leads-config.json');
    process.exit(1);
  }
  
  const spreadsheetId = config.spreadsheetId;
  console.log(`📊 Spreadsheet: ${spreadsheetId}\n`);
  
  const sheets = await getSheets();
  
  // Get spreadsheet metadata to find sheet IDs
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false
  });
  
  // Get NCR grid data separately
  const ncrData = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: true,
    ranges: ['NCR!1:2']
  });
  
  // Build sheet ID map
  const sheetMap = {};
  for (const sheet of metadata.data.sheets) {
    sheetMap[sheet.properties.title] = sheet.properties.sheetId;
  }
  
  console.log('📑 Found sheets:');
  Object.keys(sheetMap).forEach(name => console.log(`   • ${name}`));
  console.log('');
  
  // Get NCR column widths from the grid data
  const ncrSheet = ncrData.data.sheets.find(s => s.properties.title === 'NCR');
  if (!ncrSheet || !ncrSheet.data || !ncrSheet.data[0]) {
    console.error('❌ Could not get NCR sheet data');
    process.exit(1);
  }
  
  const columnMetadata = ncrSheet.data[0].columnMetadata || [];
  console.log(`📏 NCR has ${columnMetadata.length} columns with widths:`);
  
  const columnWidths = columnMetadata.map((col, idx) => {
    const width = col.pixelSize || 100;
    return { index: idx, width };
  });
  
  // Show first few column widths
  columnWidths.slice(0, 10).forEach(col => {
    console.log(`   Column ${col.index}: ${col.width}px`);
  });
  console.log('   ...\n');
  
  // Get row heights
  const rowMetadata = ncrSheet.data[0].rowMetadata || [];
  const headerRowHeight = rowMetadata[0]?.pixelSize || 21;
  console.log(`📐 Header row height: ${headerRowHeight}px\n`);
  
  // Regional tabs to update (exclude NCR and Summary)
  const regionsToUpdate = Object.keys(sheetMap).filter(
    name => name !== 'NCR' && name !== 'Summary'
  );
  
  console.log(`🎯 Updating ${regionsToUpdate.length} regional tabs...\n`);
  
  // Build batch update requests
  const requests = [];
  
  for (const regionName of regionsToUpdate) {
    const sheetId = sheetMap[regionName];
    
    // Update column widths
    for (const col of columnWidths) {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: col.index,
            endIndex: col.index + 1
          },
          properties: {
            pixelSize: col.width
          },
          fields: 'pixelSize'
        }
      });
    }
    
    // Update header row height
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1
        },
        properties: {
          pixelSize: headerRowHeight
        },
        fields: 'pixelSize'
      }
    });
  }
  
  // Execute batch update
  if (requests.length > 0) {
    console.log(`📤 Sending ${requests.length} formatting updates...`);
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
    
    console.log('\n✅ Formatting synced to all regional tabs!');
  } else {
    console.log('⚠️  No updates needed');
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Formatting Sync Complete');
  console.log('═'.repeat(50));
  console.log(`\n✅ Updated ${regionsToUpdate.length} tabs with NCR formatting`);
  console.log('\nRegions updated:');
  regionsToUpdate.forEach(r => console.log(`   • ${r}`));
}

syncFormatting()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });

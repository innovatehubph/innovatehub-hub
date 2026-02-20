// Add Conversations and Tasks tabs to PlataPay Leads Tracker
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SHEET_ID = '1tJMLWrGUkraYERwAOeJ6l1WfSfOZ0C9CK1OajeQh0kA';
const TOKEN_PATH = path.join(process.env.HOME, '.config/google-workspace-mcp/tokens.json');

async function addTabs() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Add Conversations tab
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Conversations',
                gridProperties: { rowCount: 1000, columnCount: 12 }
              }
            }
          },
          {
            addSheet: {
              properties: {
                title: 'Tasks',
                gridProperties: { rowCount: 1000, columnCount: 10 }
              }
            }
          }
        ]
      }
    });
    console.log('✅ Added Conversations and Tasks tabs');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️ Tabs already exist');
    } else {
      throw err;
    }
  }
  
  // Add headers to Conversations
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Conversations!A1:L1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Timestamp', 'Contact ID', 'Name', 'Platform', 'Direction', 'Message', 'Intent', 'Sentiment', 'Response', 'Response Time', 'Agent', 'Session ID']]
    }
  });
  console.log('✅ Added Conversations headers');
  
  // Add headers to Tasks
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Tasks!A1:J1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Task ID', 'Created', 'Contact ID', 'Name', 'Type', 'Description', 'Due Date', 'Priority', 'Status', 'Completed']]
    }
  });
  console.log('✅ Added Tasks headers');
}

addTabs().catch(console.error);

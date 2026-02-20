/**
 * InnovateHub/PlataPay Lead & Campaign Tracker
 * Google Apps Script - Paste into Extensions > Apps Script
 * 
 * Run: setupSheet() to initialize
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Sheet structure
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  
  // Column headers
  HEADERS: [
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
  
  // Dropdown options
  STATUS_OPTIONS: [
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
  
  EMAIL_TYPE_OPTIONS: [
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
  
  CAMPAIGN_OPTIONS: [
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
  
  SOURCE_OPTIONS: [
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
  ],
  
  // Colors
  COLORS: {
    HEADER_BG: '#1a73e8',      // Blue
    HEADER_TEXT: '#ffffff',    // White
    ALTERNATE_ROW: '#f8f9fa',  // Light gray
    STATUS_NEW: '#e8f5e9',     // Light green
    STATUS_CONTACTED: '#fff3e0', // Light orange
    STATUS_QUALIFIED: '#e3f2fd', // Light blue
    STATUS_CONVERTED: '#c8e6c9', // Green
    STATUS_LOST: '#ffcdd2',    // Light red
    BORDER: '#dadce0'          // Gray border
  }
};

// ============================================
// MAIN SETUP FUNCTION
// ============================================
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  
  // Set up headers
  setupHeaders(sheet);
  
  // Set up dropdowns
  setupDropdowns(sheet);
  
  // Apply styling
  applyStyles(sheet);
  
  // Set up conditional formatting
  setupConditionalFormatting(sheet);
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, CONFIG.HEADERS.length);
  
  // Add timestamp trigger
  setupTriggers();
  
  SpreadsheetApp.getUi().alert('✅ Sheet setup complete!\n\nFeatures added:\n• Status dropdown\n• Email Type dropdown\n• Campaign dropdown\n• Source dropdown\n• Color coding\n• Auto-timestamps');
}

// ============================================
// HEADER SETUP
// ============================================
function setupHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
  
  // Clear and set headers
  headerRange.setValues([CONFIG.HEADERS]);
  
  // Style headers
  headerRange
    .setBackground(CONFIG.COLORS.HEADER_BG)
    .setFontColor(CONFIG.COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  
  // Set row height
  sheet.setRowHeight(1, 40);
}

// ============================================
// DROPDOWN SETUP
// ============================================
function setupDropdowns(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 100); // At least 100 rows
  
  // Status dropdown (Column G)
  const statusCol = CONFIG.HEADERS.indexOf('Status') + 1;
  if (statusCol > 0) {
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.STATUS_OPTIONS, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, statusCol, lastRow - 1, 1).setDataValidation(statusRule);
  }
  
  // Email Type dropdown (Column H)
  const emailTypeCol = CONFIG.HEADERS.indexOf('Email Type') + 1;
  if (emailTypeCol > 0) {
    const emailTypeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.EMAIL_TYPE_OPTIONS, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, emailTypeCol, lastRow - 1, 1).setDataValidation(emailTypeRule);
  }
  
  // Campaign dropdown (Column I)
  const campaignCol = CONFIG.HEADERS.indexOf('Campaign') + 1;
  if (campaignCol > 0) {
    const campaignRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.CAMPAIGN_OPTIONS, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, campaignCol, lastRow - 1, 1).setDataValidation(campaignRule);
  }
  
  // Source dropdown (Column F)
  const sourceCol = CONFIG.HEADERS.indexOf('Source') + 1;
  if (sourceCol > 0) {
    const sourceRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.SOURCE_OPTIONS, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, sourceCol, lastRow - 1, 1).setDataValidation(sourceRule);
  }
}

// ============================================
// STYLING
// ============================================
function applyStyles(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 100);
  const dataRange = sheet.getRange(1, 1, lastRow, CONFIG.HEADERS.length);
  
  // Set borders
  dataRange.setBorder(
    true, true, true, true, true, true,
    CONFIG.COLORS.BORDER,
    SpreadsheetApp.BorderStyle.SOLID
  );
  
  // Set font
  dataRange.setFontFamily('Google Sans, Arial, sans-serif');
  dataRange.setFontSize(10);
  
  // Alternating row colors
  for (let i = 2; i <= lastRow; i += 2) {
    sheet.getRange(i, 1, 1, CONFIG.HEADERS.length)
      .setBackground(CONFIG.COLORS.ALTERNATE_ROW);
  }
  
  // Column widths
  const columnWidths = {
    'Lead ID': 100,
    'Name': 150,
    'Email': 200,
    'Phone': 130,
    'Location': 120,
    'Source': 130,
    'Status': 110,
    'Email Type': 150,
    'Campaign': 160,
    'Last Contact': 120,
    'Next Follow-up': 120,
    'Notes': 250,
    'Created Date': 120,
    'Updated Date': 120
  };
  
  CONFIG.HEADERS.forEach((header, index) => {
    if (columnWidths[header]) {
      sheet.setColumnWidth(index + 1, columnWidths[header]);
    }
  });
}

// ============================================
// CONDITIONAL FORMATTING
// ============================================
function setupConditionalFormatting(sheet) {
  const statusCol = CONFIG.HEADERS.indexOf('Status') + 1;
  const lastRow = Math.max(sheet.getLastRow(), 100);
  const statusRange = sheet.getRange(2, statusCol, lastRow - 1, 1);
  
  // Clear existing rules for status column
  const rules = sheet.getConditionalFormatRules();
  
  // Status color rules
  const statusColors = [
    { status: 'New', color: '#e8f5e9' },
    { status: 'Contacted', color: '#fff3e0' },
    { status: 'Qualified', color: '#e3f2fd' },
    { status: 'Proposal Sent', color: '#f3e5f5' },
    { status: 'Negotiation', color: '#fce4ec' },
    { status: 'Converted', color: '#c8e6c9' },
    { status: 'Lost', color: '#ffcdd2' },
    { status: 'On Hold', color: '#fff9c4' },
    { status: 'Unresponsive', color: '#f5f5f5' }
  ];
  
  const newRules = statusColors.map(item => {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(item.status)
      .setBackground(item.color)
      .setRanges([statusRange])
      .build();
  });
  
  sheet.setConditionalFormatRules([...rules, ...newRules]);
}

// ============================================
// AUTO-TIMESTAMP ON EDIT
// ============================================
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Skip header row
  if (row === 1) return;
  
  // Find column indices
  const headers = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).getValues()[0];
  const createdCol = headers.indexOf('Created Date') + 1;
  const updatedCol = headers.indexOf('Updated Date') + 1;
  
  const now = new Date();
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  
  // Set Created Date if empty
  if (createdCol > 0) {
    const createdCell = sheet.getRange(row, createdCol);
    if (!createdCell.getValue()) {
      createdCell.setValue(timestamp);
    }
  }
  
  // Always update Updated Date
  if (updatedCol > 0) {
    sheet.getRange(row, updatedCol).setValue(timestamp);
  }
}

// ============================================
// TRIGGERS
// ============================================
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Note: onEdit is a simple trigger, doesn't need manual setup
  // It runs automatically on any edit
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function addNewLead(name, email, phone, location, source) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  
  const lastRow = sheet.getLastRow() + 1;
  const leadId = 'LEAD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  
  const newRow = [
    leadId,
    name || '',
    email || '',
    phone || '',
    location || '',
    source || 'Facebook Messenger',
    'New',
    'None',
    'None',
    timestamp,
    '',
    '',
    timestamp,
    timestamp
  ];
  
  sheet.getRange(lastRow, 1, 1, newRow.length).setValues([newRow]);
  
  return leadId;
}

// Dashboard summary
function getDashboardSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const statusCol = headers.indexOf('Status');
  const campaignCol = headers.indexOf('Campaign');
  
  const summary = {
    total: data.length - 1,
    byStatus: {},
    byCampaign: {}
  };
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol] || 'Unknown';
    const campaign = data[i][campaignCol] || 'None';
    
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    summary.byCampaign[campaign] = (summary.byCampaign[campaign] || 0) + 1;
  }
  
  return summary;
}

// Menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 InnovateHub')
    .addItem('Setup Sheet', 'setupSheet')
    .addItem('Dashboard Summary', 'showDashboard')
    .addSeparator()
    .addItem('Export to JSON', 'exportToJson')
    .addToUi();
}

function showDashboard() {
  const summary = getDashboardSummary();
  let message = `📊 LEAD DASHBOARD\n\n`;
  message += `Total Leads: ${summary.total}\n\n`;
  message += `BY STATUS:\n`;
  Object.entries(summary.byStatus).forEach(([status, count]) => {
    message += `  • ${status}: ${count}\n`;
  });
  message += `\nBY CAMPAIGN:\n`;
  Object.entries(summary.byCampaign).forEach(([campaign, count]) => {
    message += `  • ${campaign}: ${count}\n`;
  });
  
  SpreadsheetApp.getUi().alert(message);
}

function exportToJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const jsonData = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // Skip empty rows
    const row = {};
    headers.forEach((header, index) => {
      row[header] = data[i][index];
    });
    jsonData.push(row);
  }
  
  const json = JSON.stringify(jsonData, null, 2);
  const html = HtmlService.createHtmlOutput(`<pre>${json}</pre>`)
    .setWidth(600)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'JSON Export');
}

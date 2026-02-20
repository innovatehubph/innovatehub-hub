/**
 * PlataPay Maps Leads - Regional Spreadsheet Setup
 * 
 * HOW TO USE:
 * 1. Go to https://script.google.com
 * 2. Create new project
 * 3. Paste this entire script
 * 4. Click Run > createMapsLeadsSpreadsheet
 * 5. Authorize when prompted
 * 6. Copy the spreadsheet ID from the logs
 */

// Philippine Regions Configuration
const REGIONS = [
  { name: 'NCR', title: 'NCR (Metro Manila)', color: '#3366CC' },
  { name: 'Region I', title: 'Region I (Ilocos)', color: '#CC3333' },
  { name: 'Region II', title: 'Region II (Cagayan Valley)', color: '#339966' },
  { name: 'Region III', title: 'Region III (Central Luzon)', color: '#996633' },
  { name: 'Region IV-A', title: 'Region IV-A (CALABARZON)', color: '#663399' },
  { name: 'Region IV-B', title: 'Region IV-B (MIMAROPA)', color: '#33CC99' },
  { name: 'Region V', title: 'Region V (Bicol)', color: '#CC9933' },
  { name: 'Region VI', title: 'Region VI (Western Visayas)', color: '#6699CC' },
  { name: 'Region VII', title: 'Region VII (Central Visayas)', color: '#993366' },
  { name: 'Region VIII', title: 'Region VIII (Eastern Visayas)', color: '#336666' },
  { name: 'Region IX', title: 'Region IX (Zamboanga)', color: '#CC6699' },
  { name: 'Region X', title: 'Region X (Northern Mindanao)', color: '#66CC66' },
  { name: 'Region XI', title: 'Region XI (Davao)', color: '#999933' },
  { name: 'Region XII', title: 'Region XII (SOCCSKSARGEN)', color: '#333399' },
  { name: 'Region XIII', title: 'Region XIII (Caraga)', color: '#CCCC66' },
  { name: 'CAR', title: 'CAR (Cordillera)', color: '#6666CC' },
  { name: 'BARMM', title: 'BARMM (Bangsamoro)', color: '#99CC99' },
  { name: 'Summary', title: 'Summary Dashboard', color: '#1a1a1a' }
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

// Dropdown options
const BUSINESS_TYPES = [
  'Sari-sari Store', 'Convenience Store', 'Payment Center', 'Remittance Center',
  'Pawnshop', 'Loading Station', 'Internet Cafe', 'Pharmacy', 'Hardware Store',
  'Grocery Store', 'Water Refilling Station', 'Laundry Shop', 'Computer Shop',
  'Mobile Phone Shop', 'General Merchandise', 'Cooperative', 'Rural Bank',
  'Microfinance', 'Other'
];

const STATUS_OPTIONS = [
  'New', 'Verified', 'Contacted', 'Interested', 'Meeting Scheduled',
  'Proposal Sent', 'Negotiation', 'Converted', 'Not Interested',
  'Invalid/Closed', 'Duplicate', 'On Hold'
];

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

const SCRAPE_SOURCES = [
  'Google Places API', 'SerpAPI', 'Web Scrape', 'Manual Entry',
  'Referral', 'Facebook', 'Other'
];

function createMapsLeadsSpreadsheet() {
  // Create new spreadsheet
  const ss = SpreadsheetApp.create('PlataPay Maps Leads - Regional');
  const spreadsheetId = ss.getId();
  const spreadsheetUrl = ss.getUrl();
  
  Logger.log('📊 Created spreadsheet: ' + spreadsheetId);
  Logger.log('🔗 URL: ' + spreadsheetUrl);
  
  // Remove default Sheet1
  const defaultSheet = ss.getSheetByName('Sheet1');
  
  // Create regional tabs
  REGIONS.forEach((region, index) => {
    let sheet;
    if (index === 0 && defaultSheet) {
      // Rename Sheet1 for first region
      defaultSheet.setName(region.name);
      sheet = defaultSheet;
    } else {
      sheet = ss.insertSheet(region.name);
    }
    
    // Set tab color
    sheet.setTabColor(region.color);
    
    if (region.name === 'Summary') {
      setupSummaryTab(sheet);
    } else {
      setupRegionalTab(sheet, region);
    }
  });
  
  // Set timezone
  ss.setSpreadsheetTimeZone('Asia/Manila');
  
  // Log final info
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('✅ PlataPay Maps Leads - Regional Spreadsheet Created!');
  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('');
  Logger.log('📋 Spreadsheet ID: ' + spreadsheetId);
  Logger.log('🔗 URL: ' + spreadsheetUrl);
  Logger.log('');
  Logger.log('📑 Tabs created: ' + REGIONS.length);
  Logger.log('📋 Fields per lead: ' + HEADERS.length);
  Logger.log('');
  Logger.log('👉 Copy the Spreadsheet ID above for your server config!');
  
  return { spreadsheetId, spreadsheetUrl };
}

function setupRegionalTab(sheet, region) {
  // Add headers
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  
  // Format header row
  headerRange
    .setBackground(region.color)
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setWrap(true);
  
  // Freeze header row and first 2 columns
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // Lead ID
  sheet.setColumnWidth(2, 200);  // Business Name
  sheet.setColumnWidth(3, 150);  // Business Type
  sheet.setColumnWidth(4, 250);  // Address
  sheet.setColumnWidth(5, 150);  // City
  sheet.setColumnWidth(6, 120);  // Province
  sheet.setColumnWidth(7, 120);  // Phone
  sheet.setColumnWidth(8, 180);  // Email
  sheet.setColumnWidth(9, 150);  // Website
  sheet.setColumnWidth(10, 60);  // Rating
  sheet.setColumnWidth(11, 80);  // Reviews
  sheet.setColumnWidth(12, 200); // Maps URL
  sheet.setColumnWidth(13, 100); // Plus Code
  sheet.setColumnWidth(14, 80);  // Lat
  sheet.setColumnWidth(15, 80);  // Lng
  sheet.setColumnWidth(16, 150); // Hours
  sheet.setColumnWidth(17, 100); // Scrape Date
  sheet.setColumnWidth(18, 120); // Scrape Source
  sheet.setColumnWidth(19, 120); // Status
  sheet.setColumnWidth(20, 80);  // Priority
  sheet.setColumnWidth(21, 120); // Assigned To
  sheet.setColumnWidth(22, 100); // Contact Date
  sheet.setColumnWidth(23, 100); // Follow-up Date
  sheet.setColumnWidth(24, 100); // Conversion Date
  sheet.setColumnWidth(25, 250); // Notes
  sheet.setColumnWidth(26, 150); // Tags
  
  // Data validation for Business Type (Column C)
  const businessTypeRange = sheet.getRange(2, 3, 1000, 1);
  const businessTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(BUSINESS_TYPES, true)
    .setAllowInvalid(true)
    .build();
  businessTypeRange.setDataValidation(businessTypeRule);
  
  // Data validation for Status (Column S)
  const statusRange = sheet.getRange(2, 19, 1000, 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);
  
  // Data validation for Priority (Column T)
  const priorityRange = sheet.getRange(2, 20, 1000, 1);
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PRIORITY_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  priorityRange.setDataValidation(priorityRule);
  
  // Data validation for Scrape Source (Column R)
  const sourceRange = sheet.getRange(2, 18, 1000, 1);
  const sourceRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(SCRAPE_SOURCES, true)
    .setAllowInvalid(true)
    .build();
  sourceRange.setDataValidation(sourceRule);
  
  // Conditional formatting for Status
  const statusColors = {
    'New': '#E8E8E8',
    'Verified': '#CCE5FF',
    'Contacted': '#FFF2CC',
    'Interested': '#CCFFCC',
    'Meeting Scheduled': '#B3D9FF',
    'Converted': '#99E699',
    'Not Interested': '#FFCCCC',
    'Invalid/Closed': '#CCCCCC'
  };
  
  Object.entries(statusColors).forEach(([status, color]) => {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(status)
      .setBackground(color)
      .setRanges([sheet.getRange(2, 19, 1000, 1)])
      .build();
    const rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
  });
  
  // Conditional formatting for Priority
  const priorityColors = {
    'High': '#FFCCCC',
    'Medium': '#FFFFCC',
    'Low': '#E8E8E8'
  };
  
  Object.entries(priorityColors).forEach(([priority, color]) => {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(priority)
      .setBackground(color)
      .setRanges([sheet.getRange(2, 20, 1000, 1)])
      .build();
    const rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
  });
}

function setupSummaryTab(sheet) {
  // Summary headers
  const summaryHeaders = ['Region', 'Total Leads', 'New', 'Contacted', 'Interested', 'Converted', 'Conversion Rate', 'Last Updated'];
  sheet.getRange(1, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  
  // Format header
  sheet.getRange(1, 1, 1, summaryHeaders.length)
    .setBackground('#1a1a1a')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Add formulas for each region
  const regionalSheets = REGIONS.filter(r => r.name !== 'Summary');
  const summaryData = regionalSheets.map((region, idx) => {
    const row = idx + 2;
    return [
      region.title,
      `=COUNTA('${region.name}'!A:A)-1`,
      `=COUNTIF('${region.name}'!S:S,"New")`,
      `=COUNTIF('${region.name}'!S:S,"Contacted")`,
      `=COUNTIF('${region.name}'!S:S,"Interested")`,
      `=COUNTIF('${region.name}'!S:S,"Converted")`,
      `=IF(B${row}>0,F${row}/B${row},0)`,
      `=NOW()`
    ];
  });
  
  sheet.getRange(2, 1, summaryData.length, summaryHeaders.length).setValues(summaryData);
  
  // Format conversion rate as percentage
  sheet.getRange(2, 7, summaryData.length, 1).setNumberFormat('0.0%');
  
  // Format last updated as datetime
  sheet.getRange(2, 8, summaryData.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  
  // Set column widths
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 150);
  
  // Add totals row
  const totalsRow = summaryData.length + 2;
  sheet.getRange(totalsRow, 1, 1, 8).setValues([[
    'TOTAL',
    `=SUM(B2:B${totalsRow-1})`,
    `=SUM(C2:C${totalsRow-1})`,
    `=SUM(D2:D${totalsRow-1})`,
    `=SUM(E2:E${totalsRow-1})`,
    `=SUM(F2:F${totalsRow-1})`,
    `=IF(B${totalsRow}>0,F${totalsRow}/B${totalsRow},0)`,
    ''
  ]]);
  
  sheet.getRange(totalsRow, 1, 1, 8)
    .setBackground('#333333')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  
  sheet.getRange(totalsRow, 7).setNumberFormat('0.0%');
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

// Utility function to add sample leads (for testing)
function addSampleLeads() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ncrSheet = ss.getSheetByName('NCR');
  
  if (!ncrSheet) {
    Logger.log('❌ NCR sheet not found');
    return;
  }
  
  const sampleLeads = [
    ['ML001', 'Aling Nena Store', 'Sari-sari Store', '123 Barangay San Antonio', 'Makati', 'Metro Manila', '09171234567', '', '', '4.2', '15', 'https://maps.google.com/?cid=123', 'XXXX+XX', '14.5547', '121.0244', '6AM-10PM', '2026-02-17', 'Google Places API', 'New', 'High', '', '', '', '', 'Near school', 'potential,priority'],
    ['ML002', 'Quick Pay Center', 'Payment Center', '456 Main Street', 'Quezon City', 'Metro Manila', '09189876543', 'quickpay@email.com', '', '4.5', '32', 'https://maps.google.com/?cid=456', 'YYYY+YY', '14.6760', '121.0437', '8AM-8PM', '2026-02-17', 'Google Places API', 'New', 'Medium', '', '', '', '', 'Existing remittance', 'existing-biz'],
    ['ML003', 'Mini Mart Express', 'Convenience Store', '789 Highway Road', 'Pasig', 'Metro Manila', '09201112233', '', 'www.minimartexpress.ph', '4.0', '8', 'https://maps.google.com/?cid=789', 'ZZZZ+ZZ', '14.5764', '121.0851', '24 hours', '2026-02-17', 'Manual Entry', 'Verified', 'High', '', '', '', '', 'High traffic area', 'verified,24hrs']
  ];
  
  ncrSheet.getRange(2, 1, sampleLeads.length, sampleLeads[0].length).setValues(sampleLeads);
  Logger.log('✅ Added ' + sampleLeads.length + ' sample leads to NCR');
}

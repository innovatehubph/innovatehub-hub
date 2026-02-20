/**
 * PlataPay Maps Leads - Regional Integration Module
 * Handles CRUD operations for the regional leads spreadsheet
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration - UPDATE THIS after creating the spreadsheet
let MAPS_LEADS_SHEET_ID = null;
const CONFIG_PATH = path.join(__dirname, 'maps-leads-config.json');
const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

// Load config if exists
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    MAPS_LEADS_SHEET_ID = config.spreadsheetId;
  }
} catch (err) {
  console.log('⚠️  No maps-leads-config.json found');
}

// Region mapping for cities/provinces
const CITY_TO_REGION = {
  // NCR
  'manila': 'NCR', 'quezon city': 'NCR', 'makati': 'NCR', 'pasig': 'NCR',
  'taguig': 'NCR', 'parañaque': 'NCR', 'paranaque': 'NCR', 'las piñas': 'NCR',
  'muntinlupa': 'NCR', 'marikina': 'NCR', 'mandaluyong': 'NCR', 'san juan': 'NCR',
  'pasay': 'NCR', 'caloocan': 'NCR', 'malabon': 'NCR', 'navotas': 'NCR', 'valenzuela': 'NCR',
  
  // Region I - Ilocos
  'laoag': 'Region I', 'vigan': 'Region I', 'san fernando la union': 'Region I',
  'dagupan': 'Region I', 'alaminos': 'Region I', 'ilocos norte': 'Region I',
  'ilocos sur': 'Region I', 'la union': 'Region I', 'pangasinan': 'Region I',
  
  // Region II - Cagayan Valley
  'tuguegarao': 'Region II', 'santiago': 'Region II', 'cauayan': 'Region II',
  'cagayan': 'Region II', 'isabela': 'Region II', 'nueva vizcaya': 'Region II',
  'quirino': 'Region II', 'batanes': 'Region II',
  
  // Region III - Central Luzon
  'angeles': 'Region III', 'san fernando pampanga': 'Region III', 'olongapo': 'Region III',
  'malolos': 'Region III', 'meycauayan': 'Region III', 'cabanatuan': 'Region III',
  'tarlac': 'Region III', 'bulacan': 'Region III', 'pampanga': 'Region III',
  'zambales': 'Region III', 'bataan': 'Region III', 'nueva ecija': 'Region III', 'aurora': 'Region III',
  
  // Region IV-A - CALABARZON
  'batangas': 'Region IV-A', 'lipa': 'Region IV-A', 'tanauan': 'Region IV-A',
  'calamba': 'Region IV-A', 'san pablo': 'Region IV-A', 'santa rosa': 'Region IV-A',
  'biñan': 'Region IV-A', 'cabuyao': 'Region IV-A', 'antipolo': 'Region IV-A',
  'lucena': 'Region IV-A', 'tayabas': 'Region IV-A', 'laguna': 'Region IV-A',
  'cavite': 'Region IV-A', 'rizal': 'Region IV-A', 'quezon': 'Region IV-A',
  
  // Region IV-B - MIMAROPA
  'puerto princesa': 'Region IV-B', 'calapan': 'Region IV-B', 'palawan': 'Region IV-B',
  'oriental mindoro': 'Region IV-B', 'occidental mindoro': 'Region IV-B',
  'marinduque': 'Region IV-B', 'romblon': 'Region IV-B',
  
  // Region V - Bicol
  'legazpi': 'Region V', 'naga': 'Region V', 'sorsogon': 'Region V',
  'albay': 'Region V', 'camarines sur': 'Region V', 'camarines norte': 'Region V',
  'catanduanes': 'Region V', 'masbate': 'Region V',
  
  // Region VI - Western Visayas
  'iloilo': 'Region VI', 'bacolod': 'Region VI', 'roxas': 'Region VI',
  'negros occidental': 'Region VI', 'capiz': 'Region VI', 'aklan': 'Region VI',
  'antique': 'Region VI', 'guimaras': 'Region VI',
  
  // Region VII - Central Visayas
  'cebu': 'Region VII', 'mandaue': 'Region VII', 'lapu-lapu': 'Region VII',
  'bohol': 'Region VII', 'tagbilaran': 'Region VII', 'negros oriental': 'Region VII',
  'dumaguete': 'Region VII', 'siquijor': 'Region VII',
  
  // Region VIII - Eastern Visayas
  'tacloban': 'Region VIII', 'ormoc': 'Region VIII', 'leyte': 'Region VIII',
  'southern leyte': 'Region VIII', 'samar': 'Region VIII', 'eastern samar': 'Region VIII',
  'northern samar': 'Region VIII', 'biliran': 'Region VIII',
  
  // Region IX - Zamboanga
  'zamboanga': 'Region IX', 'dipolog': 'Region IX', 'dapitan': 'Region IX',
  'pagadian': 'Region IX', 'zamboanga del norte': 'Region IX',
  'zamboanga del sur': 'Region IX', 'zamboanga sibugay': 'Region IX',
  
  // Region X - Northern Mindanao
  'cagayan de oro': 'Region X', 'iligan': 'Region X', 'valencia': 'Region X',
  'malaybalay': 'Region X', 'bukidnon': 'Region X', 'misamis oriental': 'Region X',
  'misamis occidental': 'Region X', 'lanao del norte': 'Region X', 'camiguin': 'Region X',
  
  // Region XI - Davao
  'davao': 'Region XI', 'davao city': 'Region XI', 'tagum': 'Region XI',
  'panabo': 'Region XI', 'digos': 'Region XI', 'davao del norte': 'Region XI',
  'davao del sur': 'Region XI', 'davao oriental': 'Region XI',
  'davao occidental': 'Region XI', 'davao de oro': 'Region XI',
  
  // Region XII - SOCCSKSARGEN
  'general santos': 'Region XII', 'gensan': 'Region XII', 'koronadal': 'Region XII',
  'cotabato': 'Region XII', 'south cotabato': 'Region XII', 'north cotabato': 'Region XII',
  'sultan kudarat': 'Region XII', 'sarangani': 'Region XII',
  
  // Region XIII - Caraga
  'butuan': 'Region XIII', 'surigao': 'Region XIII', 'agusan del norte': 'Region XIII',
  'agusan del sur': 'Region XIII', 'surigao del norte': 'Region XIII',
  'surigao del sur': 'Region XIII', 'dinagat islands': 'Region XIII',
  
  // CAR - Cordillera
  'baguio': 'CAR', 'benguet': 'CAR', 'abra': 'CAR', 'apayao': 'CAR',
  'ifugao': 'CAR', 'kalinga': 'CAR', 'mountain province': 'CAR',
  
  // BARMM
  'cotabato city': 'BARMM', 'marawi': 'BARMM', 'lanao del sur': 'BARMM',
  'maguindanao': 'BARMM', 'basilan': 'BARMM', 'sulu': 'BARMM', 'tawi-tawi': 'BARMM'
};

// Auth client cache
let sheetsApi = null;

/**
 * Initialize Google Sheets API
 */
async function getSheets() {
  if (sheetsApi) return sheetsApi;
  
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    sheetsApi = google.sheets({ version: 'v4', auth });
    return sheetsApi;
  } catch (err) {
    console.error('❌ Sheets auth failed:', err.message);
    throw err;
  }
}

/**
 * Set the spreadsheet ID (call after creating the sheet)
 */
function setSpreadsheetId(spreadsheetId) {
  MAPS_LEADS_SHEET_ID = spreadsheetId;
  const config = { spreadsheetId, updatedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Spreadsheet ID set: ${spreadsheetId}`);
}

/**
 * Detect region from city/province
 */
function detectRegion(city, province) {
  const searchTerms = [
    city?.toLowerCase(),
    province?.toLowerCase(),
    `${city} ${province}`.toLowerCase()
  ].filter(Boolean);
  
  for (const term of searchTerms) {
    for (const [key, region] of Object.entries(CITY_TO_REGION)) {
      if (term.includes(key) || key.includes(term)) {
        return region;
      }
    }
  }
  
  // Default to NCR if unknown
  return 'NCR';
}

/**
 * Generate unique lead ID
 */
function generateLeadId(region) {
  const prefix = region.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Format date for sheets
 */
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Add a single lead to the appropriate regional tab
 */
async function addLead(lead) {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured. Run setSpreadsheetId() first.');
  }
  
  const sheets = await getSheets();
  const region = lead.region || detectRegion(lead.city, lead.province);
  const leadId = lead.leadId || generateLeadId(region);
  
  const row = [
    leadId,                                  // Lead ID
    lead.businessName || '',                 // Business Name
    lead.businessType || '',                 // Business Type
    lead.address || '',                      // Address
    lead.city || '',                         // City/Municipality
    lead.province || '',                     // Province
    lead.phone || '',                        // Phone
    lead.email || '',                        // Email
    lead.website || '',                      // Website
    lead.rating || '',                       // Rating
    lead.reviewsCount || '',                 // Reviews Count
    lead.mapsUrl || '',                      // Google Maps URL
    lead.plusCode || '',                     // Plus Code
    lead.latitude || '',                     // Latitude
    lead.longitude || '',                    // Longitude
    lead.operatingHours || '',               // Operating Hours
    formatDate(),                            // Scrape Date
    lead.scrapeSource || 'Google Places API', // Scrape Source
    lead.status || 'New',                    // Status
    lead.priority || 'Medium',               // Priority
    lead.assignedTo || '',                   // Assigned To
    lead.contactDate || '',                  // Contact Date
    lead.followUpDate || '',                 // Follow-up Date
    lead.conversionDate || '',               // Conversion Date
    lead.notes || '',                        // Notes
    lead.tags || ''                          // Tags
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    range: `'${region}'!A:Z`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  console.log(`✅ Lead added to ${region}: ${leadId} - ${lead.businessName}`);
  return { success: true, leadId, region, businessName: lead.businessName };
}

/**
 * Add multiple leads (batch operation)
 */
async function addLeads(leads) {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured. Run setSpreadsheetId() first.');
  }
  
  const sheets = await getSheets();
  const results = { success: 0, failed: 0, byRegion: {} };
  
  // Group leads by region
  const leadsByRegion = {};
  for (const lead of leads) {
    const region = lead.region || detectRegion(lead.city, lead.province);
    if (!leadsByRegion[region]) leadsByRegion[region] = [];
    
    const leadId = lead.leadId || generateLeadId(region);
    leadsByRegion[region].push([
      leadId,
      lead.businessName || '',
      lead.businessType || '',
      lead.address || '',
      lead.city || '',
      lead.province || '',
      lead.phone || '',
      lead.email || '',
      lead.website || '',
      lead.rating || '',
      lead.reviewsCount || '',
      lead.mapsUrl || '',
      lead.plusCode || '',
      lead.latitude || '',
      lead.longitude || '',
      lead.operatingHours || '',
      formatDate(),
      lead.scrapeSource || 'Google Places API',
      lead.status || 'New',
      lead.priority || 'Medium',
      lead.assignedTo || '',
      lead.contactDate || '',
      lead.followUpDate || '',
      lead.conversionDate || '',
      lead.notes || '',
      lead.tags || ''
    ]);
  }
  
  // Batch append to each region
  for (const [region, rows] of Object.entries(leadsByRegion)) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: MAPS_LEADS_SHEET_ID,
        range: `'${region}'!A:Z`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows }
      });
      
      results.success += rows.length;
      results.byRegion[region] = rows.length;
      console.log(`✅ Added ${rows.length} leads to ${region}`);
    } catch (err) {
      results.failed += rows.length;
      console.error(`❌ Failed to add leads to ${region}:`, err.message);
    }
  }
  
  return results;
}

/**
 * Get leads from a specific region
 */
async function getLeadsByRegion(region, limit = 100) {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured.');
  }
  
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    range: `'${region}'!A1:Z${limit + 1}`
  });
  
  const rows = response.data.values || [];
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const lead = {};
    headers.forEach((header, idx) => {
      lead[header.replace(/[^a-zA-Z0-9]/g, '')] = row[idx] || '';
    });
    return lead;
  });
}

/**
 * Update lead status
 */
async function updateLeadStatus(region, leadId, status, notes = '') {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured.');
  }
  
  const sheets = await getSheets();
  
  // Find the lead
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    range: `'${region}'!A:Z`
  });
  
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === leadId);
  
  if (rowIndex < 1) {
    throw new Error(`Lead ${leadId} not found in ${region}`);
  }
  
  // Update status (column S = 19) and notes (column Y = 25)
  const updates = [
    { range: `'${region}'!S${rowIndex + 1}`, values: [[status]] }
  ];
  
  if (notes) {
    const existingNotes = rows[rowIndex][24] || '';
    const newNotes = existingNotes 
      ? `${existingNotes}\n[${formatDate()}] ${notes}`
      : `[${formatDate()}] ${notes}`;
    updates.push({ range: `'${region}'!Y${rowIndex + 1}`, values: [[newNotes]] });
  }
  
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates
    }
  });
  
  console.log(`✅ Updated ${leadId} status to: ${status}`);
  return { success: true, leadId, region, status };
}

/**
 * Get summary statistics
 */
async function getSummary() {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured.');
  }
  
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    range: "'Summary'!A2:H20"
  });
  
  const rows = response.data.values || [];
  return rows.map(row => ({
    region: row[0],
    totalLeads: parseInt(row[1]) || 0,
    new: parseInt(row[2]) || 0,
    contacted: parseInt(row[3]) || 0,
    interested: parseInt(row[4]) || 0,
    converted: parseInt(row[5]) || 0,
    conversionRate: parseFloat(row[6]) || 0,
    lastUpdated: row[7]
  }));
}

/**
 * Clear all leads from all regional sheets (keeps headers)
 */
async function clearAllLeads() {
  if (!MAPS_LEADS_SHEET_ID) {
    throw new Error('Spreadsheet ID not configured.');
  }
  
  const sheets = await getSheets();
  const regions = [
    'NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B',
    'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX',
    'Region X', 'Region XI', 'Region XII', 'Region XIII', 'CAR', 'BARMM'
  ];
  
  const clearRequests = regions.map(region => ({
    range: `'${region}'!A2:Z10000`  // Clear from row 2 (keep header)
  }));
  
  console.log(`🗑️ Clearing all leads from ${regions.length} regional sheets...`);
  
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: MAPS_LEADS_SHEET_ID,
    requestBody: {
      ranges: clearRequests.map(r => r.range)
    }
  });
  
  console.log(`✅ Cleared all regional sheets`);
  return { success: true, clearedRegions: regions.length };
}

module.exports = {
  setSpreadsheetId,
  detectRegion,
  addLead,
  addLeads,
  getLeadsByRegion,
  updateLeadStatus,
  getSummary,
  clearAllLeads,
  CITY_TO_REGION
};

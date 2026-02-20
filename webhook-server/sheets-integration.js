/**
 * Google Sheets Integration for PlataPay Leads Tracker
 * Sheet ID: 1tJMLWrGUkraYERwAOeJ6l1WfSfOZ0C9CK1OajeQh0kA
 * Tabs: Leads, Bookings, Conversations, Tasks
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SHEET_ID = '1tJMLWrGUkraYERwAOeJ6l1WfSfOZ0C9CK1OajeQh0kA';
const TOKEN_PATH = path.join(process.env.HOME || '/root', '.config/google-workspace-mcp/tokens.json');

// Cache auth client
let authClient = null;
let sheetsApi = null;

/**
 * Initialize Google Sheets API
 */
async function getSheets() {
  if (sheetsApi) return sheetsApi;
  
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    authClient = new google.auth.OAuth2();
    authClient.setCredentials(tokens);
    sheetsApi = google.sheets({ version: 'v4', auth: authClient });
    return sheetsApi;
  } catch (err) {
    console.error('❌ Sheets auth failed:', err.message);
    throw err;
  }
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'PP') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = prefix;
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Format date for sheets
 */
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Format timestamp for sheets
 */
function formatTimestamp(date = new Date()) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Add a new lead to the Leads tab
 * @param {Object} lead - Lead data
 * @returns {Object} - Result with leadId
 */
async function addLead(lead) {
  const sheets = await getSheets();
  const contactId = lead.contactId || generateId('PL');
  
  const row = [
    formatDate(),                           // Date
    lead.name || '',                         // Name
    lead.email || '',                        // Email
    lead.phone || '',                        // Phone
    lead.location || '',                     // Location
    lead.source || 'Facebook Messenger',     // Source
    lead.interest || 'PlataPay Agent',       // Interest
    lead.status || 'New',                    // Status
    lead.comments || '',                     // Comments
    formatTimestamp(),                       // Last Updated
    contactId                                // Contact ID
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Leads!A:K',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  console.log(`✅ Lead added: ${contactId} - ${lead.name}`);
  return { success: true, contactId, name: lead.name };
}

/**
 * Update lead status
 * @param {string} contactId - Contact ID to update
 * @param {Object} updates - Fields to update
 */
async function updateLead(contactId, updates) {
  const sheets = await getSheets();
  
  // Find the lead row
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Leads!A:K'
  });
  
  const rows = response.data.values || [];
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][10] === contactId) { // Column K is Contact ID
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, error: 'Lead not found' };
  }
  
  // Update specific fields
  const updateRequests = [];
  
  if (updates.status) {
    updateRequests.push({
      range: `Leads!H${rowIndex}`,
      values: [[updates.status]]
    });
  }
  if (updates.email) {
    updateRequests.push({
      range: `Leads!C${rowIndex}`,
      values: [[updates.email]]
    });
  }
  if (updates.phone) {
    updateRequests.push({
      range: `Leads!D${rowIndex}`,
      values: [[updates.phone]]
    });
  }
  if (updates.location) {
    updateRequests.push({
      range: `Leads!E${rowIndex}`,
      values: [[updates.location]]
    });
  }
  if (updates.comments) {
    updateRequests.push({
      range: `Leads!I${rowIndex}`,
      values: [[updates.comments]]
    });
  }
  
  // Always update Last Updated
  updateRequests.push({
    range: `Leads!J${rowIndex}`,
    values: [[formatTimestamp()]]
  });
  
  for (const req of updateRequests) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: req.range,
      valueInputOption: 'RAW',
      requestBody: { values: req.values }
    });
  }
  
  console.log(`✅ Lead updated: ${contactId}`);
  return { success: true, contactId };
}

/**
 * Find lead by Facebook PSID or Contact ID
 */
async function findLead(identifier) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Leads!A:K'
  });
  
  const rows = response.data.values || [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Check Contact ID (column K) or Comments for PSID
    if (row[10] === identifier || (row[8] && row[8].includes(identifier))) {
      return {
        found: true,
        rowIndex: i + 1,
        data: {
          date: row[0],
          name: row[1],
          email: row[2],
          phone: row[3],
          location: row[4],
          source: row[5],
          interest: row[6],
          status: row[7],
          comments: row[8],
          lastUpdated: row[9],
          contactId: row[10]
        }
      };
    }
  }
  
  return { found: false };
}

/**
 * Add a booking to the Bookings tab
 * @param {Object} booking - Booking data
 * @returns {Object} - Result with bookingRef
 */
async function addBooking(booking) {
  const sheets = await getSheets();
  const bookingRef = booking.bookingRef || generateId('PPM');
  
  const row = [
    formatDate(),                            // Date Booked
    booking.name || '',                      // Name
    booking.email || '',                     // Email
    booking.phone || '',                     // Phone
    booking.appointmentDate || '',           // Appointment Date
    booking.timeSlot || '',                  // Time Slot
    bookingRef,                              // Booking Ref
    booking.status || 'pending',             // Status
    booking.notes || ''                      // Notes
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Bookings!A:I',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  console.log(`✅ Booking added: ${bookingRef} - ${booking.name} on ${booking.appointmentDate} ${booking.timeSlot}`);
  return { success: true, bookingRef, appointmentDate: booking.appointmentDate, timeSlot: booking.timeSlot };
}

/**
 * Update booking status
 */
async function updateBooking(bookingRef, updates) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Bookings!A:I'
  });
  
  const rows = response.data.values || [];
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][6] === bookingRef) { // Column G is Booking Ref
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, error: 'Booking not found' };
  }
  
  if (updates.status) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Bookings!H${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[updates.status]] }
    });
  }
  
  console.log(`✅ Booking updated: ${bookingRef}`);
  return { success: true, bookingRef };
}

/**
 * Get available time slots for a date
 */
async function getAvailableSlots(date) {
  const sheets = await getSheets();
  
  // All possible slots (9 AM - 5 PM, hourly)
  const allSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Bookings!A:I'
  });
  
  const rows = response.data.values || [];
  const bookedSlots = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[4] === date && row[7] !== 'cancelled') { // Same date, not cancelled
      bookedSlots.push(row[5]); // Time Slot
    }
  }
  
  const available = allSlots.filter(slot => !bookedSlots.includes(slot));
  return available;
}

/**
 * Log a conversation to the Conversations tab
 * @param {Object} conv - Conversation data
 */
async function logConversation(conv) {
  const sheets = await getSheets();
  
  const row = [
    formatTimestamp(),                       // Timestamp
    conv.contactId || '',                    // Contact ID
    conv.name || '',                         // Name
    conv.platform || 'Messenger',            // Platform
    conv.direction || 'inbound',             // Direction (inbound/outbound)
    conv.message || '',                      // Message
    conv.intent || '',                       // Intent
    conv.sentiment || '',                    // Sentiment
    conv.response || '',                     // Response
    conv.responseTime || '',                 // Response Time (ms)
    conv.agent || 'AI',                      // Agent
    conv.sessionId || ''                     // Session ID
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Conversations!A:L',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  return { success: true };
}

/**
 * Add a task to the Tasks tab
 * @param {Object} task - Task data
 */
async function addTask(task) {
  const sheets = await getSheets();
  const taskId = task.taskId || generateId('T');
  
  const row = [
    taskId,                                  // Task ID
    formatTimestamp(),                       // Created
    task.contactId || '',                    // Contact ID
    task.name || '',                         // Name
    task.type || 'Follow-up',                // Type
    task.description || '',                  // Description
    task.dueDate || '',                      // Due Date
    task.priority || 'Normal',               // Priority
    task.status || 'Pending',                // Status
    ''                                       // Completed
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Tasks!A:J',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  console.log(`✅ Task added: ${taskId}`);
  return { success: true, taskId };
}

/**
 * Get pending tasks
 */
async function getPendingTasks(contactId = null) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Tasks!A:J'
  });
  
  const rows = response.data.values || [];
  const tasks = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[8] === 'Pending' || row[8] === 'In Progress') {
      if (!contactId || row[2] === contactId) {
        tasks.push({
          taskId: row[0],
          created: row[1],
          contactId: row[2],
          name: row[3],
          type: row[4],
          description: row[5],
          dueDate: row[6],
          priority: row[7],
          status: row[8]
        });
      }
    }
  }
  
  return tasks;
}

/**
 * Get all campaigns
 */
async function getCampaigns(status = null) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Campaigns!A:O'
  });
  
  const rows = response.data.values || [];
  const campaigns = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!status || row[8] === status) {
      campaigns.push({
        campaignId: row[0],
        name: row[1],
        type: row[2],
        description: row[3],
        targetAudience: row[4],
        emailTemplate: row[5],
        subjectLine: row[6],
        sequenceDay: row[7],
        status: row[8],
        startDate: row[9],
        endDate: row[10],
        totalSent: parseInt(row[11]) || 0,
        opens: parseInt(row[12]) || 0,
        clicks: parseInt(row[13]) || 0,
        created: row[14]
      });
    }
  }
  
  return campaigns;
}

/**
 * Schedule an email for a lead
 */
async function scheduleEmail(schedule) {
  const sheets = await getSheets();
  const scheduleId = schedule.scheduleId || generateId('SCH');
  
  const row = [
    scheduleId,
    schedule.leadId || '',
    schedule.leadName || '',
    schedule.email || '',
    schedule.campaignId || '',
    schedule.campaignName || '',
    schedule.emailTemplate || '',
    schedule.subject || '',
    schedule.scheduledDate || '',
    schedule.scheduledTime || '08:00',
    schedule.status || 'Scheduled',
    '',  // Sent At
    '',  // Opened
    '',  // Clicked
    schedule.notes || ''
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Email Schedule!A:O',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  
  console.log(`✅ Email scheduled: ${scheduleId} for ${schedule.leadName}`);
  return { success: true, scheduleId };
}

/**
 * Update email schedule status
 */
async function updateEmailSchedule(scheduleId, updates) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Email Schedule!A:O'
  });
  
  const rows = response.data.values || [];
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === scheduleId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, error: 'Schedule not found' };
  }
  
  const updateRequests = [];
  
  if (updates.status) {
    updateRequests.push({ range: `Email Schedule!K${rowIndex}`, values: [[updates.status]] });
  }
  if (updates.sentAt) {
    updateRequests.push({ range: `Email Schedule!L${rowIndex}`, values: [[updates.sentAt]] });
  }
  if (updates.opened) {
    updateRequests.push({ range: `Email Schedule!M${rowIndex}`, values: [[updates.opened]] });
  }
  if (updates.clicked) {
    updateRequests.push({ range: `Email Schedule!N${rowIndex}`, values: [[updates.clicked]] });
  }
  
  for (const req of updateRequests) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: req.range,
      valueInputOption: 'RAW',
      requestBody: { values: req.values }
    });
  }
  
  return { success: true, scheduleId };
}

/**
 * Get pending scheduled emails
 */
async function getPendingEmails(date = null) {
  const sheets = await getSheets();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Email Schedule!A:O'
  });
  
  const rows = response.data.values || [];
  const pending = [];
  const today = date || formatDate();
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[10] === 'Scheduled' && row[8] <= today) {
      pending.push({
        scheduleId: row[0],
        leadId: row[1],
        leadName: row[2],
        email: row[3],
        campaignId: row[4],
        campaignName: row[5],
        emailTemplate: row[6],
        subject: row[7],
        scheduledDate: row[8],
        scheduledTime: row[9],
        status: row[10]
      });
    }
  }
  
  return pending;
}

/**
 * Enroll a lead in a drip campaign
 */
async function enrollInCampaign(lead, campaignType = 'nurture') {
  const campaigns = await getCampaigns('Active');
  const dripCampaigns = campaigns.filter(c => 
    c.type === 'Drip' && 
    c.targetAudience === 'New Leads'
  );
  
  const scheduled = [];
  const today = new Date();
  
  for (const campaign of dripCampaigns) {
    const dayOffset = parseInt(campaign.sequenceDay) || 0;
    const sendDate = new Date(today);
    sendDate.setDate(sendDate.getDate() + dayOffset);
    
    const result = await scheduleEmail({
      leadId: lead.contactId,
      leadName: lead.name,
      email: lead.email,
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      emailTemplate: campaign.emailTemplate,
      subject: campaign.subjectLine,
      scheduledDate: formatDate(sendDate),
      scheduledTime: '08:00',
      status: 'Scheduled',
      notes: `Auto-enrolled in ${campaignType} sequence`
    });
    
    scheduled.push(result);
  }
  
  console.log(`✅ Lead ${lead.name} enrolled in ${scheduled.length} drip emails`);
  return { success: true, scheduled: scheduled.length };
}

module.exports = {
  SHEET_ID,
  addLead,
  updateLead,
  findLead,
  addBooking,
  updateBooking,
  getAvailableSlots,
  logConversation,
  addTask,
  getPendingTasks,
  getCampaigns,
  scheduleEmail,
  updateEmailSchedule,
  getPendingEmails,
  enrollInCampaign,
  generateId,
  formatDate,
  formatTimestamp
};

// =============================================================================
// InnovateHub Business Hub — Express Webhook Routes (Back4App Cloud Code)
// =============================================================================
const fetch = require('node-fetch');

const VERIFY_TOKEN = 'innovatehub_verify_2024';
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Query the Business class by Facebook Page ID.
 * Returns the first matching Business Parse object or null.
 */
async function getBusinessByPageId(pageId) {
  const query = new Parse.Query('Business');
  query.equalTo('fbPageId', pageId);
  const business = await query.first({ useMasterKey: true });
  if (!business) {
    console.error(`[getBusinessByPageId] No Business found for pageId=${pageId}`);
  }
  return business;
}

/**
 * Query the Business class by Instagram account ID.
 */
async function getBusinessByInstagramId(igId) {
  const query = new Parse.Query('Business');
  query.equalTo('instagramId', igId);
  const business = await query.first({ useMasterKey: true });
  if (!business) {
    console.error(`[getBusinessByInstagramId] No Business found for igId=${igId}`);
  }
  return business;
}

/**
 * Retrieve the page access token for a Business.
 * First checks TokenStore for a valid, non-expired token; falls back to
 * business.get('pageAccessToken').
 */
async function getPageAccessToken(business) {
  try {
    const tokenQuery = new Parse.Query('TokenStore');
    tokenQuery.equalTo('business', business);
    tokenQuery.equalTo('platform', 'facebook');
    tokenQuery.descending('createdAt');
    const tokenRecord = await tokenQuery.first({ useMasterKey: true });

    if (tokenRecord) {
      const expiresAt = tokenRecord.get('expiresAt');
      if (!expiresAt || expiresAt > new Date()) {
        return tokenRecord.get('accessToken');
      }
    }
  } catch (err) {
    console.error('[getPageAccessToken] TokenStore lookup failed:', err.message);
  }

  // Fallback to the token stored directly on the Business object
  const fallback = business.get('pageAccessToken');
  if (!fallback) {
    throw new Error(`No access token available for business ${business.id}`);
  }
  return fallback;
}

/**
 * Find or create a MessengerContact for a given PSID within a Business.
 * If the contact is new, fetches the Facebook profile via Graph API.
 */
async function getOrCreateContact(business, psid, channel) {
  const contactChannel = channel || 'messenger';
  const query = new Parse.Query('MessengerContact');
  query.equalTo('business', business);
  query.equalTo('psid', psid);
  query.equalTo('channel', contactChannel);
  let contact = await query.first({ useMasterKey: true });

  if (contact) {
    return contact;
  }

  // New contact — fetch profile from Graph API
  let firstName = '';
  let lastName = '';
  let profilePic = '';
  let locale = '';

  try {
    const token = await getPageAccessToken(business);
    const profileUrl = `${GRAPH_API_BASE}/${psid}?fields=first_name,last_name,profile_pic,locale&access_token=${token}`;
    const res = await fetch(profileUrl);
    if (res.ok) {
      const profile = await res.json();
      firstName = profile.first_name || '';
      lastName = profile.last_name || '';
      profilePic = profile.profile_pic || '';
      locale = profile.locale || '';
    } else {
      console.error(`[getOrCreateContact] Profile fetch failed for psid=${psid}: ${res.status}`);
    }
  } catch (err) {
    console.error('[getOrCreateContact] Profile fetch error:', err.message);
  }

  contact = new Parse.Object('MessengerContact');
  contact.set('business', business);
  contact.set('psid', psid);
  contact.set('channel', contactChannel);
  contact.set('firstName', firstName);
  contact.set('lastName', lastName);
  contact.set('profilePic', profilePic);
  contact.set('locale', locale);
  contact.set('lastInteractionAt', new Date());
  await contact.save(null, { useMasterKey: true });

  return contact;
}

/**
 * Find or create an active Conversation for a contact + business + channel.
 */
async function getOrCreateConversation(business, contact, channel) {
  const convChannel = channel || 'messenger';
  const query = new Parse.Query('Conversation');
  query.equalTo('business', business);
  query.equalTo('contact', contact);
  query.equalTo('channel', convChannel);
  query.containedIn('status', ['active', 'pending']);
  query.descending('updatedAt');
  let conversation = await query.first({ useMasterKey: true });

  if (conversation) {
    conversation.set('lastMessageAt', new Date());
    await conversation.save(null, { useMasterKey: true });
    return conversation;
  }

  conversation = new Parse.Object('Conversation');
  conversation.set('business', business);
  conversation.set('contact', contact);
  conversation.set('channel', convChannel);
  conversation.set('status', 'active');
  conversation.set('lastMessageAt', new Date());
  await conversation.save(null, { useMasterKey: true });

  return conversation;
}

/**
 * Send a message to a PSID via the Facebook Send API.
 */
async function sendFbMessage(pageAccessToken, recipientPsid, message) {
  const url = `${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`;

  const body = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
  };

  // Support plain text string or structured message object
  if (typeof message === 'string') {
    body.message = { text: message };
  } else {
    body.message = message;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[sendFbMessage] Send API error:', JSON.stringify(data));
      return { success: false, error: data };
    }
    return { success: true, messageId: data.message_id };
  } catch (err) {
    console.error('[sendFbMessage] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check all BotFlows for a business to see if the inbound message text
 * matches any trigger keywords. If matched, execute the flow steps
 * (send sequential responses). Returns true if a flow was triggered.
 */
async function processBotFlow(business, conversation, messageText) {
  if (!messageText || typeof messageText !== 'string') {
    return false;
  }

  const normalizedText = messageText.toLowerCase().trim();

  const flowQuery = new Parse.Query('BotFlow');
  flowQuery.equalTo('business', business);
  flowQuery.equalTo('isActive', true);
  const flows = await flowQuery.find({ useMasterKey: true });

  for (const flow of flows) {
    const keywords = flow.get('triggerKeywords') || [];
    const matched = keywords.some(function (kw) {
      return normalizedText.includes(kw.toLowerCase().trim());
    });

    if (!matched) continue;

    // Flow matched — execute steps
    const steps = flow.get('steps') || [];
    const contact = conversation.get('contact');

    let contactObj = contact;
    if (contact && typeof contact.fetch === 'function') {
      try {
        contactObj = await contact.fetch({ useMasterKey: true });
      } catch (e) {
        // contact might already be fetched
      }
    }

    const psid = contactObj.get('psid');

    let pageAccessToken;
    try {
      pageAccessToken = await getPageAccessToken(business);
    } catch (err) {
      console.error('[processBotFlow] Cannot get token:', err.message);
      return false;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let messagePayload;

      if (step.type === 'text') {
        messagePayload = { text: step.content };
      } else if (step.type === 'image') {
        messagePayload = {
          attachment: {
            type: 'image',
            payload: { url: step.url, is_reusable: true },
          },
        };
      } else if (step.type === 'quick_replies') {
        messagePayload = {
          text: step.content,
          quick_replies: (step.quickReplies || []).map(function (qr) {
            return {
              content_type: 'text',
              title: qr.title,
              payload: qr.payload || qr.title,
            };
          }),
        };
      } else if (step.type === 'buttons') {
        messagePayload = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text: step.content,
              buttons: (step.buttons || []).map(function (btn) {
                if (btn.url) {
                  return { type: 'web_url', url: btn.url, title: btn.title };
                }
                return { type: 'postback', title: btn.title, payload: btn.payload || btn.title };
              }),
            },
          },
        };
      } else {
        // Default: treat as text
        messagePayload = { text: step.content || JSON.stringify(step) };
      }

      // Optional delay between steps
      if (step.delayMs && step.delayMs > 0) {
        await new Promise(function (resolve) {
          setTimeout(resolve, Math.min(step.delayMs, 5000));
        });
      }

      const sendResult = await sendFbMessage(pageAccessToken, psid, messagePayload);

      // Record outbound message
      const outMsg = new Parse.Object('Message');
      outMsg.set('business', business);
      outMsg.set('conversation', conversation);
      outMsg.set('direction', 'outbound');
      outMsg.set('channel', conversation.get('channel') || 'messenger');
      outMsg.set('messageType', step.type || 'text');
      outMsg.set('content', step.content || '');
      outMsg.set('rawPayload', step);
      outMsg.set('fbMessageId', sendResult.messageId || null);
      outMsg.set('botFlowId', flow.id);
      await outMsg.save(null, { useMasterKey: true });
    }

    // Update conversation to reflect bot handled it
    conversation.set('lastRespondedBy', 'bot');
    conversation.set('lastRespondedAt', new Date());
    await conversation.save(null, { useMasterKey: true });

    return true; // Flow was triggered
  }

  return false; // No flow matched
}

/**
 * Handle auto-reply for common feed comment keywords.
 */
async function handleFeedAutoReply(business, commentId, commentMessage) {
  if (!commentMessage || typeof commentMessage !== 'string') return;

  const lowerMsg = commentMessage.toLowerCase();
  let replyText = null;

  // Common question keywords and their auto-replies
  const autoReplies = [
    {
      keywords: ['how much', 'price', 'magkano', 'presyo', 'cost'],
      reply: 'Thank you for your interest! Please send us a private message for pricing details.',
    },
    {
      keywords: ['available', 'avail', 'stock', 'meron pa'],
      reply: 'Thank you for asking! Please send us a message so we can check availability for you.',
    },
    {
      keywords: ['order', 'buy', 'purchase', 'bili', 'pabili'],
      reply: 'Thank you! Please send us a private message to place your order.',
    },
    {
      keywords: ['shipping', 'delivery', 'deliver', 'ship', 'padala'],
      reply: 'We offer shipping nationwide! Please message us for delivery details.',
    },
    {
      keywords: ['open', 'hours', 'schedule', 'oras', 'bukas'],
      reply: 'Please check our page info for our operating hours, or send us a message for details!',
    },
  ];

  for (const rule of autoReplies) {
    const matched = rule.keywords.some(function (kw) {
      return lowerMsg.includes(kw);
    });
    if (matched) {
      replyText = rule.reply;
      break;
    }
  }

  if (!replyText) return;

  try {
    const token = await getPageAccessToken(business);
    const url = `${GRAPH_API_BASE}/${commentId}/comments?access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: replyText }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('[handleFeedAutoReply] Reply failed:', JSON.stringify(errData));
    }
  } catch (err) {
    console.error('[handleFeedAutoReply] Error:', err.message);
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Process a single messaging event from the Facebook webhook.
 */
async function handleMessagingEvent(entry) {
  const pageId = entry.id;
  const business = await getBusinessByPageId(pageId);
  if (!business) return;

  const messagingEvents = entry.messaging || [];

  for (const event of messagingEvents) {
    try {
      const senderPsid = event.sender && event.sender.id;
      // Skip if the sender is the page itself (outbound echo)
      if (!senderPsid || senderPsid === pageId) continue;

      const contact = await getOrCreateContact(business, senderPsid, 'messenger');
      const conversation = await getOrCreateConversation(business, contact, 'messenger');

      // Update contact last interaction
      contact.set('lastInteractionAt', new Date());
      await contact.save(null, { useMasterKey: true });

      if (event.message) {
        // Inbound message
        const msg = new Parse.Object('Message');
        msg.set('business', business);
        msg.set('conversation', conversation);
        msg.set('direction', 'inbound');
        msg.set('channel', 'messenger');
        msg.set('senderPsid', senderPsid);
        msg.set('fbMessageId', event.message.mid || null);

        if (event.message.text) {
          msg.set('messageType', 'text');
          msg.set('content', event.message.text);
        } else if (event.message.attachments && event.message.attachments.length > 0) {
          const attType = event.message.attachments[0].type;
          msg.set('messageType', attType || 'attachment');
          msg.set('attachments', event.message.attachments);
          msg.set('content', `[${attType || 'attachment'}]`);
        } else {
          msg.set('messageType', 'unknown');
          msg.set('content', '');
        }

        msg.set('rawPayload', event.message);
        msg.set('timestamp', event.timestamp ? new Date(event.timestamp) : new Date());
        await msg.save(null, { useMasterKey: true });

        // Try bot flow
        const botHandled = await processBotFlow(business, conversation, event.message.text);

        if (!botHandled) {
          // No bot matched — mark for human review
          conversation.set('status', 'pending');
          conversation.set('lastRespondedBy', null);
          await conversation.save(null, { useMasterKey: true });
        }
      } else if (event.postback) {
        // Postback event (button click)
        const msg = new Parse.Object('Message');
        msg.set('business', business);
        msg.set('conversation', conversation);
        msg.set('direction', 'inbound');
        msg.set('channel', 'messenger');
        msg.set('senderPsid', senderPsid);
        msg.set('messageType', 'postback');
        msg.set('content', event.postback.title || '');
        msg.set('rawPayload', event.postback);
        msg.set('timestamp', event.timestamp ? new Date(event.timestamp) : new Date());
        await msg.save(null, { useMasterKey: true });

        // Try bot flow with the postback payload
        const payload = event.postback.payload || event.postback.title || '';
        const botHandled = await processBotFlow(business, conversation, payload);
        if (!botHandled) {
          conversation.set('status', 'pending');
          await conversation.save(null, { useMasterKey: true });
        }
      } else if (event.referral) {
        // Referral event (e.g., from ads, links)
        const msg = new Parse.Object('Message');
        msg.set('business', business);
        msg.set('conversation', conversation);
        msg.set('direction', 'inbound');
        msg.set('channel', 'messenger');
        msg.set('senderPsid', senderPsid);
        msg.set('messageType', 'referral');
        msg.set('content', event.referral.ref || '');
        msg.set('rawPayload', event.referral);
        msg.set('timestamp', event.timestamp ? new Date(event.timestamp) : new Date());
        await msg.save(null, { useMasterKey: true });
      }
    } catch (err) {
      console.error('[handleMessagingEvent] Error processing event:', err.message, err.stack);
    }
  }
}

/**
 * Process page feed change events (new comments, posts, etc.)
 */
async function handleFeedChange(entry) {
  const pageId = entry.id;
  const business = await getBusinessByPageId(pageId);
  if (!business) return;

  const changes = entry.changes || [];

  for (const change of changes) {
    try {
      if (change.field !== 'feed') continue;

      const value = change.value || {};

      // New comment on a post
      if (value.item === 'comment' && value.verb === 'add') {
        const postComment = new Parse.Object('PostComment');
        postComment.set('business', business);
        postComment.set('fbCommentId', value.comment_id || '');
        postComment.set('fbPostId', value.post_id || '');
        postComment.set('parentId', value.parent_id || null);
        postComment.set('message', value.message || '');
        postComment.set('fromId', value.from && value.from.id ? value.from.id : '');
        postComment.set('fromName', value.from && value.from.name ? value.from.name : '');
        postComment.set('isReplied', false);
        postComment.set('createdTime', value.created_time ? new Date(value.created_time * 1000) : new Date());
        postComment.set('rawPayload', value);
        await postComment.save(null, { useMasterKey: true });

        // Auto-reply to common questions
        // Skip replies from the page itself
        if (value.from && value.from.id !== pageId) {
          await handleFeedAutoReply(business, value.comment_id, value.message);
        }
      }

      // New post by the page or others
      if (value.item === 'post' || value.item === 'status' || value.item === 'photo' || value.item === 'video') {
        if (value.verb === 'add') {
          // Log the post event
          const feedLog = new Parse.Object('FeedEvent');
          feedLog.set('business', business);
          feedLog.set('item', value.item);
          feedLog.set('verb', value.verb);
          feedLog.set('fbPostId', value.post_id || '');
          feedLog.set('fromId', value.from && value.from.id ? value.from.id : '');
          feedLog.set('message', value.message || '');
          feedLog.set('rawPayload', value);
          await feedLog.save(null, { useMasterKey: true });
        }
      }
    } catch (err) {
      console.error('[handleFeedChange] Error processing change:', err.message, err.stack);
    }
  }
}

/**
 * Process lead generation events from Facebook Lead Ads.
 */
async function handleLeadGenEvent(entry) {
  const pageId = entry.id;
  const business = await getBusinessByPageId(pageId);
  if (!business) return;

  const changes = entry.changes || [];

  for (const change of changes) {
    try {
      if (change.field !== 'leadgen') continue;

      const value = change.value || {};
      const leadgenId = value.leadgen_id;
      if (!leadgenId) {
        console.error('[handleLeadGenEvent] No leadgen_id in change value');
        continue;
      }

      // Fetch full lead data from Graph API
      let leadData = null;
      try {
        const token = await getPageAccessToken(business);
        const url = `${GRAPH_API_BASE}/${leadgenId}?access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          leadData = await res.json();
        } else {
          const errBody = await res.json();
          console.error('[handleLeadGenEvent] Lead fetch failed:', JSON.stringify(errBody));
        }
      } catch (fetchErr) {
        console.error('[handleLeadGenEvent] Lead fetch error:', fetchErr.message);
      }

      // Create FbLead record
      const fbLead = new Parse.Object('FbLead');
      fbLead.set('business', business);
      fbLead.set('leadgenId', leadgenId);
      fbLead.set('formId', value.form_id || '');
      fbLead.set('pageId', value.page_id || pageId);
      fbLead.set('adgroupId', value.adgroup_id || '');
      fbLead.set('adId', value.ad_id || '');
      fbLead.set('createdTime', value.created_time ? new Date(value.created_time * 1000) : new Date());

      if (leadData) {
        // Parse field_data array into a flat object
        const fieldData = {};
        const fieldDataArray = leadData.field_data || [];
        for (const field of fieldDataArray) {
          fieldData[field.name] = field.values && field.values.length > 0 ? field.values[0] : '';
        }
        fbLead.set('fieldData', fieldData);
        fbLead.set('rawLeadData', leadData);

        // Extract common fields for easier querying
        fbLead.set('email', fieldData.email || fieldData.work_email || '');
        fbLead.set('phone', fieldData.phone_number || fieldData.phone || '');
        fbLead.set('fullName', fieldData.full_name || '');
        fbLead.set('firstName', fieldData.first_name || '');
        fbLead.set('lastName', fieldData.last_name || '');
      } else {
        fbLead.set('fieldData', {});
        fbLead.set('rawLeadData', value);
      }

      fbLead.set('status', 'new');
      await fbLead.save(null, { useMasterKey: true });
    } catch (err) {
      console.error('[handleLeadGenEvent] Error processing lead:', err.message, err.stack);
    }
  }
}

/**
 * Process Instagram webhook events (DMs, comments, mentions).
 */
async function handleInstagramEvent(entry) {
  const igId = entry.id;

  // Try to find business by Instagram ID first, then fallback to page ID
  let business = await getBusinessByInstagramId(igId);
  if (!business) {
    business = await getBusinessByPageId(igId);
  }
  if (!business) {
    console.error('[handleInstagramEvent] No Business found for igId=' + igId);
    return;
  }

  // Handle Instagram messaging (DMs)
  if (entry.messaging && entry.messaging.length > 0) {
    for (const event of entry.messaging) {
      try {
        const senderIgId = event.sender && event.sender.id;
        if (!senderIgId || senderIgId === igId) continue;

        const contact = await getOrCreateContact(business, senderIgId, 'instagram');
        const conversation = await getOrCreateConversation(business, contact, 'instagram');

        contact.set('lastInteractionAt', new Date());
        await contact.save(null, { useMasterKey: true });

        if (event.message) {
          const msg = new Parse.Object('Message');
          msg.set('business', business);
          msg.set('conversation', conversation);
          msg.set('direction', 'inbound');
          msg.set('channel', 'instagram');
          msg.set('senderPsid', senderIgId);
          msg.set('fbMessageId', event.message.mid || null);

          if (event.message.text) {
            msg.set('messageType', 'text');
            msg.set('content', event.message.text);
          } else if (event.message.attachments && event.message.attachments.length > 0) {
            const attType = event.message.attachments[0].type;
            msg.set('messageType', attType || 'attachment');
            msg.set('attachments', event.message.attachments);
            msg.set('content', '[' + (attType || 'attachment') + ']');
          } else {
            msg.set('messageType', 'unknown');
            msg.set('content', '');
          }

          msg.set('rawPayload', event.message);
          msg.set('timestamp', event.timestamp ? new Date(event.timestamp) : new Date());
          await msg.save(null, { useMasterKey: true });

          const botHandled = await processBotFlow(business, conversation, event.message.text);
          if (!botHandled) {
            conversation.set('status', 'pending');
            await conversation.save(null, { useMasterKey: true });
          }
        }
      } catch (err) {
        console.error('[handleInstagramEvent] DM error:', err.message, err.stack);
      }
    }
  }

  // Handle Instagram changes (comments, mentions)
  if (entry.changes && entry.changes.length > 0) {
    for (const change of entry.changes) {
      try {
        const value = change.value || {};

        if (change.field === 'comments') {
          const postComment = new Parse.Object('PostComment');
          postComment.set('business', business);
          postComment.set('fbCommentId', value.id || '');
          postComment.set('fbPostId', value.media && value.media.id ? value.media.id : '');
          postComment.set('message', value.text || '');
          postComment.set('fromId', value.from && value.from.id ? value.from.id : '');
          postComment.set('fromName', value.from && value.from.username ? value.from.username : '');
          postComment.set('channel', 'instagram');
          postComment.set('isReplied', false);
          postComment.set('rawPayload', value);
          await postComment.save(null, { useMasterKey: true });
        }

        if (change.field === 'mentions') {
          const mention = new Parse.Object('FeedEvent');
          mention.set('business', business);
          mention.set('item', 'mention');
          mention.set('channel', 'instagram');
          mention.set('fromId', value.from && value.from.id ? value.from.id : '');
          mention.set('message', value.text || value.caption || '');
          mention.set('mediaId', value.media_id || value.media && value.media.id || '');
          mention.set('rawPayload', value);
          await mention.save(null, { useMasterKey: true });
        }
      } catch (err) {
        console.error('[handleInstagramEvent] Change error:', err.message, err.stack);
      }
    }
  }
}

// =============================================================================
// Webhook Verification (GET)
// =============================================================================
app.get('/facebook/webhook', function (req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Verification successful');
    return res.status(200).send(challenge);
  }

  console.error('[Webhook] Verification failed — token mismatch');
  return res.status(403).send('Forbidden');
});

// =============================================================================
// Webhook Event Handler (POST)
// =============================================================================
app.post('/facebook/webhook', function (req, res) {
  // Respond immediately — Facebook requires response within 20 seconds
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  // Log raw payload to WebhookLog asynchronously
  (async function () {
    try {
      const log = new Parse.Object('WebhookLog');
      log.set('objectType', body.object || 'unknown');
      log.set('payload', body);
      log.set('receivedAt', new Date());
      await log.save(null, { useMasterKey: true });
    } catch (logErr) {
      console.error('[Webhook] Failed to save WebhookLog:', logErr.message);
    }
  })();

  // Route events based on type
  if (body.object === 'page') {
    const entries = body.entry || [];

    for (const entry of entries) {
      // Messaging events (DMs)
      if (entry.messaging && entry.messaging.length > 0) {
        handleMessagingEvent(entry).catch(function (err) {
          console.error('[Webhook] handleMessagingEvent error:', err.message, err.stack);
        });
      }

      // Page changes (feed, leadgen)
      if (entry.changes && entry.changes.length > 0) {
        const hasLeadgen = entry.changes.some(function (c) {
          return c.field === 'leadgen';
        });
        const hasFeed = entry.changes.some(function (c) {
          return c.field === 'feed';
        });

        if (hasLeadgen) {
          handleLeadGenEvent(entry).catch(function (err) {
            console.error('[Webhook] handleLeadGenEvent error:', err.message, err.stack);
          });
        }

        if (hasFeed) {
          handleFeedChange(entry).catch(function (err) {
            console.error('[Webhook] handleFeedChange error:', err.message, err.stack);
          });
        }
      }
    }
  } else if (body.object === 'instagram') {
    const entries = body.entry || [];

    for (const entry of entries) {
      handleInstagramEvent(entry).catch(function (err) {
        console.error('[Webhook] handleInstagramEvent error:', err.message, err.stack);
      });
    }
  } else {
    console.warn('[Webhook] Unknown object type:', body.object);
  }
});

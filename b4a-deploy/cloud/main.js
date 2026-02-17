// =============================================================================
// InnovateHub Business Hub — Cloud Functions, Jobs, Triggers (Back4App)
// =============================================================================
const fetch = require('node-fetch');

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

// =============================================================================
// Internal Helpers (shared across functions)
// =============================================================================

/**
 * Get a Business object by its objectId.
 */
async function getBusinessById(businessId) {
  const query = new Parse.Query('Business');
  const business = await query.get(businessId, { useMasterKey: true });
  return business;
}

/**
 * Retrieve the page access token for a Business.
 * Checks TokenStore first, falls back to Business.pageAccessToken.
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
    console.error('[getPageAccessToken] TokenStore lookup error:', err.message);
  }

  const fallback = business.get('pageAccessToken');
  if (!fallback) {
    throw new Error('No access token available for business ' + business.id);
  }
  return fallback;
}

/**
 * Send a message via the Facebook Send API.
 * Returns the Send API response body.
 */
async function callSendApi(pageAccessToken, recipientPsid, messagePayload) {
  const url = GRAPH_API_BASE + '/me/messages?access_token=' + pageAccessToken;

  const body = {
    recipient: { id: recipientPsid },
    messaging_type: 'RESPONSE',
  };

  if (typeof messagePayload === 'string') {
    body.message = { text: messagePayload };
  } else {
    body.message = messagePayload;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Send API error: ' + JSON.stringify(data));
  }
  return data;
}

/**
 * Send a message via the Facebook Send API with MESSAGE_TAG for >24hr messaging.
 * Uses CONFIRMED_EVENT_UPDATE tag for lead form follow-ups.
 */
async function callSendApiWithTag(pageAccessToken, recipientPsid, messagePayload, tag) {
  const url = GRAPH_API_BASE + '/me/messages?access_token=' + pageAccessToken;

  const body = {
    recipient: { id: recipientPsid },
    messaging_type: 'MESSAGE_TAG',
    tag: tag || 'CONFIRMED_EVENT_UPDATE',
  };

  if (typeof messagePayload === 'string') {
    body.message = { text: messagePayload };
  } else {
    body.message = messagePayload;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Send API (tagged) error: ' + JSON.stringify(data));
  }
  return data;
}

// =============================================================================
// Cloud Functions
// =============================================================================

/**
 * sendMessage — Send a message to a recipient via Facebook Send API.
 * Params: businessId, recipientPsid, messageData (string or object)
 */
Parse.Cloud.define('sendMessage', async function (request) {
  const { businessId, recipientPsid, messageData } = request.params;

  if (!businessId || !recipientPsid || !messageData) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId, recipientPsid, and messageData are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);
  const sendResult = await callSendApi(token, recipientPsid, messageData);

  // Find the conversation for this recipient to attach the message record
  const contactQuery = new Parse.Query('MessengerContact');
  contactQuery.equalTo('business', business);
  contactQuery.equalTo('psid', recipientPsid);
  const contact = await contactQuery.first({ useMasterKey: true });

  let conversation = null;
  if (contact) {
    const convQuery = new Parse.Query('Conversation');
    convQuery.equalTo('business', business);
    convQuery.equalTo('contact', contact);
    convQuery.containedIn('status', ['active', 'pending']);
    convQuery.descending('updatedAt');
    conversation = await convQuery.first({ useMasterKey: true });
  }

  // Create outbound Message record
  const msg = new Parse.Object('Message');
  msg.set('business', business);
  msg.set('direction', 'outbound');
  msg.set('channel', 'messenger');
  msg.set('recipientPsid', recipientPsid);
  msg.set('fbMessageId', sendResult.message_id || null);

  if (typeof messageData === 'string') {
    msg.set('messageType', 'text');
    msg.set('content', messageData);
  } else {
    msg.set('messageType', messageData.attachment ? messageData.attachment.type : 'text');
    msg.set('content', messageData.text || '');
    msg.set('rawPayload', messageData);
  }

  if (conversation) {
    msg.set('conversation', conversation);
    conversation.set('lastMessageAt', new Date());
    conversation.set('lastRespondedBy', 'agent');
    conversation.set('lastRespondedAt', new Date());
    if (conversation.get('status') === 'pending') {
      conversation.set('status', 'active');
    }
    await conversation.save(null, { useMasterKey: true });
  }

  msg.set('timestamp', new Date());
  await msg.save(null, { useMasterKey: true });

  return { success: true, messageId: sendResult.message_id };
});

/**
 * getContactProfile — Fetch and update a messenger contact's profile info.
 * Params: businessId, psid
 */
Parse.Cloud.define('getContactProfile', async function (request) {
  const { businessId, psid } = request.params;

  if (!businessId || !psid) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and psid are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);

  const profileUrl = GRAPH_API_BASE + '/' + psid + '?fields=first_name,last_name,profile_pic,locale&access_token=' + token;
  const res = await fetch(profileUrl);

  if (!res.ok) {
    const errData = await res.json();
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Profile fetch failed: ' + JSON.stringify(errData));
  }

  const profile = await res.json();

  // Update the MessengerContact record
  const contactQuery = new Parse.Query('MessengerContact');
  contactQuery.equalTo('business', business);
  contactQuery.equalTo('psid', psid);
  const contact = await contactQuery.first({ useMasterKey: true });

  if (contact) {
    contact.set('firstName', profile.first_name || contact.get('firstName'));
    contact.set('lastName', profile.last_name || contact.get('lastName'));
    contact.set('profilePic', profile.profile_pic || contact.get('profilePic'));
    contact.set('locale', profile.locale || contact.get('locale'));
    await contact.save(null, { useMasterKey: true });
  }

  return {
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    profilePic: profile.profile_pic || '',
    locale: profile.locale || '',
  };
});

/**
 * publishPost — Publish a post to a Facebook page's feed.
 * Params: businessId, content, mediaUrls (optional array), link (optional)
 */
Parse.Cloud.define('publishPost', async function (request) {
  const { businessId, content, mediaUrls, link } = request.params;

  if (!businessId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId is required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);
  const pageId = business.get('fbPageId');

  if (!pageId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Business does not have a fbPageId');
  }

  let postResult;

  if (mediaUrls && mediaUrls.length > 0) {
    if (mediaUrls.length === 1) {
      // Single photo post
      const url = GRAPH_API_BASE + '/' + pageId + '/photos?access_token=' + token;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mediaUrls[0],
          message: content || '',
        }),
      });
      postResult = await res.json();
      if (!res.ok) {
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Photo post failed: ' + JSON.stringify(postResult));
      }
    } else {
      // Multi-photo post: upload each photo unpublished, then create multi-photo post
      const photoIds = [];
      for (const mediaUrl of mediaUrls) {
        const uploadUrl = GRAPH_API_BASE + '/' + pageId + '/photos?access_token=' + token;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: mediaUrl,
            published: false,
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          console.error('[publishPost] Photo upload failed:', JSON.stringify(uploadData));
          continue;
        }
        photoIds.push(uploadData.id);
      }

      // Create the multi-photo post
      const feedUrl = GRAPH_API_BASE + '/' + pageId + '/feed?access_token=' + token;
      const feedBody = { message: content || '' };
      photoIds.forEach(function (photoId, idx) {
        feedBody['attached_media[' + idx + ']'] = JSON.stringify({ media_fbid: photoId });
      });

      const feedRes = await fetch(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedBody),
      });
      postResult = await feedRes.json();
      if (!feedRes.ok) {
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Multi-photo post failed: ' + JSON.stringify(postResult));
      }
    }
  } else {
    // Text-only post (optionally with a link)
    const feedUrl = GRAPH_API_BASE + '/' + pageId + '/feed?access_token=' + token;
    const feedBody = { message: content || '' };
    if (link) {
      feedBody.link = link;
    }

    const feedRes = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedBody),
    });
    postResult = await feedRes.json();
    if (!feedRes.ok) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Post failed: ' + JSON.stringify(postResult));
    }
  }

  // Create or update PagePost record
  const pagePost = new Parse.Object('PagePost');
  pagePost.set('business', business);
  pagePost.set('fbPostId', postResult.id || postResult.post_id || '');
  pagePost.set('content', content || '');
  pagePost.set('mediaUrls', mediaUrls || []);
  pagePost.set('link', link || '');
  pagePost.set('status', 'published');
  pagePost.set('publishedAt', new Date());
  await pagePost.save(null, { useMasterKey: true });

  return { success: true, postId: postResult.id || postResult.post_id, pagePostId: pagePost.id };
});

/**
 * schedulePost — Create a scheduled post for future publishing.
 * Params: businessId, content, mediaUrls (optional), scheduledFor (ISO date string)
 */
Parse.Cloud.define('schedulePost', async function (request) {
  const { businessId, content, mediaUrls, scheduledFor } = request.params;

  if (!businessId || !scheduledFor) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and scheduledFor are required');
  }

  const business = await getBusinessById(businessId);
  const scheduledDate = new Date(scheduledFor);

  if (scheduledDate <= new Date()) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'scheduledFor must be in the future');
  }

  const pagePost = new Parse.Object('PagePost');
  pagePost.set('business', business);
  pagePost.set('content', content || '');
  pagePost.set('mediaUrls', mediaUrls || []);
  pagePost.set('status', 'scheduled');
  pagePost.set('scheduledFor', scheduledDate);
  await pagePost.save(null, { useMasterKey: true });

  // Create ScheduledAction record for the scheduler job to pick up
  const scheduledAction = new Parse.Object('ScheduledAction');
  scheduledAction.set('business', business);
  scheduledAction.set('actionType', 'publishPost');
  scheduledAction.set('targetClass', 'PagePost');
  scheduledAction.set('targetId', pagePost.id);
  scheduledAction.set('scheduledFor', scheduledDate);
  scheduledAction.set('status', 'pending');
  await scheduledAction.save(null, { useMasterKey: true });

  return { success: true, pagePostId: pagePost.id, scheduledFor: scheduledDate.toISOString() };
});

/**
 * replyToComment — Reply to a Facebook comment.
 * Params: businessId, commentId, message
 */
Parse.Cloud.define('replyToComment', async function (request) {
  const { businessId, commentId, message } = request.params;

  if (!businessId || !commentId || !message) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId, commentId, and message are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);

  const url = GRAPH_API_BASE + '/' + commentId + '/comments?access_token=' + token;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Reply failed: ' + JSON.stringify(data));
  }

  // Update PostComment record
  const commentQuery = new Parse.Query('PostComment');
  commentQuery.equalTo('business', business);
  commentQuery.equalTo('fbCommentId', commentId);
  const postComment = await commentQuery.first({ useMasterKey: true });

  if (postComment) {
    postComment.set('isReplied', true);
    postComment.set('replyMessage', message);
    postComment.set('repliedAt', new Date());
    await postComment.save(null, { useMasterKey: true });
  }

  return { success: true, replyId: data.id };
});

/**
 * fetchLeads — Fetch leads from a Facebook lead form.
 * Params: businessId, formId
 */
Parse.Cloud.define('fetchLeads', async function (request) {
  const { businessId, formId } = request.params;

  if (!businessId || !formId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and formId are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);

  let allLeads = [];
  let nextUrl = GRAPH_API_BASE + '/' + formId + '/leads?access_token=' + token + '&limit=50';

  // Paginate through all leads
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    if (!res.ok) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Leads fetch failed: ' + JSON.stringify(data));
    }

    const leads = data.data || [];
    allLeads = allLeads.concat(leads);

    // Check for pagination
    nextUrl = data.paging && data.paging.next ? data.paging.next : null;

    // Safety limit to prevent infinite loops
    if (allLeads.length > 5000) {
      console.warn('[fetchLeads] Hit 5000 lead safety limit');
      break;
    }
  }

  let created = 0;
  let skipped = 0;

  for (const lead of allLeads) {
    // Check if lead already exists
    const existingQuery = new Parse.Query('FbLead');
    existingQuery.equalTo('business', business);
    existingQuery.equalTo('leadgenId', lead.id);
    const existing = await existingQuery.first({ useMasterKey: true });

    if (existing) {
      skipped++;
      continue;
    }

    // Parse field data
    const fieldData = {};
    const fieldDataArray = lead.field_data || [];
    for (const field of fieldDataArray) {
      fieldData[field.name] = field.values && field.values.length > 0 ? field.values[0] : '';
    }

    const fbLead = new Parse.Object('FbLead');
    fbLead.set('business', business);
    fbLead.set('leadgenId', lead.id);
    fbLead.set('formId', formId);
    fbLead.set('fieldData', fieldData);
    fbLead.set('rawLeadData', lead);
    fbLead.set('email', fieldData.email || fieldData.work_email || '');
    fbLead.set('phone', fieldData.phone_number || fieldData.phone || '');
    fbLead.set('fullName', fieldData.full_name || '');
    fbLead.set('firstName', fieldData.first_name || '');
    fbLead.set('lastName', fieldData.last_name || '');
    fbLead.set('createdTime', lead.created_time ? new Date(lead.created_time) : new Date());
    fbLead.set('status', 'new');
    await fbLead.save(null, { useMasterKey: true });
    created++;
  }

  return { success: true, totalFetched: allLeads.length, created: created, skipped: skipped };
});

/**
 * syncProductToCatalog — Sync a single product to a Facebook product catalog.
 * Params: businessId, productId
 */
Parse.Cloud.define('syncProductToCatalog', async function (request) {
  const { businessId, productId } = request.params;

  if (!businessId || !productId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and productId are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);
  const catalogId = business.get('fbCatalogId');

  if (!catalogId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Business does not have a fbCatalogId configured');
  }

  const productQuery = new Parse.Query('Product');
  productQuery.equalTo('business', business);
  const product = await productQuery.get(productId, { useMasterKey: true });

  // Build product data for the Facebook catalog API
  const productData = {
    name: product.get('name') || '',
    description: product.get('description') || '',
    availability: product.get('inStock') !== false ? 'in stock' : 'out of stock',
    condition: product.get('condition') || 'new',
    price: product.get('price') ? product.get('price') * 100 : 0, // Price in cents
    currency: product.get('currency') || 'PHP',
    brand: product.get('brand') || business.get('name') || '',
    retailer_id: product.id,
    url: product.get('url') || business.get('websiteUrl') || '',
  };

  // Add image URL
  const imageUrls = product.get('imageUrls') || [];
  if (imageUrls.length > 0) {
    productData.image_url = imageUrls[0];
    if (imageUrls.length > 1) {
      productData.additional_image_urls = JSON.stringify(imageUrls.slice(1));
    }
  }

  // Add category if available
  if (product.get('category')) {
    productData.category = product.get('category');
  }

  let result;
  const existingFbProductId = product.get('fbProductId');

  if (existingFbProductId) {
    // Update existing product
    const url = GRAPH_API_BASE + '/' + existingFbProductId + '?access_token=' + token;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    result = await res.json();
    if (!res.ok) {
      product.set('syncStatus', 'error');
      product.set('syncError', JSON.stringify(result));
      await product.save(null, { useMasterKey: true });
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Product update failed: ' + JSON.stringify(result));
    }
  } else {
    // Create new product in catalog
    const url = GRAPH_API_BASE + '/' + catalogId + '/products?access_token=' + token;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    result = await res.json();
    if (!res.ok) {
      product.set('syncStatus', 'error');
      product.set('syncError', JSON.stringify(result));
      await product.save(null, { useMasterKey: true });
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Product create failed: ' + JSON.stringify(result));
    }

    product.set('fbProductId', result.id || '');
  }

  product.set('syncStatus', 'synced');
  product.set('syncError', null);
  product.set('lastSyncedAt', new Date());
  await product.save(null, { useMasterKey: true });

  return { success: true, fbProductId: product.get('fbProductId'), productId: product.id };
});

/**
 * syncAllProducts — Sync all pending/stale products to Facebook catalog.
 * Params: businessId
 */
Parse.Cloud.define('syncAllProducts', async function (request) {
  const { businessId } = request.params;

  if (!businessId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId is required');
  }

  const business = await getBusinessById(businessId);

  if (!business.get('fbCatalogId')) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Business does not have a fbCatalogId configured');
  }

  // Find products that need syncing
  const pendingQuery = new Parse.Query('Product');
  pendingQuery.equalTo('business', business);
  pendingQuery.containedIn('syncStatus', ['pending', 'error']);

  const staleQuery = new Parse.Query('Product');
  staleQuery.equalTo('business', business);
  staleQuery.equalTo('syncStatus', 'synced');
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 7); // Older than 7 days
  staleQuery.lessThan('lastSyncedAt', staleDate);

  const neverSyncedQuery = new Parse.Query('Product');
  neverSyncedQuery.equalTo('business', business);
  neverSyncedQuery.doesNotExist('syncStatus');

  const mainQuery = Parse.Query.or(pendingQuery, staleQuery, neverSyncedQuery);
  mainQuery.limit(100);
  const products = await mainQuery.find({ useMasterKey: true });

  let synced = 0;
  let errors = 0;

  for (const product of products) {
    try {
      await Parse.Cloud.run('syncProductToCatalog', {
        businessId: businessId,
        productId: product.id,
      }, { useMasterKey: true });
      synced++;
    } catch (err) {
      console.error('[syncAllProducts] Failed to sync product ' + product.id + ':', err.message);
      errors++;
    }
  }

  return { success: true, total: products.length, synced: synced, errors: errors };
});

/**
 * refreshAccessToken — Exchange a short-lived token for a long-lived one.
 * Params: businessId, shortLivedToken
 */
Parse.Cloud.define('refreshAccessToken', async function (request) {
  const { businessId, shortLivedToken } = request.params;

  if (!businessId || !shortLivedToken) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and shortLivedToken are required');
  }

  const business = await getBusinessById(businessId);
  const appId = business.get('fbAppId') || process.env.FB_APP_ID;
  const appSecret = business.get('fbAppSecret') || process.env.FB_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Facebook App ID and App Secret are required');
  }

  const url = GRAPH_API_BASE + '/oauth/access_token'
    + '?grant_type=fb_exchange_token'
    + '&client_id=' + appId
    + '&client_secret=' + appSecret
    + '&fb_exchange_token=' + shortLivedToken;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Token exchange failed: ' + JSON.stringify(data));
  }

  const longLivedToken = data.access_token;
  const expiresIn = data.expires_in || 5184000; // Default 60 days
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Update or create TokenStore entry
  const tokenQuery = new Parse.Query('TokenStore');
  tokenQuery.equalTo('business', business);
  tokenQuery.equalTo('platform', 'facebook');
  let tokenRecord = await tokenQuery.first({ useMasterKey: true });

  if (!tokenRecord) {
    tokenRecord = new Parse.Object('TokenStore');
    tokenRecord.set('business', business);
    tokenRecord.set('platform', 'facebook');
  }

  tokenRecord.set('accessToken', longLivedToken);
  tokenRecord.set('expiresAt', expiresAt);
  tokenRecord.set('tokenType', 'long_lived');
  tokenRecord.set('refreshedAt', new Date());
  await tokenRecord.save(null, { useMasterKey: true });

  // Also update the Business object's pageAccessToken
  business.set('pageAccessToken', longLivedToken);
  await business.save(null, { useMasterKey: true });

  return {
    success: true,
    expiresAt: expiresAt.toISOString(),
    expiresIn: expiresIn,
  };
});

/**
 * validateToken — Check if a Business's access token is still valid.
 * Params: businessId
 */
Parse.Cloud.define('validateToken', async function (request) {
  const { businessId } = request.params;

  if (!businessId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId is required');
  }

  const business = await getBusinessById(businessId);
  const appId = business.get('fbAppId') || process.env.FB_APP_ID;
  const appSecret = business.get('fbAppSecret') || process.env.FB_APP_SECRET;

  let token;
  try {
    token = await getPageAccessToken(business);
  } catch (err) {
    return { valid: false, error: 'No token available' };
  }

  const appAccessToken = appId + '|' + appSecret;
  const url = GRAPH_API_BASE + '/debug_token?input_token=' + token + '&access_token=' + appAccessToken;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    return { valid: false, error: 'Debug token request failed', details: data };
  }

  const tokenData = data.data || {};

  return {
    valid: tokenData.is_valid || false,
    appId: tokenData.app_id || '',
    userId: tokenData.user_id || '',
    type: tokenData.type || '',
    expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null,
    scopes: tokenData.scopes || [],
    granularScopes: tokenData.granular_scopes || [],
    error: tokenData.error || null,
  };
});

/**
 * getCampaignInsights — Fetch insights for an ad campaign.
 * Params: businessId, campaignId, dateRange ({ since, until } ISO date strings)
 */
Parse.Cloud.define('getCampaignInsights', async function (request) {
  const { businessId, campaignId, dateRange } = request.params;

  if (!businessId || !campaignId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId and campaignId are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);

  let url = GRAPH_API_BASE + '/' + campaignId + '/insights'
    + '?access_token=' + token
    + '&fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type,conversions';

  if (dateRange && dateRange.since && dateRange.until) {
    url += '&time_range=' + JSON.stringify({
      since: dateRange.since,
      until: dateRange.until,
    });
  }

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Insights fetch failed: ' + JSON.stringify(data));
  }

  const insights = data.data && data.data.length > 0 ? data.data[0] : {};

  // Update the AdCampaign record with latest metrics
  const campaignQuery = new Parse.Query('AdCampaign');
  campaignQuery.equalTo('business', business);
  campaignQuery.equalTo('fbCampaignId', campaignId);
  const campaign = await campaignQuery.first({ useMasterKey: true });

  if (campaign) {
    campaign.set('metrics', {
      impressions: parseInt(insights.impressions || '0', 10),
      reach: parseInt(insights.reach || '0', 10),
      clicks: parseInt(insights.clicks || '0', 10),
      spend: parseFloat(insights.spend || '0'),
      cpc: parseFloat(insights.cpc || '0'),
      cpm: parseFloat(insights.cpm || '0'),
      ctr: parseFloat(insights.ctr || '0'),
      actions: insights.actions || [],
      costPerAction: insights.cost_per_action_type || [],
      conversions: insights.conversions || [],
    });
    campaign.set('metricsUpdatedAt', new Date());
    await campaign.save(null, { useMasterKey: true });
  }

  return { success: true, insights: insights };
});

// =============================================================================
// Scheduled Jobs
// =============================================================================

/**
 * syncPageInsights — Sync page-level insights for all active businesses.
 */
Parse.Cloud.job('syncPageInsights', async function (request) {
  const { message } = request;
  message('Starting syncPageInsights job');

  const businessQuery = new Parse.Query('Business');
  businessQuery.equalTo('isActive', true);
  businessQuery.exists('fbPageId');
  businessQuery.limit(1000);
  const businesses = await businessQuery.find({ useMasterKey: true });

  let processed = 0;
  let errors = 0;

  for (const business of businesses) {
    try {
      const pageId = business.get('fbPageId');
      const token = await getPageAccessToken(business);

      const metricsToFetch = [
        'page_views_total',
        'page_fan_adds',
        'page_engaged_users',
        'page_impressions',
      ];

      const url = GRAPH_API_BASE + '/' + pageId + '/insights'
        + '?metric=' + metricsToFetch.join(',')
        + '&period=day'
        + '&access_token=' + token;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error('[syncPageInsights] Failed for business ' + business.id + ':', JSON.stringify(data.error || data));
        errors++;
        continue;
      }

      const insightsData = data.data || [];
      const metricsMap = {};

      for (const metric of insightsData) {
        const metricName = metric.name;
        const values = metric.values || [];
        if (values.length > 0) {
          // Get the most recent value
          const latestValue = values[values.length - 1];
          metricsMap[metricName] = latestValue.value;
        }
      }

      // Save PageInsight record
      const pageInsight = new Parse.Object('PageInsight');
      pageInsight.set('business', business);
      pageInsight.set('date', new Date());
      pageInsight.set('pageViews', metricsMap.page_views_total || 0);
      pageInsight.set('newFans', metricsMap.page_fan_adds || 0);
      pageInsight.set('engagedUsers', metricsMap.page_engaged_users || 0);
      pageInsight.set('impressions', metricsMap.page_impressions || 0);
      pageInsight.set('rawMetrics', metricsMap);
      await pageInsight.save(null, { useMasterKey: true });

      processed++;
    } catch (err) {
      console.error('[syncPageInsights] Error for business ' + business.id + ':', err.message);
      errors++;
    }
  }

  message('syncPageInsights complete: processed=' + processed + ', errors=' + errors);
});

/**
 * syncCampaignMetrics — Sync metrics for all active ad campaigns.
 */
Parse.Cloud.job('syncCampaignMetrics', async function (request) {
  const { message } = request;
  message('Starting syncCampaignMetrics job');

  const businessQuery = new Parse.Query('Business');
  businessQuery.equalTo('isActive', true);
  businessQuery.limit(1000);
  const businesses = await businessQuery.find({ useMasterKey: true });

  let processed = 0;
  let errors = 0;

  for (const business of businesses) {
    try {
      const campaignQuery = new Parse.Query('AdCampaign');
      campaignQuery.equalTo('business', business);
      campaignQuery.equalTo('status', 'ACTIVE');
      campaignQuery.limit(100);
      const campaigns = await campaignQuery.find({ useMasterKey: true });

      for (const campaign of campaigns) {
        try {
          const fbCampaignId = campaign.get('fbCampaignId');
          if (!fbCampaignId) continue;

          await Parse.Cloud.run('getCampaignInsights', {
            businessId: business.id,
            campaignId: fbCampaignId,
          }, { useMasterKey: true });

          processed++;
        } catch (campaignErr) {
          console.error('[syncCampaignMetrics] Campaign ' + campaign.id + ' error:', campaignErr.message);
          errors++;
        }
      }
    } catch (err) {
      console.error('[syncCampaignMetrics] Business ' + business.id + ' error:', err.message);
      errors++;
    }
  }

  message('syncCampaignMetrics complete: processed=' + processed + ', errors=' + errors);
});

/**
 * syncProductCatalog — Sync products for the InnovateHub business.
 */
Parse.Cloud.job('syncProductCatalog', async function (request) {
  const { message } = request;
  message('Starting syncProductCatalog job');

  const businessQuery = new Parse.Query('Business');
  businessQuery.equalTo('slug', 'innovatehub');
  const business = await businessQuery.first({ useMasterKey: true });

  if (!business) {
    message('No business found with slug=innovatehub');
    return;
  }

  if (!business.get('fbCatalogId')) {
    message('Business does not have a fbCatalogId');
    return;
  }

  try {
    const result = await Parse.Cloud.run('syncAllProducts', {
      businessId: business.id,
    }, { useMasterKey: true });

    message('syncProductCatalog complete: ' + JSON.stringify(result));
  } catch (err) {
    console.error('[syncProductCatalog] Error:', err.message);
    message('syncProductCatalog failed: ' + err.message);
  }
});

/**
 * processScheduledPosts — Publish posts that are scheduled for now or past.
 */
Parse.Cloud.job('processScheduledPosts', async function (request) {
  const { message } = request;
  message('Starting processScheduledPosts job');

  const now = new Date();
  const postQuery = new Parse.Query('PagePost');
  postQuery.equalTo('status', 'scheduled');
  postQuery.lessThanOrEqualTo('scheduledFor', now);
  postQuery.include('business');
  postQuery.limit(100);
  const posts = await postQuery.find({ useMasterKey: true });

  let published = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      const business = post.get('business');
      if (!business) {
        console.error('[processScheduledPosts] Post ' + post.id + ' has no business');
        errors++;
        continue;
      }

      const result = await Parse.Cloud.run('publishPost', {
        businessId: business.id,
        content: post.get('content') || '',
        mediaUrls: post.get('mediaUrls') || [],
        link: post.get('link') || '',
      }, { useMasterKey: true });

      // Update the original scheduled post record
      post.set('status', 'published');
      post.set('publishedAt', new Date());
      post.set('fbPostId', result.postId || '');
      await post.save(null, { useMasterKey: true });

      // Update the ScheduledAction
      const actionQuery = new Parse.Query('ScheduledAction');
      actionQuery.equalTo('targetClass', 'PagePost');
      actionQuery.equalTo('targetId', post.id);
      actionQuery.equalTo('status', 'pending');
      const action = await actionQuery.first({ useMasterKey: true });
      if (action) {
        action.set('status', 'completed');
        action.set('completedAt', new Date());
        await action.save(null, { useMasterKey: true });
      }

      published++;
    } catch (err) {
      console.error('[processScheduledPosts] Post ' + post.id + ' failed:', err.message);
      post.set('status', 'failed');
      post.set('publishError', err.message);
      await post.save(null, { useMasterKey: true });
      errors++;
    }
  }

  message('processScheduledPosts complete: published=' + published + ', errors=' + errors);
});

/**
 * refreshExpiringTokens — Refresh tokens that expire within the next 7 days.
 */
Parse.Cloud.job('refreshExpiringTokens', async function (request) {
  const { message } = request;
  message('Starting refreshExpiringTokens job');

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const tokenQuery = new Parse.Query('TokenStore');
  tokenQuery.equalTo('platform', 'facebook');
  tokenQuery.lessThan('expiresAt', sevenDaysFromNow);
  tokenQuery.greaterThan('expiresAt', new Date()); // Not already expired
  tokenQuery.include('business');
  tokenQuery.limit(1000);
  const tokens = await tokenQuery.find({ useMasterKey: true });

  let refreshed = 0;
  let errors = 0;

  for (const tokenRecord of tokens) {
    try {
      const business = tokenRecord.get('business');
      if (!business) {
        console.error('[refreshExpiringTokens] Token ' + tokenRecord.id + ' has no business');
        errors++;
        continue;
      }

      const currentToken = tokenRecord.get('accessToken');
      const appId = business.get('fbAppId') || process.env.FB_APP_ID;
      const appSecret = business.get('fbAppSecret') || process.env.FB_APP_SECRET;

      if (!appId || !appSecret) {
        console.error('[refreshExpiringTokens] No app credentials for business ' + business.id);
        errors++;
        continue;
      }

      // Exchange the current long-lived token for a new one
      const url = GRAPH_API_BASE + '/oauth/access_token'
        + '?grant_type=fb_exchange_token'
        + '&client_id=' + appId
        + '&client_secret=' + appSecret
        + '&fb_exchange_token=' + currentToken;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error('[refreshExpiringTokens] Refresh failed for business ' + business.id + ':', JSON.stringify(data));
        errors++;
        continue;
      }

      const newToken = data.access_token;
      const expiresIn = data.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      tokenRecord.set('accessToken', newToken);
      tokenRecord.set('expiresAt', expiresAt);
      tokenRecord.set('tokenType', 'long_lived');
      tokenRecord.set('refreshedAt', new Date());
      await tokenRecord.save(null, { useMasterKey: true });

      // Also update the Business object
      business.set('pageAccessToken', newToken);
      await business.save(null, { useMasterKey: true });

      refreshed++;
    } catch (err) {
      console.error('[refreshExpiringTokens] Error:', err.message);
      errors++;
    }
  }

  message('refreshExpiringTokens complete: refreshed=' + refreshed + ', errors=' + errors);
});

/**
 * cleanupWebhookLogs — Delete WebhookLog entries older than 30 days.
 */
Parse.Cloud.job('cleanupWebhookLogs', async function (request) {
  const { message } = request;
  message('Starting cleanupWebhookLogs job');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const logQuery = new Parse.Query('WebhookLog');
    logQuery.lessThan('createdAt', thirtyDaysAgo);
    logQuery.limit(1000);
    const logs = await logQuery.find({ useMasterKey: true });

    if (logs.length === 0) {
      hasMore = false;
      break;
    }

    await Parse.Object.destroyAll(logs, { useMasterKey: true });
    totalDeleted += logs.length;

    // Safety valve
    if (totalDeleted > 50000) {
      message('Hit 50000 deletion safety limit');
      break;
    }
  }

  message('cleanupWebhookLogs complete: deleted=' + totalDeleted);
});

// =============================================================================
// Triggers
// =============================================================================

/**
 * beforeSave Message — If business is not set, look it up from the conversation.
 */
Parse.Cloud.beforeSave('Message', async function (request) {
  const message = request.object;

  if (!message.get('business')) {
    const conversation = message.get('conversation');
    if (conversation) {
      try {
        let convObj = conversation;
        // Fetch the conversation if it's just a pointer
        if (!convObj.get('business')) {
          convObj = await new Parse.Query('Conversation').get(conversation.id, { useMasterKey: true });
        }
        const business = convObj.get('business');
        if (business) {
          message.set('business', business);
        }
      } catch (err) {
        console.error('[beforeSave Message] Failed to resolve business from conversation:', err.message);
      }
    }
  }
});

/**
 * afterSave FbLead — When a new lead is created:
 * 1. Find/create a MessengerContact and link it
 * 2. Check for LeadMagnet linked to formId → auto-deliver via Messenger
 * 3. Check for matching NurtureSequence → auto-enroll
 * 4. Detect agent recruitment leads → set pipelineStage
 * 5. Trigger 'new_lead' BotFlow if exists
 */
Parse.Cloud.afterSave('FbLead', async function (request) {
  const fbLead = request.object;

  // Only process newly created leads
  if (!fbLead.existed()) {
    try {
      const business = fbLead.get('business');
      if (!business) return;

      // Fetch business if it's just a pointer
      let businessObj = business;
      if (!businessObj.get('name')) {
        businessObj = await new Parse.Query('Business').get(business.id, { useMasterKey: true });
      }

      const fieldData = fbLead.get('fieldData') || {};
      const formId = fbLead.get('formId') || '';

      // Find or create a MessengerContact from the lead data
      const email = fieldData.email || fieldData.work_email || '';
      const phone = fieldData.phone_number || fieldData.phone || '';

      let contact = null;

      if (email) {
        const emailQuery = new Parse.Query('MessengerContact');
        emailQuery.equalTo('business', businessObj);
        emailQuery.equalTo('email', email);
        contact = await emailQuery.first({ useMasterKey: true });
      }

      if (!contact && phone) {
        const phoneQuery = new Parse.Query('MessengerContact');
        phoneQuery.equalTo('business', businessObj);
        phoneQuery.equalTo('phone', phone);
        contact = await phoneQuery.first({ useMasterKey: true });
      }

      if (!contact) {
        contact = new Parse.Object('MessengerContact');
        contact.set('business', businessObj);
        contact.set('channel', 'lead_form');
        contact.set('firstName', fieldData.first_name || fieldData.full_name || '');
        contact.set('lastName', fieldData.last_name || '');
        contact.set('email', email);
        contact.set('phone', phone);
        contact.set('psid', '');
        contact.set('source', 'lead_ad');
        contact.set('lastInteractionAt', new Date());
        await contact.save(null, { useMasterKey: true });
      }

      // Link the lead to the contact
      fbLead.set('contact', contact);

      // --- Detect agent recruitment leads → set pipeline stage ---
      const agentKeywords = ['agent', 'partner', 'negosyo', 'franchise', 'business opportunity'];
      const allFieldText = Object.values(fieldData).join(' ').toLowerCase();
      const isAgentLead = agentKeywords.some(function (kw) { return allFieldText.includes(kw); });

      if (isAgentLead) {
        fbLead.set('pipelineStage', 'inquiry');
        fbLead.set('agentType', fieldData.agent_type || 'standard');
        fbLead.set('stageChangedAt', new Date());
      }

      await fbLead.save(null, { useMasterKey: true });

      const psid = contact.get('psid');
      let token;
      try {
        token = await getPageAccessToken(businessObj);
      } catch (err) {
        console.error('[afterSave FbLead] Cannot get token:', err.message);
        token = null;
      }

      // --- Check for LeadMagnet linked to formId → auto-deliver ---
      if (formId && psid && token) {
        try {
          const magnetQuery = new Parse.Query('LeadMagnet');
          magnetQuery.equalTo('business', businessObj);
          magnetQuery.equalTo('formId', formId);
          magnetQuery.equalTo('isActive', true);
          const magnet = await magnetQuery.first({ useMasterKey: true });

          if (magnet) {
            const deliveryMsg = magnet.get('deliveryMessage') || 'Here is your download!';
            const contentUrl = magnet.get('contentUrl') || '';
            const promoCode = magnet.get('promoCode') || '';

            let messageText = deliveryMsg;
            if (promoCode) {
              messageText += '\n\nYour promo code: ' + promoCode;
            }

            await callSendApi(token, psid, { text: messageText });

            if (contentUrl) {
              await callSendApi(token, psid, {
                attachment: {
                  type: 'file',
                  payload: { url: contentUrl, is_reusable: true },
                },
              });
            }

            magnet.increment('downloadCount');
            await magnet.save(null, { useMasterKey: true });
            console.log('[afterSave FbLead] Delivered lead magnet: ' + magnet.get('name'));
          }
        } catch (magnetErr) {
          console.error('[afterSave FbLead] LeadMagnet delivery error:', magnetErr.message);
        }
      }

      // --- Check for matching NurtureSequence → auto-enroll ---
      try {
        const seqQuery = new Parse.Query('NurtureSequence');
        seqQuery.equalTo('business', businessObj);
        seqQuery.equalTo('isActive', true);
        seqQuery.equalTo('triggerEvent', 'new_lead');
        const sequences = await seqQuery.find({ useMasterKey: true });

        for (const seq of sequences) {
          const audience = seq.get('targetAudience') || 'both';
          if (audience === 'agent' && !isAgentLead) continue;
          if (audience === 'customer' && isAgentLead) continue;

          // Check if already enrolled
          const existingEnroll = new Parse.Query('NurtureEnrollment');
          existingEnroll.equalTo('lead', fbLead);
          existingEnroll.equalTo('sequence', seq);
          const alreadyEnrolled = await existingEnroll.first({ useMasterKey: true });
          if (alreadyEnrolled) continue;

          const steps = seq.get('steps') || [];
          if (steps.length === 0) continue;

          const firstStep = steps[0];
          const delayMs = ((firstStep.delayDays || 0) * 86400000) + ((firstStep.delayHours || 0) * 3600000);

          const enrollment = new Parse.Object('NurtureEnrollment');
          enrollment.set('business', businessObj);
          enrollment.set('lead', fbLead);
          enrollment.set('contact', contact);
          enrollment.set('sequence', seq);
          enrollment.set('currentStep', 0);
          enrollment.set('status', 'active');
          enrollment.set('enrolledAt', new Date());
          enrollment.set('nextSendAt', new Date(Date.now() + delayMs));
          await enrollment.save(null, { useMasterKey: true });
          console.log('[afterSave FbLead] Enrolled in nurture: ' + seq.get('name'));
        }
      } catch (nurtureErr) {
        console.error('[afterSave FbLead] Nurture enrollment error:', nurtureErr.message);
      }

      // --- Trigger 'new_lead' BotFlow ---
      if (psid && token) {
        const flowQuery = new Parse.Query('BotFlow');
        flowQuery.equalTo('business', businessObj);
        flowQuery.equalTo('isActive', true);
        const flows = await flowQuery.find({ useMasterKey: true });

        for (const flow of flows) {
          const keywords = flow.get('triggerKeywords') || [];
          if (!keywords.some(function (kw) { return kw.toLowerCase() === 'new_lead'; })) {
            continue;
          }

          const steps = flow.get('steps') || [];
          for (const step of steps) {
            let messagePayload;
            if (step.type === 'text') {
              messagePayload = { text: step.content };
            } else if (step.type === 'image') {
              messagePayload = {
                attachment: { type: 'image', payload: { url: step.url, is_reusable: true } },
              };
            } else if (step.type === 'quick_replies') {
              messagePayload = {
                text: step.content,
                quick_replies: (step.quickReplies || []).map(function (qr) {
                  return { content_type: 'text', title: qr.title, payload: qr.payload || qr.title };
                }),
              };
            } else {
              messagePayload = { text: step.content || '' };
            }

            await callSendApi(token, psid, messagePayload);
          }

          break; // Only execute the first matching flow
        }
      } else if (!psid) {
        console.log('[afterSave FbLead] Contact has no PSID, cannot send messages');
      }
    } catch (err) {
      console.error('[afterSave FbLead] Error:', err.message, err.stack);
    }
  }
});

/**
 * beforeSave Product — If relevant fields changed, set syncStatus to 'pending'.
 */
Parse.Cloud.beforeSave('Product', async function (request) {
  const product = request.object;

  // Only for existing objects (not new)
  if (!product.isNew()) {
    const syncFields = ['name', 'price', 'description', 'imageUrls'];
    const changed = syncFields.some(function (field) {
      return product.dirty(field);
    });

    if (changed) {
      product.set('syncStatus', 'pending');
    }
  }
});

/**
 * afterSave PagePost — If status changed to 'published' and it was not done
 * by the processScheduledPosts job (i.e., manual publish), trigger publish.
 */
Parse.Cloud.afterSave('PagePost', async function (request) {
  const pagePost = request.object;
  const original = request.original;

  // Only process updates (not new objects)
  if (!original) return;

  const previousStatus = original.get('status');
  const currentStatus = pagePost.get('status');

  // If status just changed to 'published' from something other than 'scheduled',
  // or if it was changed to 'published' from 'draft' manually
  if (currentStatus === 'published' && previousStatus === 'draft') {
    try {
      const business = pagePost.get('business');
      if (!business) return;

      let businessObj = business;
      if (!businessObj.get('fbPageId')) {
        businessObj = await new Parse.Query('Business').get(business.id, { useMasterKey: true });
      }

      // Only publish if there's no fbPostId yet (not already published)
      if (!pagePost.get('fbPostId')) {
        const result = await Parse.Cloud.run('publishPost', {
          businessId: businessObj.id,
          content: pagePost.get('content') || '',
          mediaUrls: pagePost.get('mediaUrls') || [],
          link: pagePost.get('link') || '',
        }, { useMasterKey: true });

        pagePost.set('fbPostId', result.postId || '');
        pagePost.set('publishedAt', new Date());
        await pagePost.save(null, { useMasterKey: true });
      }
    } catch (err) {
      console.error('[afterSave PagePost] Manual publish error:', err.message, err.stack);
    }
  }
});

// =============================================================================
// Marketing Automation Cloud Functions
// =============================================================================

/**
 * deliverLeadMagnet — Manually deliver a lead magnet to a contact.
 * Params: businessId, leadMagnetId, contactId
 */
Parse.Cloud.define('deliverLeadMagnet', async function (request) {
  const { businessId, leadMagnetId, contactId } = request.params;

  if (!businessId || !leadMagnetId || !contactId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId, leadMagnetId, and contactId are required');
  }

  const business = await getBusinessById(businessId);
  const token = await getPageAccessToken(business);

  const magnetQuery = new Parse.Query('LeadMagnet');
  magnetQuery.equalTo('business', business);
  const magnet = await magnetQuery.get(leadMagnetId, { useMasterKey: true });

  const contactQuery = new Parse.Query('MessengerContact');
  const contact = await contactQuery.get(contactId, { useMasterKey: true });
  const psid = contact.get('psid');

  if (!psid) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Contact has no Messenger PSID');
  }

  const deliveryMsg = magnet.get('deliveryMessage') || 'Here is your download!';
  const contentUrl = magnet.get('contentUrl') || '';
  const promoCode = magnet.get('promoCode') || '';

  let messageText = deliveryMsg;
  if (promoCode) {
    messageText += '\n\nYour promo code: ' + promoCode;
  }

  await callSendApi(token, psid, { text: messageText });

  if (contentUrl) {
    await callSendApi(token, psid, {
      attachment: { type: 'file', payload: { url: contentUrl, is_reusable: true } },
    });
  }

  magnet.increment('downloadCount');
  await magnet.save(null, { useMasterKey: true });

  return { success: true, magnetName: magnet.get('name'), deliveredTo: psid };
});

/**
 * enrollInNurture — Manually enroll a lead in a nurture sequence.
 * Params: businessId, leadId, sequenceId
 */
Parse.Cloud.define('enrollInNurture', async function (request) {
  const { businessId, leadId, sequenceId } = request.params;

  if (!businessId || !leadId || !sequenceId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId, leadId, and sequenceId are required');
  }

  const business = await getBusinessById(businessId);

  const leadQuery = new Parse.Query('FbLead');
  leadQuery.equalTo('business', business);
  leadQuery.include('contact');
  const lead = await leadQuery.get(leadId, { useMasterKey: true });

  const seqQuery = new Parse.Query('NurtureSequence');
  seqQuery.equalTo('business', business);
  const sequence = await seqQuery.get(sequenceId, { useMasterKey: true });

  // Check if already enrolled
  const existingQuery = new Parse.Query('NurtureEnrollment');
  existingQuery.equalTo('lead', lead);
  existingQuery.equalTo('sequence', sequence);
  existingQuery.containedIn('status', ['active', 'paused']);
  const existing = await existingQuery.first({ useMasterKey: true });

  if (existing) {
    throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Lead is already enrolled in this sequence');
  }

  const steps = sequence.get('steps') || [];
  if (steps.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Sequence has no steps');
  }

  const firstStep = steps[0];
  const delayMs = ((firstStep.delayDays || 0) * 86400000) + ((firstStep.delayHours || 0) * 3600000);

  const contact = lead.get('contact');

  const enrollment = new Parse.Object('NurtureEnrollment');
  enrollment.set('business', business);
  enrollment.set('lead', lead);
  enrollment.set('contact', contact || null);
  enrollment.set('sequence', sequence);
  enrollment.set('currentStep', 0);
  enrollment.set('status', 'active');
  enrollment.set('enrolledAt', new Date());
  enrollment.set('nextSendAt', new Date(Date.now() + delayMs));
  await enrollment.save(null, { useMasterKey: true });

  return { success: true, enrollmentId: enrollment.id, nextSendAt: enrollment.get('nextSendAt').toISOString() };
});

/**
 * processNurtureSequences — Cloud Job (runs hourly) — the automation engine.
 * Finds enrollments where nextSendAt <= now, sends the next step, advances.
 */
Parse.Cloud.job('processNurtureSequences', async function (request) {
  const { message } = request;
  message('Starting processNurtureSequences job');

  const now = new Date();
  const enrollQuery = new Parse.Query('NurtureEnrollment');
  enrollQuery.equalTo('status', 'active');
  enrollQuery.lessThanOrEqualTo('nextSendAt', now);
  enrollQuery.include('sequence');
  enrollQuery.include('contact');
  enrollQuery.include('lead');
  enrollQuery.include('business');
  enrollQuery.limit(200);
  const enrollments = await enrollQuery.find({ useMasterKey: true });

  let sent = 0;
  let completed = 0;
  let errors = 0;

  for (const enrollment of enrollments) {
    try {
      const sequence = enrollment.get('sequence');
      const contact = enrollment.get('contact');
      let business = enrollment.get('business');

      if (!sequence || !contact || !business) {
        console.error('[processNurtureSequences] Missing data for enrollment ' + enrollment.id);
        errors++;
        continue;
      }

      // Fetch business if just a pointer
      if (!business.get('name')) {
        business = await new Parse.Query('Business').get(business.id, { useMasterKey: true });
      }

      const psid = contact.get('psid');
      if (!psid) {
        console.log('[processNurtureSequences] Contact has no PSID, skipping enrollment ' + enrollment.id);
        continue;
      }

      const steps = sequence.get('steps') || [];
      const currentStep = enrollment.get('currentStep') || 0;

      if (currentStep >= steps.length) {
        enrollment.set('status', 'completed');
        await enrollment.save(null, { useMasterKey: true });
        completed++;
        continue;
      }

      const step = steps[currentStep];
      let token;
      try {
        token = await getPageAccessToken(business);
      } catch (tokenErr) {
        console.error('[processNurtureSequences] Cannot get token for business ' + business.id);
        errors++;
        continue;
      }

      // Build message payload based on step type
      let messagePayload;
      const msgType = step.messageType || step.type || 'text';

      if (msgType === 'text') {
        messagePayload = { text: step.content };
      } else if (msgType === 'quick_replies') {
        messagePayload = {
          text: step.content,
          quick_replies: (step.quickReplies || []).map(function (qr) {
            return { content_type: 'text', title: qr.title, payload: qr.payload || qr.title };
          }),
        };
      } else if (msgType === 'buttons') {
        const btns = (step.buttons || []).map(function (btn) {
          if (btn.url) {
            return { type: 'web_url', url: btn.url, title: btn.title };
          }
          return { type: 'postback', title: btn.title, payload: btn.payload || btn.title };
        });
        // Add unsubscribe button
        btns.push({ type: 'postback', title: 'Unsubscribe', payload: 'UNSUBSCRIBE' });
        messagePayload = {
          attachment: {
            type: 'template',
            payload: { template_type: 'button', text: step.content, buttons: btns.slice(0, 3) },
          },
        };
      } else if (msgType === 'image') {
        messagePayload = {
          attachment: { type: 'image', payload: { url: step.url || step.content, is_reusable: true } },
        };
      } else {
        messagePayload = { text: step.content || '' };
      }

      // Use MESSAGE_TAG since this is >24hrs after initial interaction
      await callSendApiWithTag(token, psid, messagePayload, 'CONFIRMED_EVENT_UPDATE');
      sent++;

      // Advance to next step
      const nextStepIdx = currentStep + 1;
      enrollment.set('currentStep', nextStepIdx);
      enrollment.set('lastSentAt', new Date());

      if (nextStepIdx >= steps.length) {
        enrollment.set('status', 'completed');
        enrollment.set('nextSendAt', null);
        completed++;
      } else {
        const nextStep = steps[nextStepIdx];
        const nextDelayMs = ((nextStep.delayDays || 0) * 86400000) + ((nextStep.delayHours || 0) * 3600000);
        enrollment.set('nextSendAt', new Date(Date.now() + nextDelayMs));
      }

      await enrollment.save(null, { useMasterKey: true });
    } catch (err) {
      console.error('[processNurtureSequences] Error for enrollment ' + enrollment.id + ':', err.message);
      errors++;
    }
  }

  message('processNurtureSequences complete: sent=' + sent + ', completed=' + completed + ', errors=' + errors);
});

/**
 * seedPlatapayData — Create PlataPay bot flows, lead magnets, and nurture sequences.
 * Params: businessId (the PlataPay business ID)
 */
Parse.Cloud.define('seedPlatapayData', async function (request) {
  const { businessId } = request.params;
  if (!businessId) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'businessId is required');
  }

  const business = await getBusinessById(businessId);
  const results = { botFlows: 0, leadMagnets: 0, nurtureSequences: 0 };

  // --- Bot Flows ---
  const botFlowDefs = [
    {
      name: 'Agent Recruitment',
      channel: 'messenger',
      triggerKeywords: ['agent', 'partner', 'earn', 'negosyo', 'kita'],
      steps: [
        { type: 'text', content: 'Interested to become a PlataPay Agent? Great choice! 💼\n\nAs a PlataPay agent, you can earn from:\n• Bills payment commissions\n• E-load transactions\n• Remittance services\n• QR payments' },
        { type: 'quick_replies', content: 'What would you like to know?', quickReplies: [
          { title: 'How to Apply', payload: 'AGENT_HOW_TO_APPLY' },
          { title: 'Requirements', payload: 'AGENT_REQUIREMENTS' },
          { title: 'Earnings', payload: 'AGENT_EARNINGS' },
        ]},
      ],
    },
    {
      name: 'Agent Application Process',
      channel: 'messenger',
      triggerKeywords: ['how to apply', 'AGENT_HOW_TO_APPLY', 'apply as agent', 'mag-apply'],
      steps: [
        { type: 'text', content: 'Here\'s how to become a PlataPay Agent:\n\n1️⃣ Fill out the application form\n2️⃣ Submit required documents\n3️⃣ Attend online orientation\n4️⃣ Set up your PlataPay terminal\n5️⃣ Start earning!' },
        { type: 'buttons', content: 'Ready to start your application?', buttons: [
          { title: 'Apply Now', url: 'https://platapay.ph/agent-signup' },
          { title: 'Talk to Agent Support', payload: 'AGENT_SUPPORT' },
        ]},
      ],
    },
    {
      name: 'Agent Requirements',
      channel: 'messenger',
      triggerKeywords: ['requirements', 'AGENT_REQUIREMENTS', 'kailangan', 'need what'],
      steps: [
        { type: 'text', content: 'PlataPay Agent Requirements:\n\n📋 Valid Government ID\n📱 Smartphone with internet\n📍 Physical location (store/shop preferred)\n💰 Minimum top-up deposit\n📧 Active email address\n\nNo franchise fee required!' },
        { type: 'quick_replies', content: 'Need more info?', quickReplies: [
          { title: 'Apply Now', payload: 'AGENT_HOW_TO_APPLY' },
          { title: 'Earnings Info', payload: 'AGENT_EARNINGS' },
        ]},
      ],
    },
    {
      name: 'Agent Earnings',
      channel: 'messenger',
      triggerKeywords: ['earnings', 'how much', 'AGENT_EARNINGS', 'magkano kitain', 'income'],
      steps: [
        { type: 'text', content: 'PlataPay Agent Earning Potential:\n\n💵 Bills Payment: ₱3-₱15 per transaction\n📱 E-Load: 2-5% commission\n💸 Remittance: ₱25-₱50 per transaction\n📊 Average: ₱15,000-₱40,000/month\n\nTop agents earn ₱80,000+/month!' },
        { type: 'buttons', content: 'Ready to start earning?', buttons: [
          { title: 'Apply Now', url: 'https://platapay.ph/agent-signup' },
          { title: 'Download Guide', payload: 'DOWNLOAD_AGENT_GUIDE' },
        ]},
      ],
    },
    {
      name: 'Customer Services',
      channel: 'messenger',
      triggerKeywords: ['bills', 'load', 'remit', 'pay', 'padala', 'bayad', 'services'],
      steps: [
        { type: 'text', content: 'PlataPay Services:\n\n💡 Bills Payment — electricity, water, internet, and more\n📱 E-Load — all networks\n💸 Remittance — send money nationwide\n🏪 QR Payments — pay and get paid easily' },
        { type: 'quick_replies', content: 'How can we help you today?', quickReplies: [
          { title: 'Find Agent', payload: 'FIND_NEAREST_AGENT' },
          { title: 'Download App', payload: 'DOWNLOAD_APP' },
          { title: 'Become Agent', payload: 'AGENT_HOW_TO_APPLY' },
        ]},
      ],
    },
    {
      name: 'New Lead Welcome',
      channel: 'messenger',
      triggerKeywords: ['new_lead'],
      steps: [
        { type: 'text', content: 'Welcome to PlataPay! 🎉 Thank you for your interest.\n\nWe received your details and our team will get in touch shortly.' },
        { type: 'quick_replies', content: 'In the meantime, what are you interested in?', quickReplies: [
          { title: 'Become an Agent', payload: 'AGENT_HOW_TO_APPLY' },
          { title: 'PlataPay Services', payload: 'CUSTOMER_SERVICES' },
          { title: 'Talk to Support', payload: 'TALK_TO_SUPPORT' },
        ]},
      ],
    },
  ];

  for (const def of botFlowDefs) {
    // Skip if already exists
    const existQuery = new Parse.Query('BotFlow');
    existQuery.equalTo('business', business);
    existQuery.equalTo('name', def.name);
    const exists = await existQuery.first({ useMasterKey: true });
    if (exists) continue;

    const flow = new Parse.Object('BotFlow');
    flow.set('business', business);
    flow.set('name', def.name);
    flow.set('channel', def.channel);
    flow.set('triggerKeywords', def.triggerKeywords);
    flow.set('steps', def.steps);
    flow.set('isActive', true);
    await flow.save(null, { useMasterKey: true });
    results.botFlows++;
  }

  // --- Lead Magnets ---
  const magnetDefs = [
    {
      name: 'PlataPay Agent Starter Guide',
      type: 'guide',
      targetAudience: 'agent',
      deliveryMessage: 'Here\'s your PlataPay Agent Starter Guide! This covers everything you need to know to start earning as an agent.',
      contentUrl: '',
      promoCode: '',
      isActive: true,
      downloadCount: 0,
    },
    {
      name: 'First Transaction Free',
      type: 'promo_code',
      targetAudience: 'customer',
      deliveryMessage: 'Welcome to PlataPay! Here\'s a special promo code for your first transaction — enjoy zero fees!',
      contentUrl: '',
      promoCode: 'PLATAFREE2026',
      isActive: true,
      downloadCount: 0,
    },
    {
      name: 'Agent Earnings Calculator',
      type: 'guide',
      targetAudience: 'agent',
      deliveryMessage: 'Here\'s the PlataPay Agent Earnings Calculator! See how much you can earn based on your location and transaction volume.',
      contentUrl: '',
      promoCode: '',
      isActive: true,
      downloadCount: 0,
    },
  ];

  for (const def of magnetDefs) {
    const existQuery = new Parse.Query('LeadMagnet');
    existQuery.equalTo('business', business);
    existQuery.equalTo('name', def.name);
    const exists = await existQuery.first({ useMasterKey: true });
    if (exists) continue;

    const magnet = new Parse.Object('LeadMagnet');
    magnet.set('business', business);
    Object.entries(def).forEach(function (entry) { magnet.set(entry[0], entry[1]); });
    await magnet.save(null, { useMasterKey: true });
    results.leadMagnets++;
  }

  // --- Nurture Sequences ---
  const sequenceDefs = [
    {
      name: 'Agent Recruitment 7-Day',
      targetAudience: 'agent',
      triggerEvent: 'new_lead',
      channel: 'messenger',
      isActive: true,
      steps: [
        { stepNumber: 1, delayDays: 0, delayHours: 1, messageType: 'text', content: 'Hi! Thanks for your interest in becoming a PlataPay Agent. Did you know that our agents earn an average of ₱15,000-₱40,000 per month? Let me share more details over the next few days.' },
        { stepNumber: 2, delayDays: 1, delayHours: 0, messageType: 'buttons', content: '💰 PlataPay agents earn commissions on every transaction:\n\n• Bills: ₱3-₱15 each\n• E-Load: 2-5% commission\n• Remittance: ₱25-₱50 each\n\nThe more transactions, the more you earn!', buttons: [
          { title: 'Calculate Earnings', url: 'https://platapay.ph/calculator' },
          { title: 'Apply Now', url: 'https://platapay.ph/agent-signup' },
        ]},
        { stepNumber: 3, delayDays: 3, delayHours: 0, messageType: 'text', content: '💡 Agent Success Tip: Top-earning PlataPay agents place their business in high-traffic areas like markets, sari-sari stores, or near schools. They also promote bills payment services since that brings the most repeat customers.' },
        { stepNumber: 4, delayDays: 5, delayHours: 0, messageType: 'text', content: '🌟 Success Story: "I started as a PlataPay agent 6 months ago in my sari-sari store. Now I earn ₱35,000/month just from the commissions. Best decision I ever made!" — Agent Maria, Quezon City' },
        { stepNumber: 5, delayDays: 7, delayHours: 0, messageType: 'buttons', content: 'Ready to start your PlataPay Agent journey? Applications are open and there\'s NO franchise fee. Join 5,000+ agents earning daily!', buttons: [
          { title: 'Apply Now', url: 'https://platapay.ph/agent-signup' },
          { title: 'Talk to Support', payload: 'AGENT_SUPPORT' },
        ]},
      ],
    },
    {
      name: 'Customer Welcome 3-Day',
      targetAudience: 'customer',
      triggerEvent: 'new_lead',
      channel: 'messenger',
      isActive: true,
      steps: [
        { stepNumber: 1, delayDays: 0, delayHours: 2, messageType: 'text', content: 'Welcome to PlataPay! 🎉 You can now pay bills, buy load, and send money — all from your phone or at any PlataPay agent near you.' },
        { stepNumber: 2, delayDays: 1, delayHours: 0, messageType: 'quick_replies', content: 'What service would you like to try first?', quickReplies: [
          { title: '💡 Pay Bills', payload: 'SERVICE_BILLS' },
          { title: '📱 Buy Load', payload: 'SERVICE_LOAD' },
          { title: '💸 Send Money', payload: 'SERVICE_REMIT' },
        ]},
        { stepNumber: 3, delayDays: 3, delayHours: 0, messageType: 'buttons', content: 'Want to find a PlataPay agent near you? Over 5,000 agents nationwide ready to serve you!', buttons: [
          { title: 'Find Nearest Agent', url: 'https://platapay.ph/find-agent' },
          { title: 'Download App', url: 'https://platapay.ph/download' },
        ]},
      ],
    },
  ];

  for (const def of sequenceDefs) {
    const existQuery = new Parse.Query('NurtureSequence');
    existQuery.equalTo('business', business);
    existQuery.equalTo('name', def.name);
    const exists = await existQuery.first({ useMasterKey: true });
    if (exists) continue;

    const seq = new Parse.Object('NurtureSequence');
    seq.set('business', business);
    Object.entries(def).forEach(function (entry) { seq.set(entry[0], entry[1]); });
    await seq.save(null, { useMasterKey: true });
    results.nurtureSequences++;
  }

  return { success: true, created: results };
});

// =============================================================================
// AI Chat Cloud Function (Anthropic Claude API)
// =============================================================================

const SYSTEM_PROMPT = `You are the InnovateHub Business Hub AI Assistant. You help users manage their Facebook Business integration, PlataPay fintech services, and Silvera e-commerce platform.

You are an expert on:
- Facebook Developer Platform: App creation, Messenger, Webhooks, Marketing API, Instagram Graph API, Commerce/Catalog API
- Back4App/Parse: Cloud Code, data management, webhooks, scheduled jobs
- PlataPay: Digital payments, agent network, bill payments in the Philippines
- InnovateHub/Silvera: E-commerce, product catalog, order management

Key info:
- Webhook URL: https://parseapi.back4app.com/facebook/webhook
- Verify Token: innovatehub_verify_2024
- Required FB permissions: pages_manage_posts, pages_read_engagement, pages_messaging, leads_retrieval, ads_management, catalog_management, instagram_basic, instagram_content_publish, instagram_manage_comments

Be helpful, concise, and practical. Provide step-by-step instructions when asked. Use Filipino-English mix when appropriate.`;

/**
 * aiChat — Send a message to Claude AI and get a response.
 * Params: messages (array of {role, content}), businessId (optional)
 */
Parse.Cloud.define('aiChat', async function (request) {
  const { messages, businessId } = request.params;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_VALUE, 'messages array is required');
  }

  // Get AI proxy URL from config or environment
  const config = await Parse.Config.get({ useMasterKey: true });
  var aiProxyUrl = config.get('aiProxyUrl') || process.env.AI_PROXY_URL;

  // If no proxy URL configured, try the Anthropic API directly with an API key
  if (!aiProxyUrl) {
    var apiKey = config.get('anthropicApiKey') || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED,
        'AI not configured. Set "aiProxyUrl" or "anthropicApiKey" in Parse Config.'
      );
    }
    // Direct API call
    var systemPrompt = SYSTEM_PROMPT;
    if (businessId) {
      try {
        var biz = await getBusinessById(businessId);
        systemPrompt += '\n\nCurrent business: ' + biz.get('name') + ' (' + biz.get('slug') + ')';
      } catch (e) { /* ignore */ }
    }

    // Support both API keys (sk-ant-api03-...) and OAuth tokens (sk-ant-oat01-...)
    var authHeaders = {};
    if (apiKey.startsWith('sk-ant-oat')) {
      authHeaders['Authorization'] = 'Bearer ' + apiKey;
    } else {
      authHeaders['x-api-key'] = apiKey;
    }

    var directRes = await fetch(ANTHROPIC_API_BASE + '/messages', {
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      }, authHeaders),
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(function (m) { return { role: m.role, content: m.content }; }),
      }),
    });

    var directData = await directRes.json();
    if (!directRes.ok) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'AI error: ' + (directData.error?.message || JSON.stringify(directData)));
    }
    return { response: directData.content[0].text, model: directData.model, usage: directData.usage };
  }

  // Call the local AI proxy (uses Claude Max OAuth tokens)
  var businessContext = '';
  if (businessId) {
    try {
      var biz2 = await getBusinessById(businessId);
      businessContext = biz2.get('name') + ' (' + biz2.get('slug') + ')';
      if (biz2.get('fbPageId')) businessContext += ', FB Page: ' + biz2.get('fbPageId');
    } catch (e) { /* ignore */ }
  }

  var proxyRes = await fetch(aiProxyUrl + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map(function (m) { return { role: m.role, content: m.content }; }),
      businessContext: businessContext,
    }),
  });

  var proxyData = await proxyRes.json();
  if (!proxyRes.ok) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'AI proxy error: ' + (proxyData.error || JSON.stringify(proxyData)));
  }

  return {
    response: proxyData.response,
    model: proxyData.model,
    usage: proxyData.usage,
  };
});

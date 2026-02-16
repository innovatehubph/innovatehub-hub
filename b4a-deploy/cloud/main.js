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
 * afterSave FbLead — When a new lead is created, find/create a MessengerContact
 * and trigger a welcome message if a BotFlow exists for 'new_lead'.
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

      // Find or create a MessengerContact from the lead data
      const contactQuery = new Parse.Query('MessengerContact');
      contactQuery.equalTo('business', businessObj);

      // Try to match by email or phone
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
        // Create a new contact from lead data
        contact = new Parse.Object('MessengerContact');
        contact.set('business', businessObj);
        contact.set('channel', 'lead_form');
        contact.set('firstName', fieldData.first_name || fieldData.full_name || '');
        contact.set('lastName', fieldData.last_name || '');
        contact.set('email', email);
        contact.set('phone', phone);
        contact.set('psid', ''); // No PSID for lead form contacts
        contact.set('source', 'lead_ad');
        contact.set('lastInteractionAt', new Date());
        await contact.save(null, { useMasterKey: true });
      }

      // Link the lead to the contact
      fbLead.set('contact', contact);
      await fbLead.save(null, { useMasterKey: true });

      // Check for a BotFlow triggered by 'new_lead'
      const flowQuery = new Parse.Query('BotFlow');
      flowQuery.equalTo('business', businessObj);
      flowQuery.equalTo('isActive', true);
      const flows = await flowQuery.find({ useMasterKey: true });

      for (const flow of flows) {
        const keywords = flow.get('triggerKeywords') || [];
        if (!keywords.some(function (kw) { return kw.toLowerCase() === 'new_lead'; })) {
          continue;
        }

        // This flow is for new leads — send the welcome message
        const psid = contact.get('psid');
        if (!psid) {
          // Cannot send a message without a PSID
          console.log('[afterSave FbLead] Contact has no PSID, cannot send welcome message');
          break;
        }

        const steps = flow.get('steps') || [];
        let token;
        try {
          token = await getPageAccessToken(businessObj);
        } catch (err) {
          console.error('[afterSave FbLead] Cannot get token:', err.message);
          break;
        }

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

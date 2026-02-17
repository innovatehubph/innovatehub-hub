/**
 * OpenRouter Provider for AI Image Generation
 * Supports GPT-5 Image, GPT-4o, and other vision/image models
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const PUBLIC_BASE_URL = 'https://webhook.innoserver.cloud';
const PUBLIC_ASSETS_DIR = '/root/innovatehub-hub/docs/assets/generated';

// Available image generation models on OpenRouter
const IMAGE_MODELS = {
  'gpt-5-image-mini': 'openai/gpt-5-image-mini',
  'gpt-5-image': 'openai/gpt-5-image',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-pro': 'google/gemini-pro-vision'
};

// PlataPay brand assets
const PLATAPAY_ASSETS = {
  logo: 'https://webhook.innoserver.cloud/assets/platapay-reference/logo.jpg',
  logoAlt: 'https://webhook.innoserver.cloud/assets/PlataPay.png',
  brandColor: '#57317A', // Purple
  secondaryColor: '#9B59B6',
  accentColor: '#F39C12',
  // Reference images for style consistency
  references: {
    schoolStudents: 'https://webhook.innoserver.cloud/assets/platapay-reference/school-students.jpg',
    ruralMothers: 'https://webhook.innoserver.cloud/assets/platapay-reference/rural-mothers.jpg',
    ruralQueue: 'https://webhook.innoserver.cloud/assets/platapay-reference/rural-queue.jpg'
  }
};

// =============================================================================
// PLATAPAY MASTER PROMPT TEMPLATE
// =============================================================================

const PLATAPAY_MASTER_TEMPLATE = `Create a high-quality, photorealistic marketing image of a PlataPay outlet located in [LOCATION_TYPE] in the Philippines.

The scene should feature a PROPER-SIZED PlataPay retail outlet (NOT a small ticket booth or tiny kiosk). The outlet must be a legitimate storefront or a spacious service counter that customers can comfortably approach - similar to a Cebuana Lhuillier, Western Union, or MLhuillier branch size. Show the iconic purple branding with the PlataPay logo prominently displayed on a proper signage board. The outlet must look like an established, trustworthy business - NOT a cramped booth.

IMPORTANT: AVOID generating small ticket booth-style kiosks. The outlet should have:
- Proper counter space for transactions
- Visible interior or service area
- Professional signage (not just a small sign)
- Room for customers to stand comfortably
- The feel of a real financial services branch

Show [TARGET_CUSTOMERS] actively using the service — such as cash in/out, bills payment, remittance, or e-loading. Customers should look happy, satisfied, and confident while holding cash, receipts, or mobile phones.

Environment details should reflect the location authentically:
- Philippine setting (tricycles, sari-sari stores, jeepneys, palm trees, local signage, simple houses or buildings)
- Community atmosphere showing financial accessibility
- Warm, uplifting mood emphasizing trust and convenience

Photography style: Cinematic documentary photography, natural daylight, ultra-realistic faces, accurate Filipino features, realistic skin tones, shallow depth of field, 50mm lens look, high dynamic range, sharp focus, professional color grading.

Brand emphasis: Highlight financial empowerment, convenience, and community impact of PlataPay outlets across the Philippines.

Style requirements: Photorealistic, ultra-detailed, 8K quality, professional advertising photography, natural colors, no text overlays, no watermarks.`;

// =============================================================================
// VISUAL MARKETING PLAYBOOK SCENES
// =============================================================================

const SCENE_PRESETS = {
  // Priority 1: OFW Remittance Family
  ofw_remittance: {
    name: 'OFW Family Remittance',
    location: 'neighborhood outlet in a residential barangay',
    customers: 'a Filipino family (mother and children) receiving remittance from their OFW loved one abroad',
    emotion: 'hope, gratitude, happiness',
    description: 'Family receiving money from overseas worker, emotional reunion moment',
    priority: 1
  },
  
  // Priority 2: Rural Community Queue
  rural_queue: {
    name: 'Rural Community Access',
    location: 'remote barangay in a rural village with dirt roads',
    customers: 'a long queue of rural Filipino residents, including farmers, mothers, and elderly',
    emotion: 'relief, trust, accessibility',
    description: 'Long queue showing PlataPay reaching underserved areas',
    priority: 2
  },
  
  // Priority 3: Students Near School
  school_students: {
    name: 'School Zone Transactions',
    location: 'near a public high school or university entrance',
    customers: 'Filipino students in school uniforms cashing in for allowance or buying mobile load',
    emotion: 'convenience, modern lifestyle, youth energy',
    description: 'Students using PlataPay as everyday tool',
    priority: 3
  },
  
  // Priority 4: Market Vendors
  market_vendors: {
    name: 'Public Market Vendors',
    location: 'busy public wet market (palengke) area',
    customers: 'market vendors and small business owners depositing their daily earnings',
    emotion: 'productivity, empowerment, business success',
    description: 'Vendors depositing earnings, showing business usefulness',
    priority: 4
  },
  
  // Priority 5: Agent Success
  agent_success: {
    name: 'Agent Success Story',
    location: 'town center with a well-established PlataPay outlet',
    customers: 'proud PlataPay outlet owner standing in front of their kiosk with satisfied customers',
    emotion: 'pride, success, entrepreneurship',
    description: 'Successful agent for recruitment marketing',
    priority: 5
  },
  
  // Additional Scenes
  transport_hub: {
    name: 'Transport Hub Convenience',
    location: 'busy bus terminal or jeepney station',
    customers: 'travelers and commuters quickly sending money or paying for tickets',
    emotion: 'speed, convenience, reliability',
    description: 'High-volume transactions at transport hubs',
    priority: 6
  },
  
  senior_citizens: {
    name: 'Senior Citizens Accessibility',
    location: 'community outlet in a quiet neighborhood',
    customers: 'elderly Filipino citizens being assisted by a friendly PlataPay agent',
    emotion: 'trust, care, ease of use',
    description: 'Showing accessibility for older users',
    priority: 7
  },
  
  small_business: {
    name: 'Small Business Owners',
    location: 'town center commercial area',
    customers: 'sari-sari store owners and small shop owners paying bills and utilities',
    emotion: 'efficiency, business empowerment',
    description: 'B2B credibility for business owners',
    priority: 8
  },
  
  night_operation: {
    name: 'Night Operation Scene',
    location: 'well-lit street corner at night',
    customers: 'customers using PlataPay services in the evening hours',
    emotion: 'reliability, 24/7 availability, safety',
    description: 'Show late-night accessibility',
    priority: 9
  },
  
  urban_modern: {
    name: 'Modern Urban Outlet',
    location: 'busy urban street in Manila or Cebu city center',
    customers: 'young professionals and office workers using quick digital services',
    emotion: 'modern, fast-paced, urban lifestyle',
    description: 'Show scalability from rural to city',
    priority: 10
  }
};

// Seasonal campaign themes
const SEASONAL_THEMES = {
  january: {
    theme: 'New Year Finances',
    focus: 'remittance, savings goals, fresh start',
    customers: 'families planning finances for the new year'
  },
  june: {
    theme: 'School Season',
    focus: 'tuition payments, school supplies, student allowances',
    customers: 'students and parents preparing for enrollment'
  },
  december: {
    theme: 'Holiday & OFW Season',
    focus: 'Christmas remittances, gift money, holiday spending',
    customers: 'families receiving holiday remittances from OFWs'
  },
  election: {
    theme: 'Government Transactions',
    focus: 'bills payment, government fees, civic duties',
    customers: 'citizens paying government-related fees'
  }
};

class OpenRouterImageGenerator {
  constructor(config = {}) {
    this.apiKey = config.apiKey || OPENROUTER_API_KEY;
    this.defaultModel = config.model || 'gpt-5-image-mini';
    this.outputDir = config.outputDir || path.join(__dirname, 'generated');
  }

  /**
   * Generate image using OpenRouter
   */
  async generate(options) {
    const {
      prompt,
      scene,
      location,
      customers,
      model = this.defaultModel,
      referenceImages = [],
      size = '1024x1024',
      quality = 'hd'
    } = options;

    // Build the prompt
    let finalPrompt = prompt;
    
    if (scene && SCENE_PRESETS[scene]) {
      finalPrompt = this._buildScenePrompt(scene, options);
    } else if (location || customers) {
      finalPrompt = this._buildCustomPrompt(options);
    }

    // Build messages array
    const messages = this._buildMessages(finalPrompt, referenceImages);

    try {
      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: IMAGE_MODELS[model] || model,
          messages,
          max_tokens: 4096
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://innovatehub.ph',
            'X-Title': 'InnovateHub Image Generator'
          }
        }
      );

      const result = response.data;
      
      // Extract image from response
      const imageResult = this._extractImageUrl(result);
      
      let imageUrl = null;
      let publicUrl = null;
      let localPath = null;
      
      let emailUrl = null;
      
      if (imageResult.type === 'base64') {
        // Save locally and create PUBLIC URL
        const saveResult = await this._saveBase64Image(imageResult.data, scene || 'platapay');
        localPath = saveResult.localPath;
        publicUrl = saveResult.publicUrl;
        emailUrl = saveResult.emailUrl; // Optimized for email
        imageUrl = publicUrl; // Use public URL as main URL
      } else if (imageResult.type === 'url') {
        imageUrl = imageResult.data;
        publicUrl = imageResult.data;
        emailUrl = imageResult.data;
      }
      
      return {
        success: true,
        url: publicUrl || imageUrl,
        publicUrl,
        emailUrl, // Use this URL for email campaigns (smaller file size)
        localPath,
        prompt: finalPrompt,
        model: IMAGE_MODELS[model] || model,
        scene: scene || null,
        usage: result.usage,
        cost: result.usage?.cost,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[OpenRouter] Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  /**
   * Generate scene from Visual Marketing Playbook
   */
  async generateScene(sceneName, options = {}) {
    if (!SCENE_PRESETS[sceneName]) {
      throw new Error(`Unknown scene: ${sceneName}. Available: ${Object.keys(SCENE_PRESETS).join(', ')}`);
    }

    return this.generate({
      scene: sceneName,
      ...options
    });
  }

  /**
   * Generate campaign with multiple scenes
   */
  async generateCampaign(campaignOptions) {
    const {
      name,
      scenes = ['ofw_remittance', 'rural_queue', 'school_students'],
      referenceImages = [],
      model = this.defaultModel
    } = campaignOptions;

    const results = {
      campaign: name,
      scenes: [],
      timestamp: new Date().toISOString()
    };

    for (const sceneName of scenes) {
      try {
        const result = await this.generateScene(sceneName, { referenceImages, model });
        results.scenes.push({
          scene: sceneName,
          ...SCENE_PRESETS[sceneName],
          ...result
        });
      } catch (error) {
        results.scenes.push({
          scene: sceneName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Generate seasonal campaign
   */
  async generateSeasonalCampaign(month, options = {}) {
    const theme = SEASONAL_THEMES[month.toLowerCase()];
    if (!theme) {
      throw new Error(`No seasonal theme for: ${month}. Available: ${Object.keys(SEASONAL_THEMES).join(', ')}`);
    }

    const prompt = this._buildCustomPrompt({
      location: 'community outlet during ' + theme.theme,
      customers: theme.customers,
      additionalContext: `Focus on ${theme.focus}. Capture the spirit of ${theme.theme}.`,
      ...options
    });

    return this.generate({
      prompt,
      ...options
    });
  }

  /**
   * Analyze/describe an image (vision capability)
   */
  async analyzeImage(imageUrl, prompt = 'Describe this image in detail') {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: 'openai/gpt-4o',
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      analysis: response.data.choices[0].message.content,
      imageUrl
    };
  }

  // ============ Private Methods ============

  _buildScenePrompt(sceneName, options) {
    const scene = SCENE_PRESETS[sceneName];
    
    let prompt = PLATAPAY_MASTER_TEMPLATE
      .replace('[LOCATION_TYPE]', scene.location)
      .replace('[TARGET_CUSTOMERS]', scene.customers);

    // Add scene-specific emotion
    prompt += `\n\nEmotional tone: ${scene.emotion}`;
    
    // Add any custom additions
    if (options.additionalContext) {
      prompt += `\n\nAdditional context: ${options.additionalContext}`;
    }

    return prompt;
  }

  _buildCustomPrompt(options) {
    const {
      location = 'town center in the Philippines',
      customers = 'happy Filipino customers of various ages',
      additionalContext = ''
    } = options;

    let prompt = PLATAPAY_MASTER_TEMPLATE
      .replace('[LOCATION_TYPE]', location)
      .replace('[TARGET_CUSTOMERS]', customers);

    if (additionalContext) {
      prompt += `\n\nAdditional context: ${additionalContext}`;
    }

    return prompt;
  }

  _buildMessages(prompt, referenceImages = []) {
    const content = [
      { type: 'text', text: prompt }
    ];

    // Add reference images (logo, branding examples)
    for (const imgUrl of referenceImages) {
      content.push({
        type: 'image_url',
        image_url: { url: imgUrl }
      });
    }

    // Always include PlataPay logo as reference
    if (referenceImages.length === 0) {
      content.push({
        type: 'image_url',
        image_url: { url: PLATAPAY_ASSETS.logo }
      });
    }

    return [{ role: 'user', content }];
  }

  _extractImageUrl(response) {
    const message = response.choices?.[0]?.message;
    
    // GPT-5 Image returns: message.images[0].image_url.url (base64 string)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imageData = message.images[0];
      
      // Structure: { type, index, image_url: { url: "<base64>" } }
      if (imageData?.image_url?.url) {
        const url = imageData.image_url.url;
        // Check if it's raw base64 (no data: prefix)
        if (url.length > 1000 && !url.startsWith('http') && !url.startsWith('data:')) {
          return { type: 'base64', data: url };
        }
        // Data URL
        if (url.startsWith('data:image/')) {
          return { type: 'base64', data: url.split(',')[1] };
        }
        // Regular URL
        if (url.startsWith('http')) {
          return { type: 'url', data: url };
        }
      }
      
      // Fallback: raw base64 string in array
      if (typeof imageData === 'string' && imageData.length > 1000) {
        return { type: 'base64', data: imageData };
      }
      if (imageData?.b64_json) {
        return { type: 'base64', data: imageData.b64_json };
      }
      if (imageData?.url) {
        return { type: 'url', data: imageData.url };
      }
    }
    
    // Fallback: Check content array
    const content = message?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'image_url' && item.image_url?.url) {
          const url = item.image_url.url;
          if (url.startsWith('data:image/')) {
            const base64Data = url.split(',')[1];
            return { type: 'base64', data: base64Data };
          }
          if (url.startsWith('http')) {
            return { type: 'url', data: url };
          }
          if (url.length > 1000) {
            return { type: 'base64', data: url };
          }
        }
      }
    }
    
    // Fallback: String content with embedded URL/base64
    if (typeof content === 'string') {
      const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
      if (mdMatch) return { type: 'url', data: mdMatch[1] };
      
      const urlMatch = content.match(/(https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif))/i);
      if (urlMatch) return { type: 'url', data: urlMatch[1] };
      
      if (content.length > 1000 && !content.includes(' ')) {
        return { type: 'base64', data: content };
      }
    }

    return { type: 'unknown', data: content || response };
  }

  async _saveBase64Image(base64Data, prefix = 'platapay') {
    // Save to PUBLIC assets directory for reliable URL access
    await fs.mkdir(PUBLIC_ASSETS_DIR, { recursive: true });
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${prefix}_${timestamp}_${randomId}.png`;
    const filepath = path.join(PUBLIC_ASSETS_DIR, filename);
    
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filepath, buffer);
    
    // Public URL via /assets route (same as logos)
    const publicUrl = `${PUBLIC_BASE_URL}/assets/generated/${filename}`;
    
    // Create email-optimized version (compressed JPEG, 600px width, ~50-100KB)
    let emailUrl = publicUrl;
    try {
      const { exec } = require('child_process');
      const emailFilename = filename.replace('.png', '_email.jpg');
      const emailPath = path.join(PUBLIC_ASSETS_DIR, emailFilename);
      
      await new Promise((resolve, reject) => {
        exec(`convert "${filepath}" -resize 600x -quality 85 "${emailPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      emailUrl = `${PUBLIC_BASE_URL}/assets/generated/${emailFilename}`;
      console.log(`[Image] Email-optimized version: ${emailUrl}`);
    } catch (err) {
      console.error('[Image] Failed to create email-optimized version:', err.message);
    }
    
    console.log(`[Image] Saved to public assets: ${publicUrl}`);
    
    return {
      localPath: filepath,
      publicUrl,
      emailUrl, // Optimized for email (smaller file size)
      filename
    };
  }

  // ============ Static Methods ============

  static getScenes() {
    return SCENE_PRESETS;
  }

  static getSeasonalThemes() {
    return SEASONAL_THEMES;
  }

  static getModels() {
    return IMAGE_MODELS;
  }

  static getMasterTemplate() {
    return PLATAPAY_MASTER_TEMPLATE;
  }

  static getBrandAssets() {
    return PLATAPAY_ASSETS;
  }
}

module.exports = OpenRouterImageGenerator;

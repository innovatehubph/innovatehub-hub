/**
 * InnovateHub AI Image Generator
 * 
 * Multi-provider AI image generation for marketing, products, and content.
 * Supports: Pollinations (free), OpenAI DALL-E 3, Replicate, Stability AI
 * 
 * Use Cases:
 * - Marketing banners & ads
 * - Social media posts
 * - Product images
 * - Agent profiles
 * - Infographics
 * - Branch location visuals
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Provider configurations
const PROVIDERS = {
  pollinations: {
    name: 'Pollinations AI',
    free: true,
    baseUrl: 'https://image.pollinations.ai/prompt',
    models: ['flux', 'flux-realism', 'flux-cablyai', 'flux-anime', 'flux-3d', 'any-dark', 'turbo']
  },
  openai: {
    name: 'OpenAI DALL-E 3',
    free: false,
    baseUrl: 'https://api.openai.com/v1/images/generations',
    models: ['dall-e-3', 'dall-e-2']
  },
  replicate: {
    name: 'Replicate',
    free: false,
    baseUrl: 'https://api.replicate.com/v1/predictions',
    models: ['flux-schnell', 'flux-dev', 'sdxl']
  },
  stability: {
    name: 'Stability AI',
    free: false,
    baseUrl: 'https://api.stability.ai/v1/generation',
    models: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6']
  }
};

// Brand presets for InnovateHub/PlataPay
const BRAND_PRESETS = {
  platapay: {
    colors: 'blue and white color scheme, professional fintech aesthetic',
    style: 'modern, clean, trustworthy, Filipino market',
    logo_hint: 'PlataPay branding',
    keywords: ['digital payments', 'mobile wallet', 'fintech', 'Philippines', 'financial inclusion']
  },
  innovatehub: {
    colors: 'blue gradient, tech-forward colors',
    style: 'innovative, cutting-edge, professional',
    logo_hint: 'InnovateHub branding',
    keywords: ['technology', 'innovation', 'digital transformation', 'business solutions']
  }
};

// Template presets for common use cases
const TEMPLATES = {
  facebook_ad: {
    width: 1200,
    height: 628,
    style: 'eye-catching advertisement, clear call-to-action space, marketing banner',
    aspect: '1.91:1'
  },
  instagram_post: {
    width: 1080,
    height: 1080,
    style: 'instagram-worthy, vibrant, engaging social media post',
    aspect: '1:1'
  },
  instagram_story: {
    width: 1080,
    height: 1920,
    style: 'vertical story format, mobile-optimized',
    aspect: '9:16'
  },
  youtube_thumbnail: {
    width: 1280,
    height: 720,
    style: 'clickbait-worthy, bold text space, high contrast',
    aspect: '16:9'
  },
  linkedin_post: {
    width: 1200,
    height: 627,
    style: 'professional, business-oriented, corporate',
    aspect: '1.91:1'
  },
  email_header: {
    width: 600,
    height: 200,
    style: 'email banner, clean, professional header image',
    aspect: '3:1'
  },
  product_shot: {
    width: 1024,
    height: 1024,
    style: 'product photography, clean background, professional lighting',
    aspect: '1:1'
  },
  infographic: {
    width: 800,
    height: 2000,
    style: 'infographic style, data visualization, clean layout',
    aspect: '2:5'
  },
  hero_banner: {
    width: 1920,
    height: 600,
    style: 'website hero banner, cinematic, impactful',
    aspect: '3.2:1'
  },
  agent_profile: {
    width: 512,
    height: 512,
    style: 'professional headshot style, friendly, approachable Filipino person',
    aspect: '1:1'
  },
  branch_location: {
    width: 1200,
    height: 800,
    style: 'retail store front, modern kiosk, Philippine setting',
    aspect: '3:2'
  },
  app_screenshot: {
    width: 1284,
    height: 2778,
    style: 'mobile app UI mockup, clean interface',
    aspect: '9:19.5'
  }
};

// Style presets
const STYLES = {
  photorealistic: 'photorealistic, 8k, highly detailed, professional photography',
  illustration: 'digital illustration, vector art style, clean lines',
  '3d_render': '3D render, octane render, studio lighting, high quality',
  flat_design: 'flat design, minimal, modern graphic design',
  watercolor: 'watercolor painting style, artistic, soft colors',
  anime: 'anime style, vibrant colors, Japanese animation',
  corporate: 'corporate stock photo style, business professional',
  cinematic: 'cinematic, movie poster style, dramatic lighting',
  minimalist: 'minimalist, clean, white space, simple',
  vintage: 'vintage, retro style, nostalgic aesthetic',
  neon: 'neon lights, cyberpunk, futuristic, glowing',
  hand_drawn: 'hand-drawn sketch style, pencil illustration'
};

class ImageGenerator {
  constructor(config = {}) {
    this.outputDir = config.outputDir || path.join(__dirname, 'generated');
    this.defaultProvider = config.defaultProvider || 'pollinations';
    this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
    this.replicateKey = config.replicateKey || process.env.REPLICATE_API_TOKEN;
    this.stabilityKey = config.stabilityKey || process.env.STABILITY_API_KEY;
  }

  /**
   * Generate an image with AI
   * @param {Object} options - Generation options
   * @returns {Object} - Generated image info
   */
  async generate(options) {
    const {
      prompt,
      template,
      brand,
      style,
      provider = this.defaultProvider,
      model,
      width,
      height,
      negative_prompt,
      seed,
      enhance = true,
      save = true
    } = options;

    // Build enhanced prompt
    let enhancedPrompt = this._buildPrompt(prompt, { template, brand, style, enhance });

    // Get dimensions
    const dimensions = this._getDimensions(template, width, height);

    // Generate based on provider
    let result;
    switch (provider) {
      case 'pollinations':
        result = await this._generatePollinations(enhancedPrompt, dimensions, { model, seed, negative_prompt });
        break;
      case 'openai':
        result = await this._generateOpenAI(enhancedPrompt, dimensions, { model });
        break;
      case 'replicate':
        result = await this._generateReplicate(enhancedPrompt, dimensions, { model, negative_prompt, seed });
        break;
      case 'stability':
        result = await this._generateStability(enhancedPrompt, dimensions, { model, negative_prompt, seed });
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Save if requested
    if (save && result.url) {
      result.localPath = await this._saveImage(result.url, options);
    }

    return {
      success: true,
      ...result,
      prompt: enhancedPrompt,
      originalPrompt: prompt,
      provider,
      dimensions,
      template,
      brand,
      style,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(options, count = 4) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const variation = await this.generate({
        ...options,
        seed: options.seed ? options.seed + i : Math.floor(Math.random() * 1000000)
      });
      results.push(variation);
    }
    return results;
  }

  /**
   * Generate for a specific marketing campaign
   */
  async generateCampaign(campaignOptions) {
    const {
      name,
      prompt,
      brand = 'platapay',
      platforms = ['facebook_ad', 'instagram_post', 'instagram_story'],
      style = 'corporate',
      provider = 'pollinations'
    } = campaignOptions;

    const results = {
      campaign: name,
      brand,
      assets: []
    };

    for (const platform of platforms) {
      const asset = await this.generate({
        prompt,
        template: platform,
        brand,
        style,
        provider,
        save: true
      });
      results.assets.push({
        platform,
        ...asset
      });
    }

    return results;
  }

  /**
   * Generate product mockup
   */
  async generateProductMockup(productOptions) {
    const {
      productName,
      description,
      category = 'fintech app',
      mockupType = 'product_shot',
      brand = 'platapay'
    } = productOptions;

    const prompt = `${productName}: ${description}, ${category} product showcase`;
    
    return this.generate({
      prompt,
      template: mockupType,
      brand,
      style: 'photorealistic',
      enhance: true
    });
  }

  /**
   * Generate agent/staff profile image
   */
  async generateAgentProfile(profileOptions) {
    const {
      gender = 'neutral',
      age = 'young adult',
      expression = 'friendly smile',
      attire = 'business casual',
      background = 'office'
    } = profileOptions;

    const prompt = `Professional portrait of a ${age} Filipino ${gender}, ${expression}, wearing ${attire}, ${background} background, looking at camera`;

    return this.generate({
      prompt,
      template: 'agent_profile',
      style: 'photorealistic',
      brand: 'platapay'
    });
  }

  /**
   * Generate branch/kiosk location image
   */
  async generateBranchImage(branchOptions) {
    const {
      locationType = 'mall kiosk',
      setting = 'Philippine shopping mall',
      timeOfDay = 'daytime',
      features = 'digital payment terminal, LED signage'
    } = branchOptions;

    const prompt = `PlataPay ${locationType} in a ${setting}, ${timeOfDay}, featuring ${features}, modern fintech branch`;

    return this.generate({
      prompt,
      template: 'branch_location',
      brand: 'platapay',
      style: 'photorealistic'
    });
  }

  // ============ Private Methods ============

  _buildPrompt(basePrompt, options) {
    const parts = [basePrompt];

    // Add template style
    if (options.template && TEMPLATES[options.template]) {
      parts.push(TEMPLATES[options.template].style);
    }

    // Add brand context
    if (options.brand && BRAND_PRESETS[options.brand]) {
      const brandPreset = BRAND_PRESETS[options.brand];
      parts.push(brandPreset.colors);
      parts.push(brandPreset.style);
    }

    // Add style preset
    if (options.style && STYLES[options.style]) {
      parts.push(STYLES[options.style]);
    }

    // Add quality enhancers
    if (options.enhance) {
      parts.push('high quality, detailed, professional');
    }

    return parts.join(', ');
  }

  _getDimensions(template, width, height) {
    if (width && height) {
      return { width, height };
    }
    if (template && TEMPLATES[template]) {
      return {
        width: TEMPLATES[template].width,
        height: TEMPLATES[template].height
      };
    }
    return { width: 1024, height: 1024 };
  }

  async _generatePollinations(prompt, dimensions, options = {}) {
    const { model = 'flux', seed, negative_prompt } = options;
    
    // Build URL
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&model=${model}&nologo=true`;
    
    if (seed) url += `&seed=${seed}`;
    if (negative_prompt) url += `&negative=${encodeURIComponent(negative_prompt)}`;

    // Pollinations returns the image directly at this URL
    return {
      url,
      provider: 'pollinations',
      model
    };
  }

  async _generateOpenAI(prompt, dimensions, options = {}) {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { model = 'dall-e-3' } = options;
    
    // DALL-E 3 sizes: 1024x1024, 1792x1024, 1024x1792
    let size = '1024x1024';
    if (dimensions.width > dimensions.height) {
      size = '1792x1024';
    } else if (dimensions.height > dimensions.width) {
      size = '1024x1792';
    }

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model,
        prompt,
        n: 1,
        size,
        quality: 'hd'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      url: response.data.data[0].url,
      revised_prompt: response.data.data[0].revised_prompt,
      provider: 'openai',
      model
    };
  }

  async _generateReplicate(prompt, dimensions, options = {}) {
    if (!this.replicateKey) {
      throw new Error('Replicate API key not configured');
    }

    const { model = 'black-forest-labs/flux-schnell', seed, negative_prompt } = options;

    // Start prediction
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        model,
        input: {
          prompt,
          width: dimensions.width,
          height: dimensions.height,
          seed,
          negative_prompt
        }
      },
      {
        headers: {
          'Authorization': `Token ${this.replicateKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Poll for completion
    let prediction = response.data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(r => setTimeout(r, 1000));
      const pollResponse = await axios.get(prediction.urls.get, {
        headers: { 'Authorization': `Token ${this.replicateKey}` }
      });
      prediction = pollResponse.data;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Replicate generation failed: ${prediction.error}`);
    }

    return {
      url: prediction.output[0],
      provider: 'replicate',
      model
    };
  }

  async _generateStability(prompt, dimensions, options = {}) {
    if (!this.stabilityKey) {
      throw new Error('Stability API key not configured');
    }

    const { model = 'stable-diffusion-xl-1024-v1-0', seed, negative_prompt } = options;

    const response = await axios.post(
      `https://api.stability.ai/v1/generation/${model}/text-to-image`,
      {
        text_prompts: [
          { text: prompt, weight: 1 },
          ...(negative_prompt ? [{ text: negative_prompt, weight: -1 }] : [])
        ],
        cfg_scale: 7,
        height: dimensions.height,
        width: dimensions.width,
        samples: 1,
        steps: 30,
        seed
      },
      {
        headers: {
          'Authorization': `Bearer ${this.stabilityKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    // Stability returns base64
    const base64 = response.data.artifacts[0].base64;
    
    return {
      base64,
      provider: 'stability',
      model
    };
  }

  async _saveImage(url, options) {
    await fs.mkdir(this.outputDir, { recursive: true });

    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
    const template = options.template || 'custom';
    const filename = `${template}_${timestamp}_${hash}.png`;
    const filepath = path.join(this.outputDir, filename);

    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*',
          'Referer': 'https://pollinations.ai/'
        },
        timeout: 60000
      });
      await fs.writeFile(filepath, response.data);
      return filepath;
    } catch (error) {
      console.error('Failed to save image:', error.message);
      // Return URL as fallback - image is still accessible
      return null;
    }
  }

  // ============ Static Helpers ============

  static getTemplates() {
    return TEMPLATES;
  }

  static getStyles() {
    return STYLES;
  }

  static getBrands() {
    return BRAND_PRESETS;
  }

  static getProviders() {
    return PROVIDERS;
  }
}

module.exports = ImageGenerator;

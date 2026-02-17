#!/usr/bin/env node
/**
 * InnovateHub AI Image Generator CLI
 * 
 * Usage:
 *   node cli.js "A professional fintech mobile app" --template instagram_post --brand platapay
 *   node cli.js --campaign "Summer Promo" --platforms facebook_ad,instagram_post
 *   node cli.js --agent-profile --gender female --age "young professional"
 *   node cli.js --branch-image --location "mall kiosk"
 */

const ImageGenerator = require('./index');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <prompt> [options]')
    .option('template', {
      alias: 't',
      describe: 'Template preset',
      choices: Object.keys(ImageGenerator.getTemplates())
    })
    .option('brand', {
      alias: 'b',
      describe: 'Brand preset',
      choices: Object.keys(ImageGenerator.getBrands()),
      default: 'platapay'
    })
    .option('style', {
      alias: 's',
      describe: 'Style preset',
      choices: Object.keys(ImageGenerator.getStyles())
    })
    .option('provider', {
      alias: 'p',
      describe: 'AI provider',
      choices: Object.keys(ImageGenerator.getProviders()),
      default: 'pollinations'
    })
    .option('model', {
      alias: 'm',
      describe: 'Model to use'
    })
    .option('width', {
      alias: 'w',
      describe: 'Image width',
      type: 'number'
    })
    .option('height', {
      alias: 'h',
      describe: 'Image height',
      type: 'number'
    })
    .option('variations', {
      alias: 'v',
      describe: 'Generate multiple variations',
      type: 'number'
    })
    .option('seed', {
      describe: 'Random seed for reproducibility',
      type: 'number'
    })
    .option('negative', {
      alias: 'n',
      describe: 'Negative prompt (things to avoid)'
    })
    .option('no-enhance', {
      describe: 'Disable automatic prompt enhancement',
      type: 'boolean'
    })
    .option('no-save', {
      describe: 'Do not save to disk (just return URL)',
      type: 'boolean'
    })
    .option('campaign', {
      describe: 'Generate campaign assets for multiple platforms'
    })
    .option('platforms', {
      describe: 'Platforms for campaign (comma-separated)',
      default: 'facebook_ad,instagram_post,instagram_story'
    })
    .option('agent-profile', {
      describe: 'Generate agent/staff profile image',
      type: 'boolean'
    })
    .option('gender', {
      describe: 'Gender for profile (male/female/neutral)',
      default: 'neutral'
    })
    .option('age', {
      describe: 'Age description for profile',
      default: 'young adult'
    })
    .option('branch-image', {
      describe: 'Generate branch/kiosk location image',
      type: 'boolean'
    })
    .option('location', {
      describe: 'Location type for branch image',
      default: 'mall kiosk'
    })
    .option('output', {
      alias: 'o',
      describe: 'Output directory',
      default: './generated'
    })
    .option('json', {
      describe: 'Output as JSON',
      type: 'boolean'
    })
    .option('list-templates', {
      describe: 'List available templates',
      type: 'boolean'
    })
    .option('list-styles', {
      describe: 'List available styles',
      type: 'boolean'
    })
    .option('list-providers', {
      describe: 'List available providers',
      type: 'boolean'
    })
    .help()
    .argv;

  // Handle list commands
  if (argv.listTemplates) {
    console.log('\n📐 Available Templates:\n');
    for (const [key, value] of Object.entries(ImageGenerator.getTemplates())) {
      console.log(`  ${key.padEnd(20)} ${value.width}x${value.height} (${value.aspect})`);
    }
    return;
  }

  if (argv.listStyles) {
    console.log('\n🎨 Available Styles:\n');
    for (const [key, value] of Object.entries(ImageGenerator.getStyles())) {
      console.log(`  ${key.padEnd(15)} ${value.slice(0, 50)}...`);
    }
    return;
  }

  if (argv.listProviders) {
    console.log('\n🤖 Available Providers:\n');
    for (const [key, value] of Object.entries(ImageGenerator.getProviders())) {
      console.log(`  ${key.padEnd(15)} ${value.name} ${value.free ? '(FREE)' : '(API key required)'}`);
      console.log(`    Models: ${value.models.join(', ')}`);
    }
    return;
  }

  // Initialize generator
  const generator = new ImageGenerator({
    outputDir: argv.output
  });

  try {
    let result;

    if (argv.campaign) {
      // Campaign mode
      console.log(`\n🚀 Generating campaign: ${argv.campaign}\n`);
      result = await generator.generateCampaign({
        name: argv.campaign,
        prompt: argv._[0] || 'Professional fintech promotional image',
        brand: argv.brand,
        platforms: argv.platforms.split(','),
        style: argv.style,
        provider: argv.provider
      });
      
      if (!argv.json) {
        console.log(`✅ Campaign "${result.campaign}" generated!`);
        console.log(`   Brand: ${result.brand}`);
        console.log(`   Assets:\n`);
        for (const asset of result.assets) {
          console.log(`   📷 ${asset.platform}`);
          console.log(`      URL: ${asset.url}`);
          if (asset.localPath) console.log(`      Saved: ${asset.localPath}`);
        }
      }
    } else if (argv.agentProfile) {
      // Agent profile mode
      console.log('\n👤 Generating agent profile...\n');
      result = await generator.generateAgentProfile({
        gender: argv.gender,
        age: argv.age,
        expression: 'friendly professional smile',
        attire: 'business casual polo shirt',
        background: 'clean office'
      });
      
      if (!argv.json) {
        console.log('✅ Agent profile generated!');
        console.log(`   URL: ${result.url}`);
        if (result.localPath) console.log(`   Saved: ${result.localPath}`);
      }
    } else if (argv.branchImage) {
      // Branch image mode
      console.log('\n🏪 Generating branch location image...\n');
      result = await generator.generateBranchImage({
        locationType: argv.location,
        setting: 'Philippine shopping mall',
        timeOfDay: 'daytime',
        features: 'digital payment terminal, LED signage, customers'
      });
      
      if (!argv.json) {
        console.log('✅ Branch image generated!');
        console.log(`   URL: ${result.url}`);
        if (result.localPath) console.log(`   Saved: ${result.localPath}`);
      }
    } else if (argv.variations) {
      // Variations mode
      const prompt = argv._[0];
      if (!prompt) {
        console.error('Error: Please provide a prompt');
        process.exit(1);
      }
      
      console.log(`\n🎲 Generating ${argv.variations} variations...\n`);
      result = await generator.generateVariations({
        prompt,
        template: argv.template,
        brand: argv.brand,
        style: argv.style,
        provider: argv.provider,
        model: argv.model,
        width: argv.width,
        height: argv.height,
        negative_prompt: argv.negative,
        seed: argv.seed,
        enhance: !argv.noEnhance,
        save: !argv.noSave
      }, argv.variations);
      
      if (!argv.json) {
        console.log(`✅ Generated ${result.length} variations!\n`);
        result.forEach((r, i) => {
          console.log(`   Variation ${i + 1}: ${r.url}`);
          if (r.localPath) console.log(`      Saved: ${r.localPath}`);
        });
      }
    } else {
      // Standard generation
      const prompt = argv._[0];
      if (!prompt) {
        console.error('Error: Please provide a prompt');
        console.log('Run with --help for usage information');
        process.exit(1);
      }
      
      console.log('\n🎨 Generating image...\n');
      result = await generator.generate({
        prompt,
        template: argv.template,
        brand: argv.brand,
        style: argv.style,
        provider: argv.provider,
        model: argv.model,
        width: argv.width,
        height: argv.height,
        negative_prompt: argv.negative,
        seed: argv.seed,
        enhance: !argv.noEnhance,
        save: !argv.noSave
      });
      
      if (!argv.json) {
        console.log('✅ Image generated!');
        console.log(`   Provider: ${result.provider}`);
        console.log(`   Template: ${result.template || 'custom'}`);
        console.log(`   Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
        console.log(`   URL: ${result.url}`);
        if (result.localPath) console.log(`   Saved: ${result.localPath}`);
        console.log(`\n   Enhanced prompt: ${result.prompt.slice(0, 100)}...`);
      }
    }

    if (argv.json) {
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

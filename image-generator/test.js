/**
 * Test script for InnovateHub AI Image Generator
 */

const ImageGenerator = require('./index');

async function runTests() {
  console.log('🧪 InnovateHub AI Image Generator Tests\n');
  console.log('=' .repeat(50));

  const generator = new ImageGenerator({
    outputDir: './generated'
  });

  // Test 1: Basic generation
  console.log('\n📷 Test 1: Basic Image Generation');
  try {
    const result = await generator.generate({
      prompt: 'PlataPay mobile payment QR code scan',
      template: 'instagram_post',
      brand: 'platapay',
      style: 'photorealistic',
      save: false
    });
    console.log('   ✅ Success:', result.url.slice(0, 80) + '...');
    console.log('   📐 Dimensions:', result.dimensions.width, 'x', result.dimensions.height);
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
  }

  // Test 2: Agent profile
  console.log('\n👤 Test 2: Agent Profile Generation');
  try {
    const result = await generator.generateAgentProfile({
      gender: 'female',
      age: 'young professional',
      attire: 'business casual'
    });
    console.log('   ✅ Success:', result.url.slice(0, 80) + '...');
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
  }

  // Test 3: Branch location
  console.log('\n🏪 Test 3: Branch Location Generation');
  try {
    const result = await generator.generateBranchImage({
      locationType: 'mall kiosk',
      setting: 'SM Mall Philippines',
      features: 'digital screens, queue'
    });
    console.log('   ✅ Success:', result.url.slice(0, 80) + '...');
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
  }

  // Test 4: Product mockup
  console.log('\n📱 Test 4: Product Mockup Generation');
  try {
    const result = await generator.generateProductMockup({
      productName: 'PlataPay App',
      description: 'Digital wallet with QR payments',
      category: 'fintech mobile app'
    });
    console.log('   ✅ Success:', result.url.slice(0, 80) + '...');
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
  }

  // Test 5: Static methods
  console.log('\n📋 Test 5: Static Methods');
  console.log('   Templates:', Object.keys(ImageGenerator.getTemplates()).length);
  console.log('   Styles:', Object.keys(ImageGenerator.getStyles()).length);
  console.log('   Brands:', Object.keys(ImageGenerator.getBrands()).length);
  console.log('   Providers:', Object.keys(ImageGenerator.getProviders()).length);

  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed!\n');
}

runTests().catch(console.error);

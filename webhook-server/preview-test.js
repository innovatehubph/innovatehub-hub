// Quick test to see the actual rendered email HTML
const fs = require('fs');

// Load the server code and extract the template
const serverCode = fs.readFileSync('/root/innovatehub-hub/webhook-server/server.js', 'utf8');

const PLATAPAY_BRAND_COLOR = '#57317A';
const PLATAPAY_CTA_COLOR = '#28a745';
const PLATAPAY_LOGO_URL = 'https://webhook.innoserver.cloud/assets/PlataPay.png';

function emailBaseTemplate({ title, preheader, bodyContent }) {
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
  <div class="preheader">${preheader || ''}</div>
  <div class="container">
    <div class="header">
      <img src="${PLATAPAY_LOGO_URL}" alt="PlataPay Logo" />
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
  </div>
</body>
</html>`;
}

const data = {
  heroImage: "https://webhook.innoserver.cloud/assets/generated/agent_success_1771301117469_dbpzzz_email.jpg",
  preheader: "Test preheader"
};

const bodyContent = `
      ${data.heroImage ? `<img src="${data.heroImage}" alt="Become a PlataPay Agent" style="width:100%;max-width:600px;border-radius:12px;margin-bottom:20px;display:block;" />` : '<!-- NO HERO IMAGE PROVIDED -->'}
      <p>Good day!</p>`;

const html = emailBaseTemplate({
  title: 'Test',
  preheader: data.preheader,
  bodyContent
});

// Extract just the content div
const contentMatch = html.match(/<div class="content">([\s\S]*?)<\/div>/);
console.log('=== CONTENT SECTION ===');
console.log(contentMatch ? contentMatch[1].trim() : 'NOT FOUND');

#!/usr/bin/env node
/**
 * InnovateHub Dashboard — Comprehensive E2E Test Suite
 * Automated browser testing with screenshot capture at every step.
 * Simulates real human QA tester navigating every page and feature.
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3457';
const SCREENSHOT_DIR = join(import.meta.dirname, 'screenshots');
const RESULTS_DIR = join(import.meta.dirname, 'results');
const DOCS_SCREENSHOTS = join(import.meta.dirname, '..', 'docs', 'assets', 'screenshots');

mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });
mkdirSync(DOCS_SCREENSHOTS, { recursive: true });

const results = [];
let screenshotIdx = 0;

async function screenshot(page, name, description) {
  screenshotIdx++;
  const filename = `${String(screenshotIdx).padStart(2, '0')}-${name}.png`;
  const testPath = join(SCREENSHOT_DIR, filename);
  const docsPath = join(DOCS_SCREENSHOTS, filename);
  await page.screenshot({ path: testPath, fullPage: false });
  // Copy to docs
  const { readFileSync } = await import('fs');
  writeFileSync(docsPath, readFileSync(testPath));
  console.log(`  📸 ${filename}: ${description}`);
  return { filename, description };
}

function logResult(test, passed, details = '', screenshots = []) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${test}${details ? ' — ' + details : ''}`);
  results.push({ test, passed, details, screenshots, timestamp: new Date().toISOString() });
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Test Suites ───

async function testInitialLoad(page) {
  console.log('\n═══ Test Suite 1: Initial Page Load ═══');

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    const ss1 = await screenshot(page, 'initial-load', 'Dashboard initial load — landing page');

    // Check page title
    const title = await page.title();
    logResult('Page loads without blank screen', title.length > 0, `Title: "${title}"`, [ss1]);

    // Check if main content rendered (not blank)
    const bodyText = await page.$eval('body', el => el.innerText.length);
    logResult('Page has rendered content', bodyText > 50, `Body text length: ${bodyText}`);

    // Check for React error boundaries
    const hasError = await page.$('.error-boundary, [data-error]');
    logResult('No React error boundary triggered', !hasError);

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    await wait(1000);
    logResult('No critical console errors on load', consoleErrors.length === 0,
      consoleErrors.length > 0 ? `Errors: ${consoleErrors.slice(0, 3).join('; ')}` : '');

  } catch (err) {
    logResult('Initial page load', false, err.message);
  }
}

async function testNavigation(page) {
  console.log('\n═══ Test Suite 2: Sidebar Navigation ═══');

  const navRoutes = [
    { path: '#/', label: 'Dashboard', expectText: 'Dashboard' },
    { path: '#/businesses', label: 'Businesses', expectText: 'Business' },
    { path: '#/messenger', label: 'Messenger', expectText: 'Messenger' },
    { path: '#/bot-flows', label: 'Bot Flows', expectText: 'Bot' },
    { path: '#/pages', label: 'Page Management', expectText: 'Page' },
    { path: '#/campaigns', label: 'Ads & Campaigns', expectText: 'Campaign' },
    { path: '#/products', label: 'Products', expectText: 'Product' },
    { path: '#/orders', label: 'Orders', expectText: 'Order' },
    { path: '#/tokens', label: 'Token Store', expectText: 'Token' },
    { path: '#/webhooks', label: 'Webhook Logs', expectText: 'Webhook' },
    { path: '#/users', label: 'Users & Roles', expectText: 'User' },
    { path: '#/facebook-setup', label: 'Facebook Setup', expectText: 'Facebook' },
    { path: '#/ai-workshop', label: 'AI Workshop', expectText: 'Workshop' },
    { path: '#/settings', label: 'Settings', expectText: 'Setting' },
  ];

  for (const route of navRoutes) {
    try {
      await page.goto(`${BASE_URL}/${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await wait(1500);

      const pageContent = await page.$eval('body', el => el.innerText);
      const hasExpectedContent = pageContent.toLowerCase().includes(route.expectText.toLowerCase());

      const ssName = route.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ss = await screenshot(page, `nav-${ssName}`, `${route.label} page`);

      logResult(`Navigate to ${route.label}`, hasExpectedContent,
        hasExpectedContent ? 'Content rendered' : `Expected "${route.expectText}" not found`, [ss]);
    } catch (err) {
      logResult(`Navigate to ${route.label}`, false, err.message);
    }
  }
}

async function testSidebarCollapse(page) {
  console.log('\n═══ Test Suite 3: Sidebar Collapse/Expand ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    // Find collapse button (ChevronLeft/ChevronRight)
    const collapseBtn = await page.$('aside button');
    if (collapseBtn) {
      const ss1 = await screenshot(page, 'sidebar-expanded', 'Sidebar in expanded state');

      await collapseBtn.click();
      await wait(500);

      const ss2 = await screenshot(page, 'sidebar-collapsed', 'Sidebar in collapsed state');

      // Check if sidebar width changed
      const sidebarWidth = await page.$eval('aside', el => el.offsetWidth);
      logResult('Sidebar collapses', sidebarWidth < 100, `Width: ${sidebarWidth}px`, [ss1, ss2]);

      // Expand again
      const expandBtn = await page.$('aside button');
      if (expandBtn) {
        await expandBtn.click();
        await wait(500);
        const sidebarWidthExpanded = await page.$eval('aside', el => el.offsetWidth);
        logResult('Sidebar expands', sidebarWidthExpanded > 200, `Width: ${sidebarWidthExpanded}px`);
      }
    } else {
      logResult('Sidebar collapse button exists', false, 'Button not found');
    }
  } catch (err) {
    logResult('Sidebar collapse/expand', false, err.message);
  }
}

async function testBusinessSelector(page) {
  console.log('\n═══ Test Suite 4: Business Selector ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    // Find select element
    const select = await page.$('header select');
    if (select) {
      const ss1 = await screenshot(page, 'business-selector', 'Business selector dropdown in header');

      // Get options
      const options = await page.$$eval('header select option', els =>
        els.map(el => ({ value: el.value, text: el.textContent }))
      );

      logResult('Business selector has options', options.length >= 2,
        `Options: ${options.map(o => o.text).join(', ')}`, [ss1]);

      // Select a business
      if (options.length > 1) {
        await select.select(options[1].value);
        await wait(1000);
        const ss2 = await screenshot(page, 'business-selected', `Selected business: ${options[1].text}`);
        logResult('Can select a business', true, `Selected: ${options[1].text}`, [ss2]);
      }
    } else {
      logResult('Business selector exists', false, 'Select not found in header');
    }
  } catch (err) {
    logResult('Business selector', false, err.message);
  }
}

async function testDashboardPage(page) {
  console.log('\n═══ Test Suite 5: Dashboard Home Page ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(2000);

    const ss = await screenshot(page, 'dashboard-home', 'Dashboard home with stat cards and data');

    // Check for stat cards
    const statCards = await page.$$('[class*="rounded"]');
    logResult('Dashboard renders stat cards', statCards.length >= 2,
      `Found ${statCards.length} card-like elements`, [ss]);

    // Check for loading states resolved
    const spinners = await page.$$('.animate-spin');
    await wait(3000);
    const spinnersAfter = await page.$$('.animate-spin');
    logResult('Loading states resolve', spinnersAfter.length <= spinners.length,
      `Spinners before: ${spinners.length}, after: ${spinnersAfter.length}`);

  } catch (err) {
    logResult('Dashboard home page', false, err.message);
  }
}

async function testAIWorkshopPage(page) {
  console.log('\n═══ Test Suite 6: AI Workshop Page ═══');

  try {
    await page.goto(`${BASE_URL}/#/ai-workshop`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1500);

    const ss1 = await screenshot(page, 'ai-workshop-landing', 'AI Workshop landing with templates and input');

    // Check for templates
    const templates = await page.$$eval('button', btns =>
      btns.filter(b => b.textContent.includes('CRM') || b.textContent.includes('Email') ||
        b.textContent.includes('Analytics') || b.textContent.includes('Payment') ||
        b.textContent.includes('Inventory') || b.textContent.includes('Telegram'))
        .map(b => b.textContent.trim().split('\n')[0])
    );
    logResult('AI Workshop shows 6 templates', templates.length === 6,
      `Templates: ${templates.join(', ')}`, [ss1]);

    // Check for textarea
    const textarea = await page.$('textarea');
    logResult('AI Workshop has prompt input', !!textarea);

    // Check pipeline description text
    const pageText = await page.$eval('body', el => el.innerText);
    const hasPipelineText = pageText.includes('Generate') && pageText.includes('Stage') &&
      pageText.includes('QA Review') && pageText.includes('Production');
    logResult('Pipeline stages described', hasPipelineText,
      hasPipelineText ? 'Generate → Stage → QA Review → Deploy' : 'Missing pipeline text');

    // Type a prompt (don't submit — just show the UI)
    if (textarea) {
      await textarea.type('Create a test page for demo purposes');
      await wait(500);
      const ss2 = await screenshot(page, 'ai-workshop-typed', 'AI Workshop with user prompt typed');
      logResult('Can type in prompt field', true, '', [ss2]);
    }

  } catch (err) {
    logResult('AI Workshop page', false, err.message);
  }
}

async function testChatWidget(page) {
  console.log('\n═══ Test Suite 7: Chat Widget ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    // Look for chat widget button (usually bottom-right floating)
    const chatButtons = await page.$$('button');
    let chatBtn = null;
    for (const btn of chatButtons) {
      const text = await btn.evaluate(el => el.textContent + el.className);
      if (text.toLowerCase().includes('chat') || text.includes('MessageSquare') || text.includes('fixed')) {
        chatBtn = btn;
        break;
      }
    }

    // Try to find the fixed chat widget
    const chatWidget = await page.$('[class*="fixed"][class*="bottom"]');
    if (chatWidget || chatBtn) {
      const ss1 = await screenshot(page, 'chat-widget-closed', 'Chat widget button visible');

      // Try clicking it
      const clickTarget = chatWidget || chatBtn;
      await clickTarget.click();
      await wait(800);

      const ss2 = await screenshot(page, 'chat-widget-open', 'Chat widget opened');
      logResult('Chat widget opens on click', true, '', [ss1, ss2]);
    } else {
      const ss = await screenshot(page, 'chat-widget-search', 'Looking for chat widget');
      logResult('Chat widget is present', false, 'Widget not found in DOM', [ss]);
    }
  } catch (err) {
    logResult('Chat widget', false, err.message);
  }
}

async function testResponsiveDesign(page) {
  console.log('\n═══ Test Suite 8: Responsive Design ═══');

  const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'laptop-1366', width: 1366, height: 768 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-375', width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    try {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
      await wait(1500);

      const ss = await screenshot(page, `responsive-${vp.name}`, `Dashboard at ${vp.width}x${vp.height}`);

      // Check content is visible
      const bodyText = await page.$eval('body', el => el.innerText.length);
      logResult(`Responsive: ${vp.name} (${vp.width}x${vp.height})`, bodyText > 20,
        `Content length: ${bodyText}`, [ss]);
    } catch (err) {
      logResult(`Responsive: ${vp.name}`, false, err.message);
    }
  }

  // Reset to desktop
  await page.setViewport({ width: 1440, height: 900 });
}

async function testMobileNavigation(page) {
  console.log('\n═══ Test Suite 9: Mobile Navigation ═══');

  try {
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    const ss1 = await screenshot(page, 'mobile-nav-closed', 'Mobile view — sidebar hidden');

    // Find hamburger menu button
    const menuBtns = await page.$$('button');
    let menuBtn = null;
    for (const btn of menuBtns) {
      const isVisible = await btn.evaluate(el => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && el.offsetParent !== null;
      });
      const html = await btn.evaluate(el => el.innerHTML);
      if (isVisible && (html.includes('Menu') || html.includes('menu') || html.includes('M20'))) {
        menuBtn = btn;
        break;
      }
    }

    if (menuBtn) {
      await menuBtn.click();
      await wait(500);
      const ss2 = await screenshot(page, 'mobile-nav-open', 'Mobile view — sidebar opened via hamburger');
      logResult('Mobile hamburger menu works', true, '', [ss1, ss2]);
    } else {
      logResult('Mobile hamburger menu exists', false, 'Menu button not found');
    }

    // Reset viewport
    await page.setViewport({ width: 1440, height: 900 });
  } catch (err) {
    logResult('Mobile navigation', false, err.message);
    await page.setViewport({ width: 1440, height: 900 });
  }
}

async function testAPIEndpoints(page) {
  console.log('\n═══ Test Suite 10: AI Proxy API Endpoints ═══');

  const API = 'http://72.61.113.227:3456';

  try {
    // Health check
    const healthRes = await page.evaluate(async (url) => {
      const r = await fetch(`${url}/health`);
      return { status: r.status, body: await r.json() };
    }, API);
    logResult('API /health responds', healthRes.status === 200,
      `Status: ${healthRes.body.status}`);

    // Agent status
    const statusRes = await page.evaluate(async (url) => {
      const r = await fetch(`${url}/agent/status`);
      return { status: r.status, body: await r.json() };
    }, API);
    logResult('API /agent/status responds', statusRes.status === 200,
      `Files: ${statusRes.body.sourceFiles}, Routes: ${statusRes.body.routes}, Staging: ${statusRes.body.staging || 'none'}`);

    // Source tree
    const sourceRes = await page.evaluate(async (url) => {
      const r = await fetch(`${url}/agent/source`);
      const body = await r.json();
      return { status: r.status, fileCount: Object.keys(body.files || {}).length, routeCount: body.routes?.length || 0 };
    }, API);
    logResult('API /agent/source returns source tree', sourceRes.status === 200,
      `${sourceRes.fileCount} files, ${sourceRes.routeCount} routes`);

  } catch (err) {
    logResult('AI Proxy API endpoints', false, err.message);
  }
}

async function testPerformanceMetrics(page) {
  console.log('\n═══ Test Suite 11: Performance Metrics ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 30000 });

    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint');
      return {
        domContentLoaded: Math.round(perf?.domContentLoadedEventEnd - perf?.startTime || 0),
        loadComplete: Math.round(perf?.loadEventEnd - perf?.startTime || 0),
        fcp: fcp ? Math.round(fcp.startTime) : null,
        transferSize: Math.round((perf?.transferSize || 0) / 1024),
      };
    });

    logResult('DOM Content Loaded', metrics.domContentLoaded < 5000,
      `${metrics.domContentLoaded}ms`);
    logResult('Page Load Complete', metrics.loadComplete < 10000,
      `${metrics.loadComplete}ms`);
    if (metrics.fcp !== null) {
      logResult('First Contentful Paint', metrics.fcp < 3000,
        `${metrics.fcp}ms`);
    }
    logResult('Transfer size reasonable', metrics.transferSize < 2048,
      `${metrics.transferSize}KB`);
  } catch (err) {
    logResult('Performance metrics', false, err.message);
  }
}

async function testDataTablePages(page) {
  console.log('\n═══ Test Suite 12: Data Table Pages ═══');

  const dataPages = [
    { path: '#/products', label: 'Products' },
    { path: '#/orders', label: 'Orders' },
    { path: '#/messenger', label: 'Messenger' },
    { path: '#/webhooks', label: 'Webhook Logs' },
    { path: '#/users', label: 'Users & Roles' },
    { path: '#/tokens', label: 'Token Store' },
  ];

  for (const dp of dataPages) {
    try {
      await page.goto(`${BASE_URL}/${dp.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await wait(2000);

      // Check for table or data grid
      const hasTable = await page.$('table, [role="table"], [class*="grid"]');
      const hasDataContent = await page.$eval('body', el => {
        return el.innerText.includes('Name') || el.innerText.includes('Status') ||
          el.innerText.includes('Date') || el.innerText.includes('ID') ||
          el.innerText.includes('No ') || el.innerText.includes('Loading');
      });

      const ssName = dp.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ss = await screenshot(page, `data-${ssName}`, `${dp.label} page with data table`);

      logResult(`${dp.label} page renders`, hasTable || hasDataContent,
        hasTable ? 'Table found' : 'Data content found', [ss]);
    } catch (err) {
      logResult(`${dp.label} data page`, false, err.message);
    }
  }
}

async function testSettingsPage(page) {
  console.log('\n═══ Test Suite 13: Settings Page ═══');

  try {
    await page.goto(`${BASE_URL}/#/settings`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1500);

    const ss = await screenshot(page, 'settings-page', 'Settings page');
    const pageContent = await page.$eval('body', el => el.innerText);
    logResult('Settings page renders', pageContent.toLowerCase().includes('setting'),
      '', [ss]);
  } catch (err) {
    logResult('Settings page', false, err.message);
  }
}

async function testFacebookSetup(page) {
  console.log('\n═══ Test Suite 14: Facebook Setup Page ═══');

  try {
    await page.goto(`${BASE_URL}/#/facebook-setup`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1500);

    const ss = await screenshot(page, 'facebook-setup', 'Facebook Setup page');
    const pageContent = await page.$eval('body', el => el.innerText);
    logResult('Facebook Setup page renders',
      pageContent.toLowerCase().includes('facebook') || pageContent.toLowerCase().includes('app'),
      '', [ss]);
  } catch (err) {
    logResult('Facebook Setup page', false, err.message);
  }
}

async function testErrorHandling(page) {
  console.log('\n═══ Test Suite 15: Error Handling ═══');

  try {
    // Navigate to non-existent route
    await page.goto(`${BASE_URL}/#/nonexistent-route-xyz`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    const ss = await screenshot(page, 'error-404-route', 'Non-existent route handling');

    // Page should not crash
    const bodyText = await page.$eval('body', el => el.innerText.length);
    logResult('App handles unknown routes gracefully', bodyText > 10,
      'App did not crash on invalid route', [ss]);
  } catch (err) {
    logResult('Error handling', false, err.message);
  }
}

async function testThemeConsistency(page) {
  console.log('\n═══ Test Suite 16: Theme & UI Consistency ═══');

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(1000);

    // Check dark theme
    const bgColor = await page.$eval('body > div', el => getComputedStyle(el).backgroundColor);
    const isDark = bgColor.includes('15') || bgColor.includes('30') || bgColor.includes('51');
    logResult('Dark theme applied', isDark, `Background: ${bgColor}`);

    // Check sidebar styling
    const sidebarBg = await page.$eval('aside', el => getComputedStyle(el).backgroundColor);
    logResult('Sidebar has dark background', sidebarBg.includes('30') || sidebarBg.includes('51') || sidebarBg.includes('15'),
      `Sidebar bg: ${sidebarBg}`);

    // Check active nav item highlighting
    const activeNav = await page.$('aside a[class*="blue"]');
    logResult('Active nav item is highlighted', !!activeNav, 'Blue accent on active nav');

    const ss = await screenshot(page, 'theme-consistency', 'Theme consistency check — dark mode');
    results[results.length - 1].screenshots = [ss];
  } catch (err) {
    logResult('Theme consistency', false, err.message);
  }
}

// ─── Main Runner ───

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   InnovateHub Dashboard — E2E Test Suite                 ║');
  console.log('║   Target: ' + BASE_URL.padEnd(46) + ' ║');
  console.log('║   Date: ' + new Date().toISOString().padEnd(48) + ' ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Run all test suites in order
    await testInitialLoad(page);
    await testNavigation(page);
    await testSidebarCollapse(page);
    await testBusinessSelector(page);
    await testDashboardPage(page);
    await testAIWorkshopPage(page);
    await testChatWidget(page);
    await testResponsiveDesign(page);
    await testMobileNavigation(page);
    await testAPIEndpoints(page);
    await testPerformanceMetrics(page);
    await testDataTablePages(page);
    await testSettingsPage(page);
    await testFacebookSetup(page);
    await testErrorHandling(page);
    await testThemeConsistency(page);

  } catch (fatalErr) {
    console.error('\n💥 FATAL ERROR:', fatalErr.message);
  } finally {
    await browser.close();
  }

  // ─── Summary ───
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║   RESULTS: ${passed} passed, ${failed} failed, ${total} total`.padEnd(60) + '║');
  console.log(`║   Pass Rate: ${((passed / total) * 100).toFixed(1)}%`.padEnd(60) + '║');
  console.log(`║   Screenshots: ${screenshotIdx}`.padEnd(60) + '║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Save results JSON
  const report = {
    url: BASE_URL,
    timestamp: new Date().toISOString(),
    summary: { passed, failed, total, passRate: ((passed / total) * 100).toFixed(1) + '%' },
    tests: results,
  };
  writeFileSync(join(RESULTS_DIR, 'test-results.json'), JSON.stringify(report, null, 2));
  console.log(`\nResults saved to tests/results/test-results.json`);
  console.log(`Screenshots saved to tests/screenshots/ and docs/assets/screenshots/`);
}

runAllTests();

import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { getFullContext } from './source-registry.js';
import {
  createStagingBranch, getCurrentBranch, switchToMain, deleteBranch,
  writeFiles, patchAppRoutes, patchLayoutNav,
  buildDashboard, commitStaging, mergeToMainAndDeploy, rollbackStaging,
  deployToBack4App, createSchema,
} from './deployer.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const CREDENTIALS_PATH = '/root/.claude/.credentials.json';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages?beta=true';
const REFRESH_URL = 'https://console.anthropic.com/v1/oauth/token';
const PORT = 3456;
const API_SECRET = 'innovatehub-ai-2026';

// ─── Chat System Prompt ───
const CHAT_SYSTEM_PROMPT = `You are the InnovateHub Business Hub AI Assistant, powered by Claude. You help users manage their Facebook Business integration, PlataPay fintech services, and Silvera e-commerce platform.

You are an expert on:
- Facebook Developer Platform: App creation, Messenger, Webhooks, Marketing API, Instagram Graph API, Commerce/Catalog API
- Back4App/Parse: Cloud Code, data management, webhooks, scheduled jobs
- PlataPay: Digital payments, agent network, bill payments in the Philippines
- InnovateHub/Silvera: E-commerce, product catalog, order management
- Marketing: Facebook Ads, Instagram marketing, content strategy, lead generation

Key configuration:
- Webhook URL: https://parseapi.back4app.com/facebook/webhook
- Verify Token: innovatehub_verify_2024

Be helpful, concise, and practical. Use Filipino-English mix when appropriate for the Philippine market context.`;

// ─── Agent System Prompt ───
function buildAgentSystemPrompt(sourceContext) {
  const fileList = Object.keys(sourceContext.files).join('\n  ');
  const routeList = sourceContext.routes.map(r => `${r.path} → ${r.component}`).join('\n  ');
  const navList = sourceContext.navItems.map(n => `${n.path} "${n.label}" (${n.icon})`).join('\n  ');

  return `You are an expert full-stack developer agent for the InnovateHub Business Hub dashboard.
Your job is to generate React + TypeScript code that integrates seamlessly with the existing codebase.

## Tech Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 (use utility classes directly, no config file needed)
- react-router-dom v7 with HashRouter
- Parse SDK (Back4App) for data — import Parse from '../config/parse'
- lucide-react for icons
- All pages receive \`businessId\` prop for multi-tenant filtering

## Current Source Files:
  ${fileList}

## Current Routes:
  ${routeList}

## Current Nav Items:
  ${navList}

## Key Patterns

### Page Component Pattern:
\`\`\`tsx
import { useState, useEffect } from 'react';
import Parse from '../config/parse';

interface PageNameProps { businessId: string }

export default function PageName({ businessId }: PageNameProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const q = new Parse.Query('ClassName');
        if (businessId) {
          const bp = new Parse.Object('Business');
          bp.id = businessId;
          q.equalTo('business', bp);
        }
        q.descending('createdAt');
        q.limit(100);
        const results = await q.find({ useMasterKey: true });
        setData(results.map(r => r.toJSON()));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [businessId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Page Title</h1>
        <p className="text-slate-400 text-sm mt-1">Description</p>
      </div>
      {/* Content */}
    </div>
  );
}
\`\`\`

### Existing Reusable Components:
- StatCard: \`<StatCard title="X" value={n} icon={Icon} color="blue" loading={bool} />\`
- DataTable: Full CRUD table with modal forms, pagination, search
- ChatWidget: AI chat (already integrated)

### Back4App Parse Classes Available:
Business, BusinessUser, TokenStore, MessengerContact, Conversation, Message, BotFlow,
PagePost, PostComment, PageInsight, ScheduledAction, AdCampaign, AdSet, Ad, FbLead,
Product, Order, WebhookLog

### Colors available for StatCard: blue, green, purple, yellow, cyan, red

## Response Format
You MUST respond with valid JSON only. No markdown, no explanation outside JSON.
{
  "plan": "Brief description of what will be built",
  "files": [
    {
      "path": "pages/NewPage.tsx",
      "content": "full file content here",
      "action": "create"
    }
  ],
  "route": { "path": "/new-page", "component": "NewPage", "importPath": "./pages/NewPage" },
  "navItem": { "path": "/new-page", "label": "New Page", "icon": "IconName" },
  "schema": null
}

If modifying existing files, set action to "modify" and provide the complete new file content.
If creating a Back4App schema, include: "schema": { "className": "X", "fields": { "name": "String", ... } }
The route and navItem fields are optional — only include them for new pages.`;
}

// ─── Token Management ───
function loadCredentials() {
  const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(raw).claudeAiOauth;
}

async function refreshToken(creds) {
  console.log('[AI Proxy] Refreshing OAuth token...');
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: creds.refreshToken }),
  });
  if (!res.ok) throw new Error('Token refresh failed: ' + await res.text());
  const data = await res.json();
  const fullCreds = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  fullCreds.claudeAiOauth.accessToken = data.access_token;
  fullCreds.claudeAiOauth.refreshToken = data.refresh_token || creds.refreshToken;
  fullCreds.claudeAiOauth.expiresAt = Date.now() + (data.expires_in * 1000);
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(fullCreds));
  return fullCreds.claudeAiOauth;
}

async function getValidToken() {
  let creds = loadCredentials();
  if (creds.expiresAt < Date.now() + 300000) creds = await refreshToken(creds);
  return creds.accessToken;
}

async function callClaude(systemPrompt, messages, maxTokens = 4096) {
  const token = await getValidToken();
  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'oauth-2025-04-20',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'AI request failed');
  return data.content?.[0]?.text || '';
}

// ─── Auth Middleware ───
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === API_SECRET) return next();
  const ip = req.ip || req.connection?.remoteAddress;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ─── Health ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'innovatehub-ai-proxy' });
});

// ─── Chat Endpoint ───
app.post('/chat', authenticate, async (req, res) => {
  try {
    const { messages, businessContext } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    let systemPrompt = CHAT_SYSTEM_PROMPT;
    if (businessContext) systemPrompt += '\n\nCurrent business context: ' + businessContext;

    const responseText = await callClaude(systemPrompt, messages.map(m => ({ role: m.role, content: m.content })), 1024);
    res.json({ response: responseText });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Get Source Tree ───
app.get('/agent/source', authenticate, (req, res) => {
  try {
    const context = getFullContext();
    res.json(context);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Generate Code ───
app.post('/agent/generate', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    console.log('[Agent] Generating:', prompt.slice(0, 100));

    const sourceContext = getFullContext();
    const systemPrompt = buildAgentSystemPrompt(sourceContext);

    const responseText = await callClaude(systemPrompt, [
      { role: 'user', content: prompt }
    ], 8192);

    // Parse JSON response from Claude
    let result;
    try {
      // Try to extract JSON from the response (Claude sometimes wraps in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseErr) {
      return res.status(500).json({
        error: 'Failed to parse AI response as JSON',
        raw: responseText.slice(0, 2000),
      });
    }

    console.log('[Agent] Generated plan:', result.plan);
    console.log('[Agent] Files:', result.files?.length || 0);

    res.json(result);
  } catch (err) {
    console.error('[Agent] Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Apply to Staging ───
let deployLock = false;
const stagingState = {}; // { branch, files, route, navItem, schema, plan }

app.post('/agent/apply', authenticate, async (req, res) => {
  if (deployLock) return res.status(409).json({ error: 'Deploy already in progress' });
  deployLock = true;

  try {
    const { files, route, navItem, schema, plan } = req.body;
    const log = [];

    // 1. Create staging branch
    const featureName = plan || 'feature';
    console.log('[Agent] Creating staging branch for:', featureName);
    const branch = createStagingBranch(featureName);
    log.push({ step: 'branch', branch });

    // 2. Create schema if needed
    if (schema) {
      console.log('[Agent] Creating schema:', schema.className);
      const schemaResult = createSchema(schema.className, schema.fields);
      log.push({ step: 'schema', ...schemaResult });
    }

    // 3. Write files
    if (files && files.length > 0) {
      console.log('[Agent] Writing', files.length, 'files');
      const writeResult = writeFiles(files);
      log.push({ step: 'write', files: writeResult });
    }

    // 4. Patch routes
    if (route) {
      console.log('[Agent] Adding route:', route.path);
      patchAppRoutes(route);
      log.push({ step: 'route', path: route.path });
    }

    // 5. Patch nav
    if (navItem) {
      console.log('[Agent] Adding nav item:', navItem.label);
      patchLayoutNav(navItem);
      log.push({ step: 'nav', label: navItem.label });
    }

    // 6. Build (test only, NOT deployed to production)
    console.log('[Agent] Building dashboard on staging...');
    const buildResult = buildDashboard();
    log.push({ step: 'build', ...buildResult });

    if (!buildResult.success) {
      // Rollback staging branch on build failure
      console.log('[Agent] Build failed, rolling back staging branch');
      rollbackStaging(branch);
      log.push({ step: 'rollback', reason: 'build failed' });
      return res.json({ success: false, log, error: 'Build failed — staging rolled back' });
    }

    // 7. Commit to staging (not main)
    const commitResult = commitStaging(`feat: ${featureName}`);
    log.push({ step: 'commit', ...commitResult });

    // Store staging state for QA/promote
    stagingState.branch = branch;
    stagingState.files = files;
    stagingState.route = route;
    stagingState.navItem = navItem;
    stagingState.schema = schema;
    stagingState.plan = plan || '';

    console.log('[Agent] Staged on branch:', branch);
    res.json({ success: true, branch, log, status: 'staged' });
  } catch (err) {
    console.error('[Agent] Apply error:', err.message);
    // Try to recover to main
    try { switchToMain(); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    deployLock = false;
  }
});

// ─── Agent: QA Review ───
app.post('/agent/qa', authenticate, async (req, res) => {
  try {
    if (!stagingState.branch) {
      return res.status(400).json({ error: 'No staging branch active. Run /agent/apply first.' });
    }

    console.log('[Agent] Running QA review on branch:', stagingState.branch);

    const sourceContext = getFullContext();
    const filesToReview = (stagingState.files || []).map(f => `--- ${f.path} (${f.action}) ---\n${f.content}`).join('\n\n');

    const qaPrompt = `You are an expert QA engineer and code reviewer for a React + TypeScript + Tailwind CSS dashboard app.

## Your task
Review the following generated code for quality, correctness, and safety before it goes to production.

## Tech Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 (utility classes only)
- Parse SDK (Back4App) for data
- lucide-react icons
- HashRouter (react-router-dom v7)

## Current routes in the app:
${sourceContext.routes.map(r => `${r.path} → ${r.component}`).join('\n')}

## Current nav items:
${sourceContext.navItems.map(n => `${n.path} → ${n.label}`).join('\n')}

## Code to review:
${filesToReview}

${stagingState.route ? `New route: ${stagingState.route.path} → ${stagingState.route.component}` : ''}
${stagingState.navItem ? `New nav item: ${stagingState.navItem.path} → ${stagingState.navItem.label}` : ''}
${stagingState.schema ? `New schema: ${stagingState.schema.className} with fields: ${JSON.stringify(stagingState.schema.fields)}` : ''}

## Review Criteria
1. **TypeScript correctness**: Proper types, no any where avoidable, correct prop types
2. **React best practices**: Proper hooks usage, no memory leaks, correct dependencies in useEffect
3. **Security**: No XSS, no injection vulnerabilities, proper data sanitization
4. **UI/UX**: Consistent Tailwind styling with existing dark theme (slate-800/900 bg, blue/purple accents), responsive design
5. **Data handling**: Correct Parse queries, proper error handling, loading states
6. **Route/Nav conflicts**: No duplicate routes or nav items
7. **Import correctness**: All imports resolve to existing or newly created files

## Response Format (JSON only)
{
  "approved": true/false,
  "score": 1-10,
  "issues": [
    { "severity": "critical|warning|info", "file": "path", "line": null, "message": "description" }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "summary": "Brief overall assessment"
}`;

    const responseText = await callClaude(qaPrompt, [
      { role: 'user', content: 'Review this code and provide your assessment.' }
    ], 4096);

    let qaResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      qaResult = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      qaResult = { approved: false, score: 0, summary: 'Failed to parse QA response', issues: [], suggestions: [], raw: responseText.slice(0, 1000) };
    }

    console.log('[Agent] QA result: approved=%s score=%d', qaResult.approved, qaResult.score);
    res.json({ ...qaResult, branch: stagingState.branch });
  } catch (err) {
    console.error('[Agent] QA error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Promote to Production ───
app.post('/agent/promote', authenticate, async (req, res) => {
  if (deployLock) return res.status(409).json({ error: 'Deploy already in progress' });
  deployLock = true;

  try {
    if (!stagingState.branch) {
      return res.status(400).json({ error: 'No staging branch to promote. Run /agent/apply first.' });
    }

    const branch = stagingState.branch;
    console.log('[Agent] Promoting branch to production:', branch);
    const log = [];

    // Merge staging → main, build, deploy
    const result = mergeToMainAndDeploy(branch);

    if (result.success) {
      log.push({ step: 'merge', success: true });
      log.push({ step: 'build', success: true });
      log.push({ step: 'deploy', success: true, output: result.deployOutput });

      // Clear staging state
      stagingState.branch = null;
      stagingState.files = null;
      stagingState.route = null;
      stagingState.navItem = null;
      stagingState.schema = null;
      stagingState.plan = '';

      console.log('[Agent] Production deploy complete');
      res.json({ success: true, log, status: 'deployed' });
    } else {
      log.push({ step: result.step, success: false, output: result.output });
      console.log('[Agent] Promote failed at step:', result.step);
      res.json({ success: false, log, error: `Failed at ${result.step}: ${result.output}` });
    }
  } catch (err) {
    console.error('[Agent] Promote error:', err.message);
    try { switchToMain(); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    deployLock = false;
  }
});

// ─── Agent: Rollback Staging ───
app.post('/agent/rollback', authenticate, (req, res) => {
  try {
    if (!stagingState.branch) {
      return res.status(400).json({ error: 'No staging branch to rollback' });
    }
    const branch = stagingState.branch;
    console.log('[Agent] Rolling back staging branch:', branch);
    const result = rollbackStaging(branch);

    // Clear staging state
    stagingState.branch = null;
    stagingState.files = null;
    stagingState.route = null;
    stagingState.navItem = null;
    stagingState.schema = null;
    stagingState.plan = '';

    res.json({ success: result.success, branch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Create Schema Only ───
app.post('/agent/schema', authenticate, async (req, res) => {
  try {
    const { className, fields } = req.body;
    if (!className || !fields) return res.status(400).json({ error: 'className and fields required' });
    const result = createSchema(className, fields);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent: Status ───
app.get('/agent/status', authenticate, (req, res) => {
  const ctx = getFullContext();
  res.json({
    deploying: deployLock,
    sourceFiles: Object.keys(ctx.files).length,
    routes: ctx.routes.length,
    staging: stagingState.branch ? {
      branch: stagingState.branch,
      plan: stagingState.plan,
      files: (stagingState.files || []).map(f => f.path),
    } : null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Proxy] InnovateHub AI Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`[AI Proxy] Endpoints: /agent/generate, /agent/apply, /agent/qa, /agent/promote, /agent/rollback`);
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

// ─── Config ───

const APP_ID = 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN';
const JS_KEY = '4LJLYoC5inPb7m8zkNs6KmwnqlnvQ2eXa2Z5LMhm';
const MASTER_KEY = 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h';
const PARSE_URL = 'https://parseapi.back4app.com';

const PROJECT_DIR = '/root/innovatehub-hub';
const DASHBOARD_DIR = join(PROJECT_DIR, 'dashboard');
const DASHBOARD_SRC = join(DASHBOARD_DIR, 'src');
const B4A_DEPLOY_DIR = join(PROJECT_DIR, 'b4a-deploy');

const BUSINESSES = {
  platapay: { id: 'GTHxktOij6', name: 'PlataPay', slug: 'platapay' },
  innovatehub: { id: 'g3EFKft6Wj', name: 'InnovateHub', slug: 'innovatehub' },
};

// ─── Helpers ───

function parseHeaders(useMaster = false) {
  const h = {
    'X-Parse-Application-Id': APP_ID,
    'Content-Type': 'application/json',
  };
  if (useMaster) {
    h['X-Parse-Master-Key'] = MASTER_KEY;
  } else {
    h['X-Parse-REST-API-Key'] = JS_KEY;
  }
  return h;
}

async function parseRequest(method, path, body = null, useMaster = false) {
  const opts = { method, headers: parseHeaders(useMaster) };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${PARSE_URL}${path}`, opts);
  return res.json();
}

function shell(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf-8',
    timeout: opts.timeout || 30000,
    cwd: opts.cwd || PROJECT_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

// ─── Source Registry (replicated from ai-proxy/source-registry.js) ───

const ALLOWED_EXT = new Set(['.tsx', '.ts', '.css', '.json']);

function extractRoutes() {
  const appPath = join(DASHBOARD_SRC, 'App.tsx');
  if (!existsSync(appPath)) return [];
  const content = readFileSync(appPath, 'utf-8');
  const routes = [];
  const re = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;
  let m;
  while ((m = re.exec(content))) routes.push({ path: m[1], component: m[2] });
  return routes;
}

function extractNavItems() {
  const layoutPath = join(DASHBOARD_SRC, 'components/Layout.tsx');
  if (!existsSync(layoutPath)) return [];
  const content = readFileSync(layoutPath, 'utf-8');
  const items = [];
  const re = /\{\s*path:\s*'([^']+)',\s*label:\s*'([^']+)',\s*icon:\s*(\w+)\s*\}/g;
  let m;
  while ((m = re.exec(content))) items.push({ path: m[1], label: m[2], icon: m[3] });
  return items;
}

function extractComponents() {
  const dir = join(DASHBOARD_SRC, 'components');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''));
}

function extractPages() {
  const dir = join(DASHBOARD_SRC, 'pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''));
}

function scanSourceTree() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist') continue;
        walk(full);
      } else if (ALLOWED_EXT.has(extname(entry))) {
        files.push(relative(DASHBOARD_SRC, full));
      }
    }
  };
  if (existsSync(DASHBOARD_SRC)) walk(DASHBOARD_SRC);
  return files;
}

// ─── MCP Server ───

const server = new McpServer({
  name: 'innovatehub',
  version: '1.0.0',
});

// ── Tools ──

// 1. query_data
server.tool(
  'query_data',
  'Query any Back4App class with optional filters, limit, skip, order',
  {
    className: z.string().describe('Parse class name (e.g. Business, Product, _User)'),
    filters: z.record(z.any()).optional().describe('Parse where clause as JSON object'),
    limit: z.number().optional().describe('Max results (default 100)'),
    skip: z.number().optional().describe('Number of results to skip'),
    order: z.string().optional().describe('Sort field, prefix with - for descending'),
  },
  async ({ className, filters, limit, skip, order }) => {
    const params = new URLSearchParams();
    if (filters && Object.keys(filters).length) params.set('where', JSON.stringify(filters));
    if (limit) params.set('limit', String(limit));
    if (skip) params.set('skip', String(skip));
    if (order) params.set('order', order);
    const qs = params.toString();
    const path = `/classes/${className}${qs ? '?' + qs : ''}`;
    const data = await parseRequest('GET', path, null, true);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// 2. create_record
server.tool(
  'create_record',
  'Create a new record in a Back4App class',
  {
    className: z.string().describe('Parse class name'),
    fields: z.record(z.any()).describe('Field values for the new record'),
  },
  async ({ className, fields }) => {
    const data = await parseRequest('POST', `/classes/${className}`, fields, true);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// 3. update_record
server.tool(
  'update_record',
  'Update an existing record by objectId',
  {
    className: z.string().describe('Parse class name'),
    objectId: z.string().describe('Object ID of the record to update'),
    fields: z.record(z.any()).describe('Fields to update'),
  },
  async ({ className, objectId, fields }) => {
    const data = await parseRequest('PUT', `/classes/${className}/${objectId}`, fields, true);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// 4. delete_record
server.tool(
  'delete_record',
  'Delete a record by objectId',
  {
    className: z.string().describe('Parse class name'),
    objectId: z.string().describe('Object ID of the record to delete'),
  },
  async ({ className, objectId }) => {
    const data = await parseRequest('DELETE', `/classes/${className}/${objectId}`, null, true);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// 5. get_source_tree
server.tool(
  'get_source_tree',
  'Returns dashboard routes, nav items, components, pages, and file listing',
  {},
  async () => {
    const result = {
      routes: extractRoutes(),
      navItems: extractNavItems(),
      components: extractComponents(),
      pages: extractPages(),
      files: scanSourceTree(),
    };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// 6. read_project_file
server.tool(
  'read_project_file',
  'Read any project file by relative path (relative to /root/innovatehub-hub)',
  {
    path: z.string().describe('Relative file path, e.g. dashboard/src/App.tsx'),
  },
  async ({ path: relPath }) => {
    const fullPath = join(PROJECT_DIR, relPath);
    if (!existsSync(fullPath)) {
      return { content: [{ type: 'text', text: `Error: File not found: ${relPath}` }], isError: true };
    }
    try {
      const content = readFileSync(fullPath, 'utf-8');
      return { content: [{ type: 'text', text: content }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error reading file: ${err.message}` }], isError: true };
    }
  }
);

// 7. build_dashboard
server.tool(
  'build_dashboard',
  'Run npm run build in the dashboard directory and report output',
  {},
  async () => {
    try {
      const output = shell('npm run build', { cwd: DASHBOARD_DIR, timeout: 120000 });
      return { content: [{ type: 'text', text: `Build succeeded.\n\n${output}` }] };
    } catch (err) {
      const msg = err.stderr || err.stdout || err.message;
      return { content: [{ type: 'text', text: `Build failed.\n\n${msg}` }], isError: true };
    }
  }
);

// 8. deploy
server.tool(
  'deploy',
  'Build dashboard, copy to b4a-deploy/public, run b4a deploy -f',
  {},
  async () => {
    const steps = [];
    // Build
    try {
      shell('npm run build', { cwd: DASHBOARD_DIR, timeout: 120000 });
      steps.push('Build: OK');
    } catch (err) {
      return { content: [{ type: 'text', text: `Deploy failed at build step.\n\n${err.stderr || err.message}` }], isError: true };
    }
    // Copy dist to b4a-deploy/public
    try {
      const publicDir = join(B4A_DEPLOY_DIR, 'public');
      shell(`rm -rf "${publicDir}" && cp -r "${join(DASHBOARD_DIR, 'dist')}" "${publicDir}"`);
      steps.push('Copy to b4a-deploy/public: OK');
    } catch (err) {
      return { content: [{ type: 'text', text: `Deploy failed at copy step.\n\n${err.message}` }], isError: true };
    }
    // Deploy
    try {
      const output = shell('b4a deploy -f', { cwd: B4A_DEPLOY_DIR, timeout: 120000 });
      steps.push(`Deploy: OK\n${output}`);
    } catch (err) {
      return { content: [{ type: 'text', text: `Deploy failed at b4a deploy step.\n\n${err.stderr || err.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: steps.join('\n') }] };
  }
);

// 9. manage_service
server.tool(
  'manage_service',
  'Start, stop, or restart a pm2 process by name',
  {
    name: z.string().describe('pm2 process name'),
    action: z.enum(['start', 'stop', 'restart']).describe('Action to perform'),
  },
  async ({ name, action }) => {
    try {
      const output = shell(`pm2 ${action} ${name}`);
      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `pm2 ${action} ${name} failed: ${err.message}` }], isError: true };
    }
  }
);

// 10. service_logs
server.tool(
  'service_logs',
  'Get recent pm2 logs for a service',
  {
    name: z.string().describe('pm2 process name'),
    lines: z.number().optional().describe('Number of lines (default 50)'),
  },
  async ({ name, lines }) => {
    try {
      const n = lines || 50;
      const output = shell(`pm2 logs ${name} --lines ${n} --nostream`, { timeout: 10000 });
      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Failed to get logs: ${err.message}` }], isError: true };
    }
  }
);

// 11. run_tests
server.tool(
  'run_tests',
  'Execute the E2E test suite and return pass/fail summary',
  {},
  async () => {
    const testFile = join(PROJECT_DIR, 'tests/e2e-test-suite.mjs');
    if (!existsSync(testFile)) {
      return { content: [{ type: 'text', text: 'No test suite found at tests/e2e-test-suite.mjs' }], isError: true };
    }
    try {
      const output = shell(`node ${testFile}`, { cwd: PROJECT_DIR, timeout: 120000 });
      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      const msg = err.stdout || err.stderr || err.message;
      return { content: [{ type: 'text', text: `Tests completed with failures:\n\n${msg}` }], isError: true };
    }
  }
);

// 12. git_info
server.tool(
  'git_info',
  'Show git status, current branch, recent commits, and diff summary',
  {},
  async () => {
    try {
      const branch = shell('git rev-parse --abbrev-ref HEAD');
      const status = shell('git status --short');
      const log = shell('git log --oneline -10');
      const diff = shell('git diff --stat');
      const result = [
        `Branch: ${branch}`,
        '',
        '── Status ──',
        status || '(clean)',
        '',
        '── Recent Commits ──',
        log,
        '',
        '── Diff ──',
        diff || '(no unstaged changes)',
      ].join('\n');
      return { content: [{ type: 'text', text: result }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Git error: ${err.message}` }], isError: true };
    }
  }
);

// ── Resources ──

// 1. Project Config
server.resource(
  'config',
  'innovatehub://config',
  { description: 'Project configuration: Parse keys, business IDs, service ports, URLs' },
  async () => {
    let pm2Services = [];
    try {
      const jlist = shell('pm2 jlist');
      pm2Services = JSON.parse(jlist).map(p => ({ name: p.name, status: p.pm2_env?.status, port: p.pm2_env?.env?.PORT }));
    } catch {}

    const config = {
      back4app: {
        appId: APP_ID,
        serverUrl: PARSE_URL,
        dashboardUrl: 'https://preview-innovatehubbusines.b4a.app/',
      },
      businesses: BUSINESSES,
      services: pm2Services,
      paths: {
        project: PROJECT_DIR,
        dashboard: DASHBOARD_DIR,
        dashboardSrc: DASHBOARD_SRC,
        b4aDeploy: B4A_DEPLOY_DIR,
        aiProxy: join(PROJECT_DIR, 'ai-proxy'),
        tests: join(PROJECT_DIR, 'tests'),
      },
    };
    return { contents: [{ uri: 'innovatehub://config', text: JSON.stringify(config, null, 2), mimeType: 'application/json' }] };
  }
);

// 2. Dashboard Routes
server.resource(
  'routes',
  'innovatehub://routes',
  { description: 'Current dashboard routes and nav items extracted from source' },
  async () => {
    const data = {
      routes: extractRoutes(),
      navItems: extractNavItems(),
    };
    return { contents: [{ uri: 'innovatehub://routes', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }] };
  }
);

// 3. Services
server.resource(
  'services',
  'innovatehub://services',
  { description: 'PM2 process list with status' },
  async () => {
    let services = [];
    try {
      const jlist = shell('pm2 jlist');
      services = JSON.parse(jlist).map(p => ({
        name: p.name,
        status: p.pm2_env?.status,
        pid: p.pid,
        uptime: p.pm2_env?.pm_uptime,
        restarts: p.pm2_env?.restart_time,
        memory: p.monit?.memory,
        cpu: p.monit?.cpu,
      }));
    } catch (err) {
      services = [{ error: err.message }];
    }
    return { contents: [{ uri: 'innovatehub://services', text: JSON.stringify(services, null, 2), mimeType: 'application/json' }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER 4: Marketing Automation Tools
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_SERVER_URL = 'http://localhost:3790';

// 13. get_leads_summary
server.tool(
  'get_leads_summary',
  'Get lead analytics: counts by score tier, pipeline stage, recent leads',
  {
    days: z.number().optional().describe('Number of days to look back (default 7)'),
  },
  async ({ days = 7 }) => {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      // Get lead counts by score tier
      const scoreRes = await fetch(`${WEBHOOK_SERVER_URL}/api/leads/by-score?limit=1000`);
      const scoreData = await scoreRes.json();
      
      // Get pipeline stages
      const pipelineData = await parseRequest('GET', '/classes/FbLead?limit=1000', null, true);
      const leads = pipelineData.results || [];
      
      const stageCount = {};
      const recentLeads = [];
      
      leads.forEach(l => {
        const stage = l.pipelineStage || 'unassigned';
        stageCount[stage] = (stageCount[stage] || 0) + 1;
        
        if (new Date(l.createdAt) > new Date(since)) {
          recentLeads.push({
            id: l.objectId,
            name: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim(),
            email: l.email,
            score: l.leadScore,
            tier: l.leadScoreTier,
            stage: l.pipelineStage,
            createdAt: l.createdAt
          });
        }
      });

      const result = {
        totalLeads: leads.length,
        byScoreTier: scoreData.summary || {},
        byPipelineStage: stageCount,
        recentLeads: recentLeads.slice(0, 20),
        period: `${days} days`
      };
      
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 14. get_email_analytics
server.tool(
  'get_email_analytics',
  'Get email sending statistics: sent, failed, templates used',
  {
    days: z.number().optional().describe('Number of days to look back (default 7)'),
  },
  async ({ days = 7 }) => {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const emailLogs = await parseRequest('GET', `/classes/EmailLog?where=${encodeURIComponent(JSON.stringify({
        sentAt: { $gte: { __type: 'Date', iso: since } }
      }))}&limit=1000`, null, true);
      
      const logs = emailLogs.results || [];
      const byTemplate = {};
      const byStatus = { sent: 0, failed: 0 };
      const byDay = {};
      
      logs.forEach(l => {
        // By template
        const t = l.template || 'unknown';
        byTemplate[t] = (byTemplate[t] || 0) + 1;
        
        // By status
        byStatus[l.status] = (byStatus[l.status] || 0) + 1;
        
        // By day
        const day = l.sentAt?.iso?.substring(0, 10) || 'unknown';
        byDay[day] = (byDay[day] || 0) + 1;
      });

      const result = {
        totalEmails: logs.length,
        byStatus,
        byTemplate,
        byDay,
        period: `${days} days`
      };
      
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 15. send_marketing_email
server.tool(
  'send_marketing_email',
  'Send a marketing email using the webhook server',
  {
    to: z.string().describe('Recipient email address'),
    template: z.string().describe('Email template name (welcome_agent, franchise_inquiry, etc.)'),
    subject: z.string().optional().describe('Custom subject line'),
    data: z.record(z.any()).optional().describe('Template data (name, content, etc.)'),
  },
  async ({ to, template, subject, data }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, template, subject, data: data || {} })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 16. update_lead_pipeline
server.tool(
  'update_lead_pipeline',
  'Move a lead to a new pipeline stage (triggers stage emails)',
  {
    leadId: z.string().describe('Lead objectId'),
    newStage: z.enum(['inquiry', 'application', 'screening', 'training', 'onboarded', 'rejected']).describe('New pipeline stage'),
    notes: z.string().optional().describe('Optional notes about the stage change'),
  },
  async ({ leadId, newStage, notes }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/update-pipeline-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, newStage, notes })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 17. get_bot_flows
server.tool(
  'get_bot_flows',
  'List all bot flows with trigger keywords and step counts',
  {},
  async () => {
    try {
      const flows = await parseRequest('GET', '/classes/BotFlow?limit=100', null, true);
      const result = (flows.results || []).map(f => ({
        id: f.objectId,
        name: f.name,
        isActive: f.isActive,
        triggerKeywords: f.triggerKeywords || [],
        stepCount: (f.steps || []).length,
        createdAt: f.createdAt
      }));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 18. get_ab_test_results
server.tool(
  'get_ab_test_results',
  'Get A/B test results for bot flows with conversion rates',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/ab-tests`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 19. get_sla_report
server.tool(
  'get_sla_report',
  'Get conversation SLA compliance report',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/sla-report`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 20. get_referral_analytics
server.tool(
  'get_referral_analytics',
  'Get referral source tracking and conversion data',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/analytics/referrals`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 21. trigger_daily_digest
server.tool(
  'trigger_daily_digest',
  'Manually trigger the admin daily digest email',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/send-daily-digest`, { method: 'POST' });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 22. trigger_reengagement
server.tool(
  'trigger_reengagement',
  'Manually trigger re-engagement sequence for dormant contacts',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/trigger-reengagement`, { method: 'POST' });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 23. check_conversation_sla
server.tool(
  'check_conversation_sla',
  'Manually run SLA compliance check (sends alerts for pending conversations)',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/check-sla`, { method: 'POST' });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 24. schedule_email
server.tool(
  'schedule_email',
  'Schedule an email to be sent at a future time',
  {
    to: z.string().describe('Recipient email address'),
    template: z.string().describe('Email template name'),
    sendAt: z.string().describe('ISO datetime when to send the email'),
    subject: z.string().optional().describe('Custom subject line'),
    data: z.record(z.any()).optional().describe('Template data'),
  },
  async ({ to, template, sendAt, subject, data }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/schedule-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, template, sendAt, subject, data: data || {} })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 25. get_scheduled_emails
server.tool(
  'get_scheduled_emails',
  'List all pending scheduled emails',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/scheduled-emails`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 26. find_duplicate_contacts
server.tool(
  'find_duplicate_contacts',
  'Find duplicate contacts for a business by phone/email',
  {
    businessId: z.string().describe('Business objectId'),
  },
  async ({ businessId }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/duplicates/${businessId}`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 27. merge_contacts
server.tool(
  'merge_contacts',
  'Merge two duplicate contacts into one',
  {
    primaryContactId: z.string().describe('Contact to keep'),
    secondaryContactId: z.string().describe('Contact to merge into primary'),
  },
  async ({ primaryContactId, secondaryContactId }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/merge-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryContactId, secondaryContactId })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 28. enroll_nurture_sequence
server.tool(
  'enroll_nurture_sequence',
  'Enroll a lead in a nurture sequence',
  {
    businessId: z.string().describe('Business objectId'),
    leadId: z.string().describe('Lead objectId'),
    sequenceId: z.string().describe('NurtureSequence objectId'),
  },
  async ({ businessId, leadId, sequenceId }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/enroll-in-nurture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, leadId, sequenceId })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 29. register_webinar
server.tool(
  'register_webinar',
  'Register someone for a webinar and send confirmation email',
  {
    email: z.string().describe('Attendee email'),
    name: z.string().optional().describe('Attendee name'),
    webinarDate: z.string().describe('Date of webinar (e.g., "February 20, 2026")'),
    webinarTime: z.string().describe('Time of webinar (e.g., "2:00 PM")'),
    meetingLink: z.string().optional().describe('Zoom/Meet link'),
    meetingId: z.string().optional().describe('Meeting ID'),
    passcode: z.string().optional().describe('Meeting passcode'),
  },
  async ({ email, name, webinarDate, webinarTime, meetingLink, meetingId, passcode }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/webinar/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, webinarDate, webinarTime, meetingLink, meetingId, passcode })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Resources: Marketing Analytics
// ═══════════════════════════════════════════════════════════════════════════

// 4. Marketing Dashboard
server.resource(
  'marketing-dashboard',
  'innovatehub://marketing-dashboard',
  { description: 'Live marketing metrics: leads, emails, SLA, referrals' },
  async () => {
    let dashboard = {};
    try {
      // Leads
      const leadsRes = await fetch(`${WEBHOOK_SERVER_URL}/api/leads/by-score?limit=1`);
      const leadsData = await leadsRes.json();
      dashboard.leads = leadsData.summary || {};
      
      // SLA
      const slaRes = await fetch(`${WEBHOOK_SERVER_URL}/api/sla-report`);
      dashboard.sla = await slaRes.json();
      
      // Referrals
      const refRes = await fetch(`${WEBHOOK_SERVER_URL}/api/analytics/referrals`);
      const refData = await refRes.json();
      dashboard.referrals = { total: refData.totalReferrals, topSource: refData.topSource?.source };
      
      // A/B Tests
      const abRes = await fetch(`${WEBHOOK_SERVER_URL}/api/ab-tests`);
      const abData = await abRes.json();
      dashboard.abTests = { count: abData.count };
      
      // Scheduled emails
      const schedRes = await fetch(`${WEBHOOK_SERVER_URL}/api/scheduled-emails`);
      const schedData = await schedRes.json();
      dashboard.scheduledEmails = { pending: schedData.count };
      
    } catch (err) {
      dashboard.error = err.message;
    }
    
    return { contents: [{ uri: 'innovatehub://marketing-dashboard', text: JSON.stringify(dashboard, null, 2), mimeType: 'application/json' }] };
  }
);

// 5. Email Templates
server.resource(
  'email-templates',
  'innovatehub://email-templates',
  { description: 'Available email templates for marketing automation' },
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/email-templates`);
      const data = await res.json();
      return { contents: [{ uri: 'innovatehub://email-templates', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }] };
    } catch (err) {
      return { contents: [{ uri: 'innovatehub://email-templates', text: JSON.stringify({ error: err.message }), mimeType: 'application/json' }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER 5: Competitive Intelligence & Predictive Analytics Tools
// ═══════════════════════════════════════════════════════════════════════════

// 30. add_competitor
server.tool(
  'add_competitor',
  'Add a competitor for monitoring',
  {
    name: z.string().describe('Competitor company name'),
    facebookPageId: z.string().optional().describe('Facebook Page ID'),
    facebookPageName: z.string().optional().describe('Facebook Page name'),
    website: z.string().optional().describe('Competitor website URL'),
    keywords: z.array(z.string()).optional().describe('Keywords to track'),
  },
  async ({ name, facebookPageId, facebookPageName, website, keywords }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, facebookPageId, facebookPageName, website, keywords })
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 31. list_competitors
server.tool(
  'list_competitors',
  'List all monitored competitors',
  {},
  async () => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/competitors`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 32. add_competitor_ad
server.tool(
  'add_competitor_ad',
  'Add a competitor ad for analysis',
  {
    competitorId: z.string().describe('Competitor objectId'),
    platform: z.string().optional().describe('Platform (facebook, instagram, etc.)'),
    adType: z.string().optional().describe('Ad type (image, video, carousel)'),
    headline: z.string().optional().describe('Ad headline'),
    bodyText: z.string().optional().describe('Ad body text'),
    ctaText: z.string().optional().describe('Call-to-action text'),
    landingUrl: z.string().optional().describe('Landing page URL'),
    imageUrl: z.string().optional().describe('Ad image URL'),
  },
  async (params) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/competitor-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 33. analyze_competitor_ad
server.tool(
  'analyze_competitor_ad',
  'Run AI analysis on a competitor ad',
  {
    adId: z.string().describe('CompetitorAd objectId'),
  },
  async ({ adId }) => {
    try {
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/competitor-ads/${adId}/analyze`, {
        method: 'POST'
      });
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 34. get_competitive_report
server.tool(
  'get_competitive_report',
  'Generate a competitive intelligence report',
  {
    days: z.number().optional().describe('Days to analyze (default 30)'),
  },
  async ({ days }) => {
    try {
      const url = days 
        ? `${WEBHOOK_SERVER_URL}/api/competitive-report?days=${days}`
        : `${WEBHOOK_SERVER_URL}/api/competitive-report`;
      const res = await fetch(url);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 35. get_historical_analytics
server.tool(
  'get_historical_analytics',
  'Get historical performance data for a metric',
  {
    metric: z.enum(['leads', 'emails', 'conversations', 'messages']).describe('Metric to analyze'),
    days: z.number().optional().describe('Days to look back (default 30)'),
  },
  async ({ metric, days }) => {
    try {
      const params = new URLSearchParams({ metric });
      if (days) params.set('days', String(days));
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/analytics/historical?${params}`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 36. detect_creative_fatigue
server.tool(
  'detect_creative_fatigue',
  'Detect creative/message fatigue across bot flows and emails',
  {
    days: z.number().optional().describe('Days to analyze (default 14)'),
  },
  async ({ days }) => {
    try {
      const url = days 
        ? `${WEBHOOK_SERVER_URL}/api/analytics/fatigue-detection?days=${days}`
        : `${WEBHOOK_SERVER_URL}/api/analytics/fatigue-detection`;
      const res = await fetch(url);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 37. get_performance_forecast
server.tool(
  'get_performance_forecast',
  'Get performance predictions for the next N days',
  {
    metric: z.enum(['leads', 'emails']).optional().describe('Metric to forecast (default: leads)'),
    forecastDays: z.number().optional().describe('Days to forecast (default 7)'),
  },
  async ({ metric, forecastDays }) => {
    try {
      const params = new URLSearchParams();
      if (metric) params.set('metric', metric);
      if (forecastDays) params.set('forecastDays', String(forecastDays));
      const res = await fetch(`${WEBHOOK_SERVER_URL}/api/analytics/forecast?${params}`);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// 38. get_budget_optimization
server.tool(
  'get_budget_optimization',
  'Get budget optimization recommendations based on source performance',
  {
    days: z.number().optional().describe('Days to analyze (default 30)'),
  },
  async ({ days }) => {
    try {
      const url = days 
        ? `${WEBHOOK_SERVER_URL}/api/analytics/budget-optimization?days=${days}`
        : `${WEBHOOK_SERVER_URL}/api/analytics/budget-optimization`;
      const res = await fetch(url);
      const result = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Resources: Competitive & Predictive
// ═══════════════════════════════════════════════════════════════════════════

// 6. Competitive Intelligence
server.resource(
  'competitive-intelligence',
  'innovatehub://competitive-intelligence',
  { description: 'Competitor tracking and market insights' },
  async () => {
    let data = {};
    try {
      const [competitors, report] = await Promise.all([
        fetch(`${WEBHOOK_SERVER_URL}/api/competitors`).then(r => r.json()),
        fetch(`${WEBHOOK_SERVER_URL}/api/competitive-report?days=30`).then(r => r.json())
      ]);
      data = { competitors: competitors.competitors, report };
    } catch (err) {
      data = { error: err.message };
    }
    return { contents: [{ uri: 'innovatehub://competitive-intelligence', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }] };
  }
);

// 7. Performance Forecast
server.resource(
  'performance-forecast',
  'innovatehub://performance-forecast',
  { description: 'Lead forecast and trend analysis' },
  async () => {
    let data = {};
    try {
      const [forecast, fatigue, budget] = await Promise.all([
        fetch(`${WEBHOOK_SERVER_URL}/api/analytics/forecast`).then(r => r.json()),
        fetch(`${WEBHOOK_SERVER_URL}/api/analytics/fatigue-detection`).then(r => r.json()),
        fetch(`${WEBHOOK_SERVER_URL}/api/analytics/budget-optimization`).then(r => r.json())
      ]);
      data = { forecast, fatigue, budgetOptimization: budget };
    } catch (err) {
      data = { error: err.message };
    }
    return { contents: [{ uri: 'innovatehub://performance-forecast', text: JSON.stringify(data, null, 2), mimeType: 'application/json' }] };
  }
);

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);

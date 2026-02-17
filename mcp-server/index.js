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

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);

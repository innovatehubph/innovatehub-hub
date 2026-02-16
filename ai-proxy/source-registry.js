// Source Registry - scans dashboard src/ and extracts structure
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

const DASHBOARD_SRC = '/root/innovatehub-hub/dashboard/src';
const ALLOWED_EXT = new Set(['.tsx', '.ts', '.css', '.json']);

export function scanSourceTree() {
  const files = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist') continue;
        walk(full);
      } else if (ALLOWED_EXT.has(extname(entry))) {
        const rel = relative(DASHBOARD_SRC, full);
        files[rel] = readFileSync(full, 'utf-8');
      }
    }
  };
  walk(DASHBOARD_SRC);
  return files;
}

export function extractRoutes() {
  const appPath = join(DASHBOARD_SRC, 'App.tsx');
  if (!existsSync(appPath)) return [];
  const content = readFileSync(appPath, 'utf-8');
  const routes = [];
  const re = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;
  let m;
  while ((m = re.exec(content))) {
    routes.push({ path: m[1], component: m[2] });
  }
  return routes;
}

export function extractNavItems() {
  const layoutPath = join(DASHBOARD_SRC, 'components/Layout.tsx');
  if (!existsSync(layoutPath)) return [];
  const content = readFileSync(layoutPath, 'utf-8');
  const items = [];
  const re = /\{\s*path:\s*'([^']+)',\s*label:\s*'([^']+)',\s*icon:\s*(\w+)\s*\}/g;
  let m;
  while ((m = re.exec(content))) {
    items.push({ path: m[1], label: m[2], icon: m[3] });
  }
  return items;
}

export function extractComponents() {
  const compsDir = join(DASHBOARD_SRC, 'components');
  if (!existsSync(compsDir)) return [];
  return readdirSync(compsDir).filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''));
}

export function extractPages() {
  const pagesDir = join(DASHBOARD_SRC, 'pages');
  if (!existsSync(pagesDir)) return [];
  return readdirSync(pagesDir).filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''));
}

export function getFullContext() {
  return {
    files: scanSourceTree(),
    routes: extractRoutes(),
    navItems: extractNavItems(),
    components: extractComponents(),
    pages: extractPages(),
  };
}

// Deployer - writes files, patches routes/nav, builds, and deploys to Back4App
import { writeFileSync, readFileSync, mkdirSync, existsSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const DASHBOARD_DIR = '/root/innovatehub-hub/dashboard';
const SRC_DIR = join(DASHBOARD_DIR, 'src');
const B4A_DEPLOY_DIR = '/root/innovatehub-hub/b4a-deploy';

export function writeFiles(files) {
  const results = [];
  for (const file of files) {
    const fullPath = join(SRC_DIR, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content);
    results.push({ path: file.path, action: file.action || 'create', success: true });
  }
  return results;
}

export function patchAppRoutes(newRoute) {
  // newRoute: { path, component, importPath }
  const appPath = join(SRC_DIR, 'App.tsx');
  let content = readFileSync(appPath, 'utf-8');

  // Add import if not present
  const importLine = `import ${newRoute.component} from '${newRoute.importPath}'`;
  if (!content.includes(importLine)) {
    // Insert before the 'export default' line
    content = content.replace(
      /^(export default function App)/m,
      `${importLine}\n\n$1`
    );
  }

  // Add Route if not present
  const routeTag = `path="${newRoute.path}"`;
  if (!content.includes(routeTag)) {
    // Insert before the closing </Routes>
    const routeLine = `        <Route path="${newRoute.path}" element={<${newRoute.component} businessId={activeBusiness} />} />`;
    content = content.replace('      </Routes>', `${routeLine}\n      </Routes>`);
  }

  writeFileSync(appPath, content);
}

export function patchLayoutNav(newNavItem) {
  // newNavItem: { path, label, icon }
  const layoutPath = join(SRC_DIR, 'components/Layout.tsx');
  let content = readFileSync(layoutPath, 'utf-8');

  // Check if icon is already imported
  if (!content.includes(newNavItem.icon)) {
    // Add to the lucide-react import
    content = content.replace(
      /} from 'lucide-react'/,
      `, ${newNavItem.icon}} from 'lucide-react'`
    );
  }

  // Add nav item if not present
  const navEntry = `{ path: '${newNavItem.path}', label: '${newNavItem.label}', icon: ${newNavItem.icon} }`;
  if (!content.includes(`path: '${newNavItem.path}'`)) {
    // Insert before the last item (Settings)
    content = content.replace(
      /(\{ path: '\/settings',)/,
      `${navEntry},\n  $1`
    );
  }

  writeFileSync(layoutPath, content);
}

export function buildDashboard() {
  try {
    const output = execSync('npm run build', {
      cwd: DASHBOARD_DIR,
      timeout: 120000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stderr || err.stdout || err.message };
  }
}

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath));
    }
  }
}

export function deployToBack4App() {
  try {
    // Copy dist to b4a-deploy/public
    const distDir = join(DASHBOARD_DIR, 'dist');
    const publicDir = join(B4A_DEPLOY_DIR, 'public');

    // Remove old public
    execSync(`rm -rf "${publicDir}"`, { encoding: 'utf-8' });

    // Copy new dist
    copyDirSync(distDir, publicDir);

    // Deploy via b4a CLI
    const output = execSync('b4a deploy -f', {
      cwd: B4A_DEPLOY_DIR,
      timeout: 120000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stderr || err.stdout || err.message };
  }
}

export function createSchema(className, fields) {
  const APP_ID = 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN';
  const MASTER_KEY = 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h';

  const schemaFields = {};
  for (const [name, type] of Object.entries(fields)) {
    if (type === 'String') schemaFields[name] = { type: 'String' };
    else if (type === 'Number') schemaFields[name] = { type: 'Number' };
    else if (type === 'Boolean') schemaFields[name] = { type: 'Boolean' };
    else if (type === 'Date') schemaFields[name] = { type: 'Date' };
    else if (type === 'Array') schemaFields[name] = { type: 'Array' };
    else if (type === 'Object') schemaFields[name] = { type: 'Object' };
    else if (type === 'File') schemaFields[name] = { type: 'File' };
    else if (type === 'GeoPoint') schemaFields[name] = { type: 'GeoPoint' };
    else if (type.startsWith('Pointer<')) {
      const target = type.match(/Pointer<(\w+)>/)?.[1] || '_User';
      schemaFields[name] = { type: 'Pointer', targetClass: target };
    } else if (type.startsWith('Relation<')) {
      const target = type.match(/Relation<(\w+)>/)?.[1] || '_User';
      schemaFields[name] = { type: 'Relation', targetClass: target };
    } else {
      schemaFields[name] = { type: 'String' };
    }
  }

  try {
    const output = execSync(`curl -s -X POST "https://parseapi.back4app.com/schemas/${className}" -H "X-Parse-Application-Id: ${APP_ID}" -H "X-Parse-Master-Key: ${MASTER_KEY}" -H "Content-Type: application/json" -d '${JSON.stringify({ className, fields: schemaFields })}'`, {
      encoding: 'utf-8',
      timeout: 15000,
    });
    return { success: true, result: JSON.parse(output) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

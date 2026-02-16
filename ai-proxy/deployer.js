// Deployer - staging-first pipeline: branch → write → build → QA → merge → deploy
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const PROJECT_DIR = '/root/innovatehub-hub';
const DASHBOARD_DIR = join(PROJECT_DIR, 'dashboard');
const SRC_DIR = join(DASHBOARD_DIR, 'src');
const B4A_DEPLOY_DIR = join(PROJECT_DIR, 'b4a-deploy');

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: PROJECT_DIR, encoding: 'utf-8', timeout: 30000 }).trim();
}

// ─── Staging Branch Management ───

export function createStagingBranch(featureName) {
  const slug = featureName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const branch = `staging/${slug}-${Date.now().toString(36)}`;

  // Ensure we're on main and clean
  try { git('stash'); } catch {}
  git('checkout main');
  git(`checkout -b ${branch}`);

  return branch;
}

export function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD');
}

export function switchToMain() {
  git('checkout main');
}

export function deleteBranch(branch) {
  try {
    git('checkout main');
    git(`branch -D ${branch}`);
  } catch {}
}

// ─── File Writing (staging) ───

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
  const appPath = join(SRC_DIR, 'App.tsx');
  let content = readFileSync(appPath, 'utf-8');

  const importLine = `import ${newRoute.component} from '${newRoute.importPath}'`;
  if (!content.includes(importLine)) {
    content = content.replace(/^(export default function App)/m, `${importLine}\n\n$1`);
  }

  const routeTag = `path="${newRoute.path}"`;
  if (!content.includes(routeTag)) {
    const routeLine = `        <Route path="${newRoute.path}" element={<${newRoute.component} businessId={activeBusiness} />} />`;
    content = content.replace('      </Routes>', `${routeLine}\n      </Routes>`);
  }

  writeFileSync(appPath, content);
}

export function patchLayoutNav(newNavItem) {
  const layoutPath = join(SRC_DIR, 'components/Layout.tsx');
  let content = readFileSync(layoutPath, 'utf-8');

  if (!content.includes(newNavItem.icon)) {
    content = content.replace(/} from 'lucide-react'/, `, ${newNavItem.icon}} from 'lucide-react'`);
  }

  const navEntry = `{ path: '${newNavItem.path}', label: '${newNavItem.label}', icon: ${newNavItem.icon} }`;
  if (!content.includes(`path: '${newNavItem.path}'`)) {
    content = content.replace(/(\{ path: '\/settings',)/, `${navEntry},\n  $1`);
  }

  writeFileSync(layoutPath, content);
}

// ─── Build ───

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

// ─── Git Commit (staging) ───

export function commitStaging(message) {
  try {
    git('add -A');
    const output = git(`commit -m "${message.replace(/"/g, '\\"')}"`);
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ─── Merge to Main & Deploy ───

export function mergeToMainAndDeploy(branch) {
  try {
    // Switch to main
    git('checkout main');

    // Merge the staging branch
    const mergeOutput = git(`merge ${branch} --no-edit`);

    // Build production
    const buildResult = buildDashboard();
    if (!buildResult.success) {
      // Revert merge if build fails
      git('reset --hard HEAD~1');
      return { success: false, step: 'build', output: buildResult.output };
    }

    // Deploy
    const deployResult = deployToBack4App();
    if (!deployResult.success) {
      return { success: false, step: 'deploy', output: deployResult.output };
    }

    // Push to GitHub
    try {
      git('push origin main');
    } catch (pushErr) {
      // Non-critical - deploy succeeded
    }

    // Clean up staging branch
    try { git(`branch -d ${branch}`); } catch {}

    return { success: true, mergeOutput, deployOutput: deployResult.output };
  } catch (err) {
    // Recover - go back to main
    try { git('checkout main'); } catch {}
    return { success: false, step: 'merge', output: err.message };
  }
}

// ─── Rollback ───

export function rollbackStaging(branch) {
  try {
    // Discard staging changes, go back to main
    git('checkout main');
    git(`branch -D ${branch}`);
    // Rebuild main
    buildDashboard();
    return { success: true };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ─── Deploy to Back4App ───

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
    const distDir = join(DASHBOARD_DIR, 'dist');
    const publicDir = join(B4A_DEPLOY_DIR, 'public');
    execSync(`rm -rf "${publicDir}"`, { encoding: 'utf-8' });
    copyDirSync(distDir, publicDir);
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

// ─── Schema Management ───

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

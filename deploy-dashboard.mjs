// Deploy script: reads all files from dist/, uploads each to Back4App hosted_files, then deploys
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import https from 'https';
import { createHash } from 'crypto';

const ACCOUNT_KEY = 'VoHILUGjOQNuEB3aiX37bml9OU3ojtJp4yCR5lqC';
const APP_ID = 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN';
const MASTER_KEY = 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h';
const DIST_DIR = '/root/innovatehub-hub/dashboard/dist';

function getAllFiles(dir, base = dir) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results = results.concat(getAllFiles(fullPath, base));
    } else {
      results.push({ fullPath, relativePath: relative(base, fullPath) });
    }
  }
  return results;
}

function uploadFile(relativePath, base64Content) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ 
      name: relativePath, 
      content: base64Content 
    });
    const req = https.request({
      hostname: 'parsecli.back4app.com',
      path: '/hosted_files',
      method: 'POST',
      headers: {
        'X-Parse-Account-Key': ACCOUNT_KEY,
        'X-Parse-Application-Id': APP_ID,
        'X-Parse-Master-Key': MASTER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Upload ${relativePath} failed (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function deploy(checksums) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      checksums: { public: checksums },
      userFiles: { public: Object.keys(checksums) },
    });
    const req = https.request({
      hostname: 'parsecli.back4app.com',
      path: '/deploy',
      method: 'POST',
      headers: {
        'X-Parse-Account-Key': ACCOUNT_KEY,
        'X-Parse-Application-Id': APP_ID,
        'X-Parse-Master-Key': MASTER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const files = getAllFiles(DIST_DIR);
  console.log(`Found ${files.length} files to deploy`);
  
  const checksums = {};
  
  for (const file of files) {
    const content = readFileSync(file.fullPath);
    const base64 = content.toString('base64');
    const checksum = createHash('md5').update(content).digest('hex');
    checksums[file.relativePath] = checksum;
    
    console.log(`Uploading: ${file.relativePath} (${content.length} bytes)`);
    try {
      await uploadFile(file.relativePath, base64);
      console.log('  -> Uploaded successfully');
    } catch (err) {
      console.error(`  -> Failed: ${err.message}`);
    }
  }
  
  console.log('\nDeploying with checksums...');
  console.log('Files:', Object.keys(checksums).join(', '));
  const result = await deploy(checksums);
  console.log('Deploy result:', result.status, result.body);
}

main().catch(console.error);

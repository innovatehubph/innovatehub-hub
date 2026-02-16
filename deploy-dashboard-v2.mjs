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

function makeRequest(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname: 'parsecli.back4app.com',
      path: path,
      method: 'POST',
      headers: {
        'X-Parse-Account-Key': ACCOUNT_KEY,
        'X-Parse-Application-Id': APP_ID,
        'X-Parse-Master-Key': MASTER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const files = getAllFiles(DIST_DIR);
  console.log(`Found ${files.length} files to deploy\n`);
  
  const checksums = {};
  
  for (const file of files) {
    const content = readFileSync(file.fullPath);
    const base64 = content.toString('base64');
    const checksum = createHash('md5').update(content).digest('hex');
    checksums[file.relativePath] = checksum;
    
    console.log(`Uploading: ${file.relativePath} (${content.length} bytes)`);
    try {
      const result = await makeRequest('/hosted_files', { 
        name: file.relativePath, 
        content: base64 
      });
      if (result.status >= 200 && result.status < 300) {
        console.log('  -> Uploaded successfully');
      } else {
        console.log(`  -> Upload response: ${result.status} ${result.body}`);
      }
    } catch (err) {
      console.error(`  -> Failed: ${err.message}`);
    }
  }
  
  console.log('\n--- Attempting deploy ---');
  console.log('Checksums:', JSON.stringify(checksums, null, 2));
  
  // Try format 1: checksums at top level with userFiles
  const deployBody1 = {
    checksums: checksums,
    userFiles: Object.keys(checksums),
  };
  console.log('\nAttempt 1 - flat checksums + flat userFiles:');
  const r1 = await makeRequest('/deploy', deployBody1);
  console.log(`  Status: ${r1.status}`);
  console.log(`  Body: ${r1.body}`);
  
  if (r1.status >= 200 && r1.status < 300) {
    console.log('\nDeploy successful!');
    return;
  }
  
  // Try format 2: nested under "public" 
  const deployBody2 = {
    checksums: { public: checksums },
    userFiles: { public: Object.keys(checksums) },
  };
  console.log('\nAttempt 2 - nested under public:');
  const r2 = await makeRequest('/deploy', deployBody2);
  console.log(`  Status: ${r2.status}`);
  console.log(`  Body: ${r2.body}`);
  
  if (r2.status >= 200 && r2.status < 300) {
    console.log('\nDeploy successful!');
    return;
  }

  // Try format 3: just checksums, no userFiles
  const deployBody3 = {
    checksums: checksums,
  };
  console.log('\nAttempt 3 - just checksums:');
  const r3 = await makeRequest('/deploy', deployBody3);
  console.log(`  Status: ${r3.status}`);
  console.log(`  Body: ${r3.body}`);

  if (r3.status >= 200 && r3.status < 300) {
    console.log('\nDeploy successful!');
    return;
  }

  // Try format 4: nested checksums, no userFiles
  const deployBody4 = {
    checksums: { public: checksums },
  };
  console.log('\nAttempt 4 - nested checksums, no userFiles:');
  const r4 = await makeRequest('/deploy', deployBody4);
  console.log(`  Status: ${r4.status}`);
  console.log(`  Body: ${r4.body}`);
}

main().catch(console.error);

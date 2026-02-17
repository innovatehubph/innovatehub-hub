// Lightweight static server for the InnovateHub Dashboard
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dashboard', 'dist');
const PORT = 3457;

if (!existsSync(DIST_DIR)) {
  console.error('[Dashboard] dist/ not found. Run: cd dashboard && npm run build');
  process.exit(1);
}

const app = express();

// Serve static files from dist/
app.use(express.static(DIST_DIR));

// SPA fallback — all routes serve index.html (HashRouter handles client-side routing)
app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dashboard] InnovateHub Dashboard running on http://0.0.0.0:${PORT}`);
});

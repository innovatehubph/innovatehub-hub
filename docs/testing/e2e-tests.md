# E2E Test Suite

Automated browser testing using Puppeteer that simulates real human QA testing with screenshot capture at every step.

## Overview

The test suite covers 16 test categories with 53 individual tests:

| Suite | Tests | Description |
|-------|-------|-------------|
| Initial Load | 4 | Page loads, renders content, no errors |
| Navigation | 14 | All sidebar routes render correctly |
| Sidebar Collapse | 2 | Sidebar expand/collapse functionality |
| Business Selector | 2 | Dropdown selection works |
| Dashboard Home | 2 | Stat cards and loading states |
| AI Workshop | 4 | Templates, input, pipeline display |
| Chat Widget | 1 | Widget opens on click |
| Responsive Design | 4 | Desktop, laptop, tablet, mobile |
| Mobile Navigation | 1 | Hamburger menu works |
| API Endpoints | 2 | Health and status checks |
| Performance | 4 | Load times and transfer size |
| Data Tables | 6 | Products, orders, messenger, etc. |
| Settings | 1 | Settings page renders |
| Facebook Setup | 1 | Setup page renders |
| Error Handling | 1 | 404 route handling |
| Theme Consistency | 3 | Dark theme and active nav |

## Running Tests

```bash
# Run against local server
node tests/e2e-test-suite.mjs

# Run against Back4App hosted version
TEST_URL=https://preview-innovatehubbusines.b4a.app node tests/e2e-test-suite.mjs
```

## Screenshots

Every test step captures a screenshot saved to:
- `tests/screenshots/` — Test artifacts
- `docs/assets/screenshots/` — Documentation assets

## Test Results

Results are saved as JSON to `tests/results/test-results.json` for programmatic analysis.

## Architecture

```
tests/
├── e2e-test-suite.mjs    # Main test runner
├── screenshots/           # Captured screenshots
└── results/
    └── test-results.json  # Machine-readable results
```

The test suite uses:
- **Puppeteer Core** — Headless Chromium browser automation
- **System Chromium** — `/usr/bin/chromium-browser`
- **Custom assertions** — DOM content checks, element queries
- **Screenshot capture** — Full page + viewport screenshots

# Configuration

## Parse SDK Configuration

Edit `dashboard/src/config/parse.ts`:

```typescript
import ParseModule from 'parse';
const Parse = (ParseModule as any).default || ParseModule;

Parse.initialize(
  'YOUR_APP_ID',           // Application ID
  'YOUR_JS_KEY'            // JavaScript Key
);
Parse.masterKey = 'YOUR_MASTER_KEY';  // Master Key (server-side only)
Parse.serverURL = 'https://parseapi.back4app.com';
```

!!! warning "Security"
    Never expose the Master Key in client-side code in production. Use Cloud Code for operations that require elevated privileges.

## Business Configuration

The platform supports multiple businesses. Configure them in `parse.ts`:

```typescript
export const BUSINESSES = {
  platapay: { id: 'GTHxktOij6', name: 'PlataPay', slug: 'platapay' },
  innovatehub: { id: 'g3EFKft6Wj', name: 'InnovateHub', slug: 'innovatehub' },
} as const;
```

## Vite Build Configuration

Key settings in `dashboard/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { events: 'events' },  // Browser polyfill for Parse SDK
  },
  optimizeDeps: {
    include: ['parse', 'events'],
  },
  build: {
    commonjsOptions: {
      include: [/parse/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
});
```

!!! note "Parse SDK + Vite"
    The `events` npm package is required as a browser polyfill. Without it, Vite externalizes Node.js's `events` module, breaking Parse SDK's EventEmitter.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Dashboard server port | 3457 |
| `AI_PROXY_PORT` | AI Proxy server port | 3456 |
| `ANTHROPIC_API_KEY` | Claude AI API key | Required for AI Workshop |

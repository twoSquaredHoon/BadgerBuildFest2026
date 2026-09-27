import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { readLivePrices } from '../client/live-prices.mjs';

// Allow the public tunnel address (Cloudflare quick tunnel) to reach the app.
const allowedHosts = ['.trycloudflare.com'];

/**
 * The pet owner side (PawPlan, apps/client) is a static site. Serve it at /owner/ from this
 * same server so both sides open from one link and one QR code, and copy it into the build.
 */
const clientDir = fileURLToPath(new URL('../client', import.meta.url));

function loadClientEnv() {
  const path = join(clientDir, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

loadClientEnv();

let priceCache: Awaited<ReturnType<typeof readLivePrices>> | null = null;
let priceCachedAt = 0;

const serveLivePrices: Connect.NextHandleFunction = (req, res, next) => {
  const path = (req.url ?? '').split('?')[0];
  if (path !== '/api/prices' || req.method !== 'POST') return next();
  void (async () => {
    try {
      if (!priceCache || Date.now() - priceCachedAt > 15 * 60 * 1000) {
        priceCache = await readLivePrices();
        priceCachedAt = Date.now();
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(priceCache));
    } catch {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, records: [], note: 'Clinic websites could not be read just now, so no price is shown.', pagesRead: 0, modelUsed: false }));
    }
  })();
};
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const serveOwnerSide: Connect.NextHandleFunction = (req, res, next) => {
  const path = (req.url ?? '').split('?')[0];
  if (path === '/owner') {
    res.statusCode = 301;
    res.setHeader('Location', '/owner/');
    res.end();
    return;
  }
  if (!path.startsWith('/owner/')) return next();
  const relative = decodeURIComponent(path.slice('/owner/'.length));
  const name = relative.split('/').filter(Boolean).pop() ?? '';
  const file = normalize(join(clientDir, relative || 'index.html'));
  if (name.startsWith('.')) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  if (!file.startsWith(clientDir) || !existsSync(file) || statSync(file).isDirectory()) return next();
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
};

function ownerSide(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pawplan-owner-side',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(serveLivePrices);
      server.middlewares.use(serveOwnerSide);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveLivePrices);
      server.middlewares.use(serveOwnerSide);
    },
    closeBundle() {
      cpSync(clientDir, join(outDir, 'owner'), {
        recursive: true,
        filter: (src) => {
          const name = src.split(/[/\\]/).pop() ?? '';
          return !name.startsWith('.') && !/(\.test\.js|README\.md|server\.mjs)$/.test(name);
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ownerSide()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  server: { host: true, port: 8081, allowedHosts },
  preview: { host: true, port: 8081, allowedHosts },
});

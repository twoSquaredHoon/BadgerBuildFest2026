import { cpSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';

// Allow the public tunnel address (Cloudflare quick tunnel) to reach the app.
const allowedHosts = ['.trycloudflare.com'];

/**
 * The pet owner side (PawPlan, apps/client) is a static site. Serve it at /owner/ from this
 * same server so both sides open from one link and one QR code, and copy it into the build.
 */
const clientDir = fileURLToPath(new URL('../client', import.meta.url));
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

/**
 * The owner side reads the Supabase URL + publishable key from /owner/config.js, generated here
 * from apps/vet/.env so both sides share one setting. (Only public values: never the secret key.)
 */
let ownerConfigJs = 'export const SUPABASE_URL = "";\nexport const SUPABASE_KEY = "";\n';

const serveOwnerSide: Connect.NextHandleFunction = (req, res, next) => {
  const path = (req.url ?? '').split('?')[0];
  if (path === '/owner/config.js') {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(ownerConfigJs);
    return;
  }
  if (path === '/owner') {
    res.statusCode = 301;
    res.setHeader('Location', '/owner/');
    res.end();
    return;
  }
  if (!path.startsWith('/owner/')) return next();
  const file = normalize(join(clientDir, decodeURIComponent(path.slice('/owner/'.length)) || 'index.html'));
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
      server.middlewares.use(serveOwnerSide);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveOwnerSide);
    },
    closeBundle() {
      cpSync(clientDir, join(outDir, 'owner'), { recursive: true, filter: (src) => !/(\.test\.js|README\.md)$/.test(src) });
      writeFileSync(join(outDir, 'owner', 'config.js'), ownerConfigJs);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_');
  ownerConfigJs =
    `export const SUPABASE_URL = ${JSON.stringify(env.VITE_SUPABASE_URL ?? '')};\n` +
    `export const SUPABASE_KEY = ${JSON.stringify(env.VITE_SUPABASE_KEY ?? '')};\n`;

  return {
    plugins: [react(), ownerSide()],
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    server: { host: true, port: 8081, allowedHosts },
    preview: { host: true, port: 8081, allowedHosts },
  };
});

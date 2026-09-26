import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Allow the public tunnel address (Cloudflare quick tunnel) to reach the app.
const allowedHosts = ['.trycloudflare.com'];

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  server: { host: true, port: 8081, allowedHosts },
  preview: { host: true, port: 8081, allowedHosts },
});

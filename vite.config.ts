import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// base './' so the build works from any static host subpath (GitHub Pages, Netlify, ...)
// dev runs on https with a locally trusted cert (mkcert), and host: true opens it to phones on the same Wi-Fi
export default defineConfig({ base: './', plugins: [react(), mkcert()], server: { host: true } });

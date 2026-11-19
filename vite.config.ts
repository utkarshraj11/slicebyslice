import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from any static host subpath (GitHub Pages, Netlify, ...)
export default defineConfig({ base: './', plugins: [react()] });

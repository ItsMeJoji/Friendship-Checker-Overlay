import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Set the base path to match the GitHub repository name
  base: '/Friendship-Checker-Overlay/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        help: resolve(__dirname, 'help/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

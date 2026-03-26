import { defineConfig } from 'vite';

export default defineConfig({
  // Set the base path to match the GitHub repository name
  base: '/Friendship-Checker-Overlay/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});

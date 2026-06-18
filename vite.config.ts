import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      phaser: 'phaser/dist/phaser.esm.js',
    },
  },
  optimizeDeps: {
    exclude: ['phaser'],
  },
});

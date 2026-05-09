import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Pollinators/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});

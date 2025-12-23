import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['verbose'],
    sequence: {
      shuffle: false,
    },
    fileParallelism: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/e2e/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})

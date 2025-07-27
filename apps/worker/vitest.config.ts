import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml', environment: 'dev' },
        miniflare: {
          // Simplified configuration - let wrangler.toml handle most bindings
          // Just override what's needed for testing
          hyperdriveBindings: {
            DATABASE: 'postgres://postgres:postgres@localhost:5432/test',
          },
        },
      },
    },
  },
})

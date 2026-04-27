import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@novelforge/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@novelforge/prompts': path.resolve(__dirname, '../../packages/prompts/src'),
    },
  },
  test: {
    root: __dirname,
    include: ['tests/unit/**/*.test.ts'],
  },
})

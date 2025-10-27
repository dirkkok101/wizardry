import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // 2-3x faster than jsdom
    isolate: true, // Required for proper test isolation
    pool: 'threads', // Faster than default 'forks' pool
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.worktrees/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  },
})

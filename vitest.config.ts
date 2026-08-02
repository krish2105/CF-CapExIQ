import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    /**
     * `node:sqlite` is newer than this Vite's list of Node builtins, so the
     * resolver strips the prefix and then fails looking for a package called
     * "sqlite". Marking it external hands the import straight to Node, which
     * does have it.
     */
    server: {
      deps: {
        external: [/^node:sqlite$/],
      },
    },
  },
});

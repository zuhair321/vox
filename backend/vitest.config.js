/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Tests run against a REAL PostgreSQL database (DATABASE_URL). They create and
// clean up their own rows, so they never touch production data beyond the
// schema. Use a throwaway database / schema for CI.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Never run against an obvious production DB.
    // (Set VOX_ALLOW_TESTS_AGAINST_THIS_DB=1 to override in CI with a dedicated DB.)
    dangerouslyIgnoreUnhandledErrors: false,
  },
});

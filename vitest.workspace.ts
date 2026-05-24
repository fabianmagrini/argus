import { defineWorkspace } from "vitest/config";

/**
 * Vitest workspace config — registers every package's test suite.
 * Run all tests: `pnpm test`
 * Watch mode:   `pnpm test:watch`
 */
export default defineWorkspace([
  "lib/metrics/vitest.config.ts",
  "apps/api-server/vitest.config.ts",
  "apps/dashboard/vitest.config.ts",
]);

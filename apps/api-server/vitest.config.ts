import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api-server",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10_000,
    // @argus/db checks DATABASE_URL at import time; set a dummy value so the
    // module loads without connecting — tests inject a mock db anyway.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test_argus",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
});

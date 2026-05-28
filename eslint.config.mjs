// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/src/generated/**",
      "**/*.tsbuildinfo",
      "pnpm-lock.yaml",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Warn rather than error so existing `as any` casts in mock helpers don't block CI.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow _-prefixed variables to be unused (common in destructuring).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);

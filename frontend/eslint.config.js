import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  // Base JS rules (non-TS files only)
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...js.configs.recommended,
  },
  // Playwright config + E2E tests (Node + browser globals)
  {
    files: ["playwright.config.ts", "e2e/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript handles undefined-variable checks; no-undef gives false positives on TS
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // TypeScript + React source files
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // TypeScript handles undefined-variable checks; no-undef gives false positives on TS
      "no-undef": "off",
      // TypeScript recommended
      ...tsPlugin.configs.recommended.rules,
      // React Hooks
      ...reactHooks.configs.recommended.rules,
      // React Refresh (Vite HMR)
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Project-specific overrides
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

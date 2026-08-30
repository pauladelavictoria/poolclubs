import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // routeTree.gen.ts is written by the TanStack Start plugin on every build.
  {
    ignores: ["dist", ".output", ".nitro", ".tanstack", "src/routeTree.gen.ts"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // A route file exports both its `Route` and the component it renders — that
    // is the file-based routing convention, not an accident.
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Test helpers re-export testing-library's own named exports alongside a
    // wrapped `render` — not a component file react-refresh needs to guard.
    files: ["src/test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
);

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".wrangler/**", "coverage/**", "playwright-report/**", "worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ["worker/**/*.ts", "shared/**/*.ts", "tests/**/*.ts"],
    languageOptions: { globals: { ...globals.worker, ...globals.node } },
  },
  {
    files: ["*.config.{js,ts}", "scripts/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);

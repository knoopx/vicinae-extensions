import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import typescript from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser,
      globals: { ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "@typescript-eslint": typescript,
    },
    rules: {
      indent: ["error", 2],
      "no-unused-vars": "warn",
      "semi": ["error", "never"],
      "quotes": ["error", "double"],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off"
    },
  },
]

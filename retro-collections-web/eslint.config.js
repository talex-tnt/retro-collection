import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),

  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,

      // disables ALL formatting rules that conflict with Prettier
      prettierConfig,
    ],

    plugins: {
      prettier,
    },

    rules: {
      // Prettier is the single source of truth for formatting
      'prettier/prettier': 'error',

      // 🔥 IMPORTANT: prevent ESLint from touching semicolons
      '@typescript-eslint/semi': 'off',

      semi: 'off',
    },

    languageOptions: {
      globals: globals.browser,
    },
  },
]);

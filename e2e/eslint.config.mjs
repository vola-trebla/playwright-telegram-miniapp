import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report'],
  },
  ...tseslint.configs.recommended,
  {
    // Type-aware linting: the rules below need the TS program, so point ESLint at the tsconfig.
    // Scoped to .ts only — the .mjs config file isn't part of the TS program.
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Keep type-only imports separate from value imports for a clearer module graph.
      '@typescript-eslint/consistent-type-imports': 'error',

      // No silent `any` — it disables every other type guarantee the suite relies on.
      '@typescript-eslint/no-explicit-any': 'error',

      // The #1 silent e2e bug: a forgotten `await` on an assertion/action. The promise
      // never settles inside the test, so a real failure slips through green. Type-aware.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
  },
);

// ESLint Flat Config (ESLint 9+)
export default [
  {
    ignores: ['node_modules/**', 'src/utils/fixpasswords.mjs'],
  },
  {
    rules: {
      // Warn on console usage — use structured logger in production
      'no-console': 'warn',
      // Error on declared-but-unused variables (catches dead code)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Prevent accidental use of == instead of ===
      eqeqeq: ['error', 'always'],
      // Disallow var — use let or const
      'no-var': 'error',
      // Prefer const where variable is never reassigned
      'prefer-const': 'warn',
      // Catch async functions that could return rejected promises without try/catch
      'no-async-promise-executor': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];

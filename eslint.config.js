// ESLint flat config — regole non negoziabili di AGENTS.md applicate in modo automatico.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Selettori vietati ovunque (sicurezza). */
const securitySyntax = [
  {
    // S-01: mai SQL grezzo con input esterno (docs/12 §5). Eccezioni solo in packages/db/migrations (file .sql).
    selector: "CallExpression[callee.property.name='raw'][callee.object.name='sql']",
    message: 'sql.raw() è vietato (S-01): usa il tag sql`` parametrizzato o il query builder.',
  },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'dangerouslySetInnerHTML è vietato (XSS): usa Markdown sanificato (docs/12 §5.3).',
  },
  {
    // W-01: nessun test esclusivo o saltato su main.
    selector: 'MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(only|skip|todo)$/]',
    message: 'Test .only/.skip/.todo non ammessi (CONSTRAINTS W-01).',
  },
];

/** Nel dominio il tempo passa dalla porta Clock (AGENTS regola 7). */
const domainTimeSyntax = [
  {
    selector: "NewExpression[callee.name='Date']",
    message: 'Nel dominio usa la porta Clock, non new Date().',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Nel dominio usa la porta Clock, non Date.now().',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'brand/**',
      '.claude/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': ['error', ...securitySyntax],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...securitySyntax, ...domainTimeSyntax] },
  },
  {
    // nei test le asserzioni non-null sono accettabili: un undefined fa fallire il test, che è ciò che vogliamo
    files: ['**/test/**/*.ts', '**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);

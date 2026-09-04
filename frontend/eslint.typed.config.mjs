// Tier de lint com tipos, deliberadamente FORA de eslint.config.mjs. Ligar
// projectService faz o ESLint montar o programa TypeScript inteiro, o que num
// codebase grande e lento o bastante para quebrar pre-commit hook e pesado o
// bastante para estourar heap em runner pequeno de CI.
//
// Dois configs e dois scripts (`lint` e `lint:types`), em vez de um config que
// ramifica em process.env.CI: a ramificacao faz local e CI divergirem em
// silencio para o mesmo codigo.
import defaultConfig from './eslint.config.mjs';

export default [
  ...defaultConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Todas comecam em "warn". Nenhuma tem contagem conhecida de violacao
      // neste codebase, entao nenhuma quebra build sem ser medida antes.
      // Promover para "error" por regra, quando a contagem chegar a zero.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/only-throw-error': 'warn',
      '@typescript-eslint/return-await': ['warn', 'in-try-catch'],
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/require-await': 'warn',
    },
  },
];

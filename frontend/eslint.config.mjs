// Tier rapido do lint do frontend. Nada aqui usa type information, o que
// mantem a execucao rapida o suficiente para pre-commit. As regras que
// precisam do type checker vivem em eslint.typed.config.mjs (script proprio).
//
// import-x NAO foi instalado: as fronteiras de camada que este projeto tem
// hoje (componente nao fala com axios/api direto) ja sao cobertas por
// quality/no-direct-data-access, e adicionar 2 dependencias para uma
// fronteira nao verificada contraria technology.md 4.4.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import quality from './eslint-rules/index.cjs';

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      // js.configs.recommended liga no-undef, que nao sabe nada do runtime.
      // Sem isso, cada window/document viraria variavel nao definida.
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,

  {
    files: ['src/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    plugins: { quality },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Orcamento de tamanho e complexidade: tudo em "warn" de proposito.
      // Sao conversa sobre fatoracao, nao gate. Promover para "error" quando
      // a contagem de uma regra chegar a zero.
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 20],
      'max-params': ['warn', 4],
      'max-lines-per-function': [
        'warn',
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['warn', 3],
      // Sem baseline: nenhum arquivo do frontend acima do teto.
      'quality/max-lines': ['error', { max: 350 }],
      // Baseline: 4 violacoes (useSocket.ts x3, prototypes/WorldMapPage.tsx).
      // Volta para "error" quando a contagem chegar a zero.
      'quality/no-direct-console': [
        'warn',
        { logger: 'o helper de log do projeto' },
      ],
      // Fronteira real (frontend.md 3.1): componente/pagina nunca importa
      // axios nem a instancia api direto; passa por services/ via hooks.
      'quality/no-direct-data-access': [
        'error',
        {
          modules: ['axios', '@/services/api', '../services/api'],
          bindings: ['api', 'default'],
          layers: ['/src/components/', '/src/pages/', '/src/app/', '/src/auth/'],
          extensions: ['.tsx'],
        },
      ],
    },
  },
  {
    // Mesmo orcamento de tamanho para testes, em "warn". Depois do bloco de
    // "error" de proposito: para um arquivo casado pelos dois, flat config
    // aplica o ultimo bloco, entao um "warn" antes seria sobrescrito.
    files: [
      '**/*.test.{ts,tsx}',
      '**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}',
    ],
    plugins: { quality },
    rules: {
      'quality/max-lines': ['warn', { max: 350, includeTests: true }],
      'max-statements': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
    },
  },
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'public/**',
    // As regras sao CommonJS de proposito (ESLint carrega sem build).
    'eslint-rules/**',
    // Script Node one-off de tooling (checagem de assets no prebuild).
    'scripts/**',
    '**/*.tsbuildinfo',
    'package-lock.json',
  ]),
]);

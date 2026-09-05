// Backend NestJS. A base (recommendedTypeChecked + prettier) e a que o time
// ja usava; os blocos "quality/*" no fim sao os quality gates de tamanho,
// console e fronteira de acesso a dados.
//
// Este projeto ja lintava com type information no tier rapido (projectService),
// entao NAO existe eslint.typed.config.mjs aqui: o lint do backend ja e o tier
// com tipos. Nao ligar esse config em pre-commit hook.
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import quality from './eslint-rules/index.cjs';

export default tseslint.config(
    {
        ignores: [
            'eslint.config.mjs',
            // As regras sao CommonJS de proposito (ESLint carrega sem build).
            // Ficam fora do programa TypeScript, por isso nao entram no lint.
            'eslint-rules/**',
            // Scripts Node one-off de tooling (aplicar SQL, publicar arte no S3).
            // Nao fazem parte da aplicacao que este config policia.
            'scripts/**',
            'dist/**',
            'coverage/**',
            'node_modules/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    {
        files: ['src/**/*.ts'],
        plugins: { quality },
        rules: {
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-var': 'error',
            'prefer-const': 'error',
            // Orcamento de tamanho e complexidade: tudo em "warn" de proposito.
            // Sao conversa sobre fatoracao, nao gate. Promover para "error"
            // quando a contagem de uma regra chegar a zero.
            complexity: ['warn', 12],
            'max-depth': ['warn', 4],
            'max-statements': ['warn', 20],
            'max-params': ['warn', 4],
            'max-lines-per-function': [
                'warn',
                { max: 150, skipBlankLines: true, skipComments: true },
            ],
            'max-nested-callbacks': ['warn', 3],
            // Baseline restante. A migracao acaba quando esta lista ficar
            // vazia. Tirar da lista o arquivo que for quebrado.
            'quality/max-lines': [
                'error',
                {
                    max: 350,
                    ignore: [
                        'src/conteudo/aula/aula.service.ts', // 438
                        'src/arcade/arcade.service.ts', // 388
                    ],
                },
            ],
            // Baseline: 1 violacao (aula.service.ts console.error). Volta para
            // "error" quando a contagem chegar a zero.
            'quality/no-direct-console': [
                'warn',
                { logger: 'o Logger do Nest (new Logger(Classe.name))' },
            ],
            // Fronteira real do backend (architecture.md 10.1): a camada de
            // transporte nao acessa banco direto. Controllers sao identificados
            // pelo sufixo do arquivo; o gateway WebSocket entra por diretorio.
            // Baseline: 1 violacao (aula-quiz.controller.ts, divida registrada
            // em architecture.md 2.1.4). Volta para "error" quando for zero.
            'quality/no-direct-data-access': [
                'warn',
                {
                    modules: ['typeorm'],
                    bindings: ['Repository', 'DataSource', 'EntityManager'],
                    layers: ['/src/gateway/'],
                    extensions: ['.controller.ts'],
                },
            ],
        },
    },
    {
        // Mesmo orcamento de tamanho para os testes, em "warn". Depois do bloco
        // de "error": para um arquivo casado pelos dois, flat config aplica o
        // ultimo bloco, entao um "off"/"warn" antes seria sobrescrito em silencio.
        files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
        plugins: { quality },
        rules: {
            'quality/max-lines': ['warn', { max: 350, includeTests: true }],
            'max-statements': 'off',
            'max-lines-per-function': 'off',
            'max-nested-callbacks': 'off',
        },
    },
);

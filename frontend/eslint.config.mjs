import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

export default defineConfig([
    ...nextVitals,
    ...nextTypeScript,
    prettier,
    {
        rules: {
            semi: ['error', 'never'],
            quotes: ['error', 'single', { avoidEscape: true }],
            eqeqeq: ['error', 'smart'],
            'no-console': 'error',
            'import/no-duplicates': 'error',
            'no-duplicate-imports': [
                'error',
                { allowSeparateTypeImports: true },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/entities/*/**',
                                '@/features/*/**',
                                '@/widgets/*/**',
                                '@/views/*/**',
                            ],
                            message:
                                'FSD slice는 공개 API(index.ts)를 통해 import하세요.',
                        },
                    ],
                },
            ],
            '@next/next/no-img-element': 'off',
        },
    },
    {
        files: ['src/shared/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/entities/**',
                                '@/features/**',
                                '@/widgets/**',
                                '@/views/**',
                            ],
                            message:
                                'shared 레이어는 상위 FSD 레이어를 참조할 수 없습니다.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/entities/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/features/**',
                                '@/widgets/**',
                                '@/views/**',
                            ],
                            message:
                                'entities 레이어는 상위 FSD 레이어를 참조할 수 없습니다.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/features/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/widgets/**', '@/views/**'],
                            message:
                                'features 레이어는 상위 FSD 레이어를 참조할 수 없습니다.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/widgets/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/views/**'],
                            message:
                                'widgets 레이어는 views 레이어를 참조할 수 없습니다.',
                        },
                    ],
                },
            ],
        },
    },
    globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
])

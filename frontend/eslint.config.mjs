import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

export default defineConfig([
    ...nextVitals,
    ...nextTypeScript,
    prettier,
    {
        rules: {
            semi: ['error', 'always'],
            quotes: ['error', 'single', { avoidEscape: true }],
            '@next/next/no-img-element': 'off',
        },
    },
    globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
]);

// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export function baseConfig(dirname) {
    return tseslint.config(
        eslint.configs.recommended,
        ...tseslint.configs.recommended,
        {
            languageOptions: {
                parserOptions: {
                    projectService: {
                        allowDefaultProject: ['eslint.config.mjs'],
                    },
                    tsconfigRootDir: dirname,
                },
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'warn',
            },
        },
        {
            ignores: ['dist/**', 'node_modules/**'],
        },
    );
}

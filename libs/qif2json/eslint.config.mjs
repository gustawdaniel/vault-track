
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['dist', 'coverage', 'node_modules', '*.js', '*.cjs', '*.mjs'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'complexity': 'off',
        },
    },
);

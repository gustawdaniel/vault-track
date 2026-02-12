
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['dist', 'coverage', 'node_modules'],
    },
    {
        rules: {
            'no-var': 'off',
            'no-fallthrough': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-case-declarations': 'off',
        },
    },
);

module.exports = {
	parserOptions: {
		sourceType: 'module',
	},
	env: {
		browser: true,
		es2021: true,
		node: true,
		jest: true,
	},
	extends: 'xo',
	overrides: [
		{
			env: {
				node: true,
			},
			files: [
				'.eslintrc.{js,cjs}',
			],
			parserOptions: {
				sourceType: 'script',
			},
		},
		{
			extends: [
				'xo-typescript',
			],
			rules: {
				'@typescript-eslint/naming-convention': 'off',
			},
			files: [
				'*.ts',
				'*.tsx',
			],
		},
	],

	rules: {
		camelcase: 'off',
		'max-params': 'off',
		complexity: 'off',
		'capitalized-comments': 'off',
	},
};

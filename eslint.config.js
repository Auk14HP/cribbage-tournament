import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	globalIgnores(['dist']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			globals: globals.browser,
			// Type information, so rules such as no-deprecated can see what a name refers to.
			parserOptions: {
				project: ['./tsconfig.json', './tsconfig.node.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	// Prettier owns formatting, so its config switches off ESLint's formatting rules.
	prettier,
	/*
	 * House rules, after Prettier's config so they stay on. None of them fight Prettier:
	 * it keeps braced bodies on their own line and leaves comment style alone.
	 */
	{
		files: ['**/*.{ts,tsx}'],
		plugins: { '@stylistic': stylistic },
		rules: {
			curly: ['error', 'all'],
			'func-style': ['error', 'expression'],
			'prefer-arrow-callback': 'error',
			'@stylistic/multiline-comment-style': ['error', 'starred-block'],
			'@typescript-eslint/no-deprecated': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'no-restricted-syntax': [
				'error',
				/*
				 * A call inside a call's arguments, inside another call's arguments. A callback's body starts
				 * afresh, so iterating nested arrays is fine. A call made on a call's result, such as
				 * within(...).getByRole(...), slips past: CODING_STANDARDS.md covers it at review.
				 */
				{
					selector:
						':matches(CallExpression, NewExpression) > :matches(CallExpression, NewExpression).arguments > :matches(CallExpression, NewExpression).arguments',
					message:
						'Name the inner result first: a call nests at most one level inside another call’s arguments (CODING_STANDARDS.md, Readability).',
				},
				{
					selector:
						'VariableDeclarator[id.name=/^render[A-Z]/] > ArrowFunctionExpression',
					message: 'Make this its own component instead of a renderX helper.',
				},
			],
		},
	},
]);

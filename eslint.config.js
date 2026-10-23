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
		languageOptions: { globals: globals.browser },
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
		},
	},
]);

import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The Tournament core's files in src/tournament/, in the order they may import from each other.
const coreFiles = ['types', 'bracket', 'registration', 'seating', 'draw', 'results', 'views'];

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
			/*
			 * Type information, so rules such as no-deprecated can see what a name refers to. The project
			 * service finds each file's tsconfig as an editor does, from the root tsconfig.json's references,
			 * so a file an editor would leave without its types fails lint.
			 */
			parserOptions: {
				projectService: true,
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
				// Playwright reads a timeout of 0 as no limit, so a wait that was meant to look once hangs instead.
				{
					selector: "Property[key.name='timeout'][value.value=0]",
					message:
						'Playwright waits forever on timeout: 0. To look once, read the state directly, as `await locator.isVisible()` does.',
				},
				/*
				 * A Match's place compared as an object. The core works out places afresh on each command, so
				 * two places for the same Match are rarely the same object, and === quietly finds no match.
				 */
				{
					selector:
						"BinaryExpression[operator=/^[!=]==?$/] > MemberExpression[property.name='match'], BinaryExpression[operator=/^[!=]==?$/] > ChainExpression > MemberExpression[property.name='match']",
					message:
						'Compare Matches by place, not as objects: isSameMatch inside src/tournament/, getMatchKey outside it. Places worked out afresh are new objects, so === never matches a saved one.',
				},
				{
					selector:
						'VariableDeclarator[id.name=/^render[A-Z]/] > ArrowFunctionExpression',
					message: 'Make this its own component instead of a renderX helper.',
				},
				// A row that works anything out, such as its own callbacks, is a component, not a map body.
				{
					selector:
						"JSXExpressionContainer > CallExpression[callee.property.name='map'] > ArrowFunctionExpression > BlockStatement",
					message:
						'Make each item its own component: a JSX map callback returns that component directly.',
				},
			],
		},
	},
	/*
	 * Browser tests and screenshots take `test` from e2e/setUpTournament.ts, which seeds every Draw, so none
	 * of them depends on a random Draw.
	 */
	{
		files: ['e2e/**/*.ts', 'screens/**/*.ts'],
		ignores: ['e2e/setUpTournament.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@playwright/test',
							importNames: ['test'],
							message:
								'Import test from e2e/setUpTournament.ts: it seeds the Draw, so the test sees the same Draw every run.',
						},
					],
				},
			],
		},
	},
	/*
	 * The Tournament core's files, each holding one concept (#57). Each imports only from the files above it
	 * in this list, so they never import in a cycle. index.ts re-exports them, and the core's tests may import
	 * any of them.
	 */
	...coreFiles.map((coreFile, index) => {
		const above = coreFiles.slice(0, index);
		/*
		 * Any path into the core, from beside the file (./draw) or back in from outside the folder
		 * (../tournament/draw, or ../tournament for index.ts), unless it names a file above this one.
		 */
		const intoCore = String.raw`^(\./|\.\./tournament(/|$))`;
		const unlessAbove = above.length === 0 ? '' : `(?!(${above.join('|')})$)`;
		return {
			files: [`src/tournament/${coreFile}.ts`],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						patterns: [
							{
								regex: intoCore + unlessAbove,
								message: `In the Tournament core, ${coreFile}.ts imports only from the files above it in eslint.config.js's coreFiles (${above.join(', ') || 'none'}), so the core's files never import in a cycle.`,
							},
						],
					},
				],
			},
		};
	}),
	/*
	 * One file per screen in each route (#42). The cap keeps a screen from regrowing to the size that
	 * prompted the split: past it, move a part out to its own file. Test files are exempt.
	 */
	{
		files: ['src/organizer/**/*.{ts,tsx}', 'src/display/**/*.{ts,tsx}'],
		ignores: ['**/*.test.{ts,tsx}'],
		rules: {
			'max-lines': ['error', 300],
		},
	},
]);

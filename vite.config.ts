import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

/*
 * GitHub Pages serves 404.html for any path it has no file for, so a copy of the entry there lets a direct load
 * or reload of the display route (`<base>display`) start the app, which then picks the route from the path.
 */
const copyEntryTo404 = (): Plugin => {
	let outDir = '';
	return {
		name: 'copy-entry-to-404',
		apply: 'build',
		configResolved: (config) => {
			outDir = resolve(config.root, config.build.outDir);
		},
		closeBundle: () => {
			copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
		},
	};
};

export default defineConfig(({ command, isPreview }) => ({
	/*
	 * A build is for GitHub Pages, served under the repository's name, and `vite preview` serves it there too;
	 * the dev server and Vitest stay at the root.
	 */
	base: command === 'build' || isPreview ? '/cribbage-tournament/' : '/',
	plugins: [react(), tailwindcss(), copyEntryTo404()],
	test: {
		// e2e/ and screens/ are Playwright's, run by `npm run e2e` and `npm run screens`, not Vitest.
		exclude: [...configDefaults.exclude, 'e2e/**', 'screens/**'],
		setupFiles: ['src/failOnConsoleOutput.ts'],
		// Every spy is put back after its test, even one whose assertion failed.
		restoreMocks: true,
	},
}));

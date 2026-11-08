import { defineConfig } from '@playwright/test';

const devPort = 5181;
const pagesPort = 5182;

// The dev server at the root, shared with the screenshot script (playwright.screens.config.ts).
export const devBaseURL = `http://localhost:${devPort}`;
export const devServer = {
	command: `npm run dev -- --port ${devPort} --strictPort`,
	url: devBaseURL,
	reuseExistingServer: !process.env.CI,
};

/*
 * Browser tests for what jsdom can't reach: two real windows sharing local storage.
 * Uses the installed Google Chrome (also preinstalled on GitHub's Ubuntu runners), so no browser download.
 * Two projects: `dev` runs against the dev server at the root, `pages` against the built app as GitHub Pages
 * serves it, under /cribbage-tournament/.
 */
export default defineConfig({
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	use: {
		channel: 'chrome',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'dev',
			testIgnore: 'pages-build.spec.ts',
			use: { baseURL: devBaseURL },
		},
		{
			name: 'pages',
			testMatch: 'pages-build.spec.ts',
			use: { baseURL: `http://localhost:${pagesPort}` },
		},
	],
	webServer: [
		devServer,
		{
			command: `npm run build && npm run preview -- --port ${pagesPort} --strictPort`,
			url: `http://localhost:${pagesPort}/cribbage-tournament/`,
			reuseExistingServer: !process.env.CI,
		},
	],
});

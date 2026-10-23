import { defineConfig } from '@playwright/test';

const port = 5181;

/*
 * Browser tests for what jsdom can't reach: two real windows sharing local storage.
 * Uses the installed Google Chrome (also preinstalled on GitHub's Ubuntu runners), so no browser download.
 */
export default defineConfig({
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: `http://localhost:${port}`,
		channel: 'chrome',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: `npm run dev -- --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
	},
});

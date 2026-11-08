import { defineConfig } from '@playwright/test';
import base, { devBaseURL, devServer } from './playwright.config';

// Screenshots for the run-app skill, not tests: `npm run screens`. Same dev server as the browser tests.
export default defineConfig({
	...base,
	testDir: 'screens',
	retries: 0,
	projects: [{ name: 'dev', use: { baseURL: devBaseURL } }],
	webServer: devServer,
});

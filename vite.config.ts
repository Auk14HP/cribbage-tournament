import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	test: {
		// e2e/ and screens/ are Playwright's, run by `npm run e2e` and `npm run screens`, not Vitest.
		exclude: [...configDefaults.exclude, 'e2e/**', 'screens/**'],
		setupFiles: ['src/failOnConsoleOutput.ts'],
		// Every spy is put back after its test, even one whose assertion failed.
		restoreMocks: true,
	},
});

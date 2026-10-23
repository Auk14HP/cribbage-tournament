import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// e2e/ holds Playwright's browser tests, run by `npm run e2e`, not Vitest.
	test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// e2e/ and screens/ are Playwright's, run by `npm run e2e` and `npm run screens`, not Vitest.
	test: { exclude: [...configDefaults.exclude, 'e2e/**', 'screens/**'] },
});

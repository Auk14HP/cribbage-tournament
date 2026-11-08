import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { confirmDraw, test } from './setUpTournament';

/*
 * The built app as GitHub Pages serves it, under /cribbage-tournament/ (the `pages` project in
 * playwright.config.ts serves `npm run build` with `vite preview`). Both routes, the test-Players parameters and
 * the link to the TV's window all have to respect that base path, not the root the dev server uses.
 */

test('the built app sets up test Players and opens the TV display beside the Organizer, under the base path', async ({
	page: organizer,
}) => {
	await organizer.goto('/cribbage-tournament/?players=16&boards=8');
	await expect(organizer).toHaveURL(/\/cribbage-tournament\/$/);
	await expect(
		organizer.getByRole('list', { name: 'Players' }).getByRole('listitem'),
	).toHaveCount(16);

	const tvOpening = organizer.waitForEvent('popup');
	await organizer.getByRole('link', { name: 'Open TV display' }).click();
	const tv = await tvOpening;
	await expect(tv).toHaveURL(/\/cribbage-tournament\/display$/);
	await expect(tv.getByRole('heading', { name: 'Tonight’s Players' })).toBeVisible();
	await expect(tv.getByText('16 Players registered')).toBeVisible();

	await confirmDraw(organizer);
	await expect(tv.getByRole('list', { name: 'Matches' }).getByRole('listitem')).toHaveCount(8);
});

test('a direct load of the built display route shows the TV display', async ({ page: tv }) => {
	await tv.goto('/cribbage-tournament/display');
	await expect(tv.getByRole('heading', { name: 'Tonight’s Players' })).toBeVisible();
});

/*
 * `vite preview` falls back to the entry for any path, but GitHub Pages serves 404.html instead, so the build
 * must leave a copy of the entry there for a direct load of the display route to start the app.
 */
test('the build leaves Pages a 404.html that starts the app', () => {
	expect(readFileSync('dist/404.html', 'utf8')).toBe(readFileSync('dist/index.html', 'utf8'));
});

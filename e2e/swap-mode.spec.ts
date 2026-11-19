import { expect, type Page } from '@playwright/test';
import { confirmDraw, findMatchesOnBoards, test } from './setUpTournament';

/*
 * Swap mode on Tonight's Draw moves nothing on the organizer route: the Players' names become buttons in place,
 * and the Organizer's eyes stay where they were when they tapped Swap Players. jsdom can't lay out a page, so
 * this runs in a real browser.
 */

test.use({ viewport: { width: 1280, height: 720 } });

/*
 * Where each part of Tonight's Draw sits: the button that turns Swap mode on and off, every Match row, on a
 * Board or waiting for one, Start, and the TV screens heading below it.
 */
const measureDrawScreen = async (page: Page) => {
	const swapModeButton = page.getByRole('button', { name: /^(Swap Players|Done)$/ });
	const rows = await page.getByRole('main').getByRole('listitem').all();
	const start = page.getByRole('button', { name: 'Start', exact: true });
	const tvScreensHeading = page.getByRole('heading', { name: 'TV screens' });
	const parts = [swapModeButton, ...rows, start, tvScreensHeading];
	return Promise.all(parts.map((part) => part.boundingBox()));
};

test('moves nothing on Tonight’s Draw when Swap mode starts, or when a Player is picked', async ({
	page,
}) => {
	// 21 Players on 8 Boards: Matches on every Board, more waiting for one, and a Bye Player waiting for a winner.
	await page.goto('/?players=21&boards=8');
	await confirmDraw(page);
	const beforeSwapMode = await measureDrawScreen(page);

	// The button that turns Swap mode on keeps its box as it becomes Done, so a second click lands on it.
	await page.getByRole('button', { name: 'Swap Players' }).click();
	await expect(page.getByText('Tap two Players to swap them.')).toBeVisible();
	expect(await measureDrawScreen(page)).toEqual(beforeSwapMode);

	const firstPlayerButton = findMatchesOnBoards(page).getByRole('button').first();
	await firstPlayerButton.click();
	await expect(firstPlayerButton).toHaveAttribute('aria-pressed', 'true');
	expect(await measureDrawScreen(page)).toEqual(beforeSwapMode);

	await page.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByText('Tap two Players to swap them.')).toBeHidden();
	expect(await measureDrawScreen(page)).toEqual(beforeSwapMode);
});

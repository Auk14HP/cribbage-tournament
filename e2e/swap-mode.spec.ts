import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import { confirmDraw, findMatchesOnBoards, test } from './setUpTournament';

/*
 * Swap mode on Tonight's Draw moves nothing on the organizer route: the Players' names become buttons in place,
 * and the Organizer's eyes stay where they were when they tapped Swap Players. jsdom can't lay out a page, so
 * this runs in a real browser.
 */

test.use({ viewport: { width: 1280, height: 720 } });

/*
 * The parts of Tonight's Draw: the button that turns Swap mode on and off, every Match row, on a Board or
 * waiting for one, Start, and the TV screens heading below it.
 */
const listDrawScreenParts = (page: Page) => [
	page.getByRole('button', { name: /^(Swap Players|Done)$/ }),
	page.getByRole('main').getByRole('listitem'),
	page.getByRole('button', { name: 'Start', exact: true }),
	page.getByRole('heading', { name: 'TV screens' }),
];

test('moves nothing on Tonight’s Draw when Swap mode starts, when a Player is picked, or on Done', async ({
	page,
}) => {
	// 21 Players on 8 Boards: Matches on every Board, more waiting for one, and a Bye Player waiting for a winner.
	await page.goto('/?players=21&boards=8');
	await confirmDraw(page);
	const parts = listDrawScreenParts(page);
	const swapLine = page.getByText('Tap two Players to swap them.');

	// The button that turns Swap mode on keeps its box as it becomes Done, so a second click lands on it.
	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: 'Swap Players' }).click();
		await expect(swapLine).toBeVisible();
	});
	const firstPlayerButton = findMatchesOnBoards(page).getByRole('button').first();
	await expectNothingMoves(parts, async () => {
		await firstPlayerButton.click();
		await expect(firstPlayerButton).toHaveAttribute('aria-pressed', 'true');
	});
	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: 'Done' }).click();
		await expect(swapLine).toBeHidden();
	});
});

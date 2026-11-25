import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import { confirmDraw, findMatchesOnBoards, test } from './setUpTournament';
import { expectTextFits, findLongestNamedButton } from './textFits';

/*
 * Swap mode on Tonight's Draw moves nothing on the organizer route: the row above the Matches becomes its banner,
 * Swap Players becomes Done in the same box, the Players' names become seats in place, the Player picked is
 * tagged PICKED on their seat's edge without widening it, and the Organizer's eyes stay where they were when they
 * tapped Swap Players. jsdom can't lay out a page, so this runs in a real browser.
 */

test.use({ viewport: { width: 1280, height: 720 } });

/*
 * The parts of Tonight's Draw: the row above the Matches, which holds the change, the button in it that turns
 * Swap mode on and off, every Match row, on a Board or waiting for one, the "vs" between each waiting row's
 * Players, which moves if the first Player's name widens, Start, and the TV Display heading.
 */
const listDrawScreenParts = (page: Page) => [
	page.getByTestId('row above the Matches'),
	page.getByRole('button', { name: /^(Swap Players|Done)$/ }),
	findMatchesOnBoards(page).getByRole('listitem'),
	page.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem'),
	page.getByRole('list', { name: 'Waiting for a Board' }).getByText('vs', { exact: true }),
	page.getByRole('button', { name: 'Start', exact: true }),
	page.getByRole('heading', { name: 'TV Display' }),
];

test('moves nothing on Tonight’s Draw when Swap mode starts, when a Player is picked, or on Done', async ({
	page,
}) => {
	// 21 Players on 8 Boards: Matches on every Board, more waiting for one, and a Bye Player waiting for a winner.
	await page.goto('/?players=21&boards=8');
	await confirmDraw(page);
	const parts = listDrawScreenParts(page);
	const swapBanner = page.getByRole('region', { name: 'Swap mode' });

	// The button keeps its box as it becomes Done, so a second click lands on it.
	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: 'Swap Players' }).click();
		await expect(swapBanner).toBeVisible();
	});
	// Picking a Player in a waiting row tags them PICKED on their seat's edge, so the row's names stay put.
	const waitingPlayerButton = page
		.getByRole('list', { name: 'Waiting for a Board' })
		.getByRole('button')
		.first();
	// Scrolled to first, as the click would scroll it into view and move every part.
	await waitingPlayerButton.scrollIntoViewIfNeeded();
	await expectNothingMoves(parts, async () => {
		await waitingPlayerButton.click();
		await expect(swapBanner).toContainText('is picked.');
	});
	const firstPlayerButton = findMatchesOnBoards(page).getByRole('button').first();
	// Tapped again to clear the pick, then the Match tile's seat scrolled to, both before measuring.
	await waitingPlayerButton.click();
	await firstPlayerButton.scrollIntoViewIfNeeded();
	await expectNothingMoves(parts, async () => {
		await firstPlayerButton.click();
		await expect(firstPlayerButton).toHaveAttribute('aria-pressed', 'true');
	});
	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: 'Done' }).click();
		await expect(swapBanner).toBeHidden();
	});
});

test('fits the longest names inside their seats when picked, in a Match tile and in a waiting row', async ({
	page,
}) => {
	// 21 Players on 8 Boards: Bartholomew in a Match tile, Frank the Tank waiting for a Board.
	await page.goto('/?players=21&boards=8');
	await confirmDraw(page);
	await page.getByRole('button', { name: 'Swap Players' }).click();
	const matches = findMatchesOnBoards(page);
	const waitingList = page.getByRole('list', { name: 'Waiting for a Board' });

	for (const area of [matches, waitingList]) {
		const longestNamedSeat = await findLongestNamedButton(area);
		await longestNamedSeat.click();
		await expect(longestNamedSeat).toHaveAttribute('aria-pressed', 'true');
		await expectTextFits(area.getByRole('button'));
		// Tapped again to clear the pick, swapping no one.
		await longestNamedSeat.click();
	}
});

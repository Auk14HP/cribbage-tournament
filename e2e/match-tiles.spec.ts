import { expect, type Locator } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import {
	confirmDraw,
	findMatchesOnBoards,
	playFirstMatchesWithLosersStaying,
	test,
} from './setUpTournament';

/*
 * The Organizer's Match tiles, laid out in a real browser: jsdom can't measure where a tile
 * draws its parts. The Forfeit stays beside each tile's second Player, and Start, which
 * brings it, moves nothing.
 */

test.use({ viewport: { width: 1280, height: 900 } });

// The foot of an element on screen, in pixels from the top of the page.
const measureFoot = async (element: Locator) => {
	const box = (await element.boundingBox())!;
	return box.y + box.height;
};

// A tile's second Player: the last of the buttons that record a winner.
const findSecondPlayer = (tile: Locator) =>
	tile.getByRole('button').filter({ hasNotText: 'Forfeit' }).last();

/*
 * A tile's padding, in pixels: a tile not stretched by its line ends this
 * far below its second Player.
 */
const tilePadding = 12;

test('keeps each Forfeit level with its second Player, beside a tile made taller by a name over two lines', async ({
	page,
}) => {
	/*
	 * 10 Players on 4 Boards, the first Matches played and their losers staying: Board 1's
	 * Player waits on a winner named over two lines, making its line of tiles taller, beside
	 * Board 2's Match being played.
	 */
	await page.goto('/?players=10&boards=4');
	await confirmDraw(page);
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await playFirstMatchesWithLosersStaying(page, { firstMatchCount: 5 });
	const tilesWithForfeit = findMatchesOnBoards(page)
		.getByRole('listitem')
		.filter({ has: page.getByRole('button', { name: 'Forfeit' }) });
	const stretchedTiles: Locator[] = [];
	for (const tile of await tilesWithForfeit.all()) {
		const spaceBelowPlayers =
			(await measureFoot(tile)) - (await measureFoot(findSecondPlayer(tile)));
		if (spaceBelowPlayers > tilePadding + 1) {
			stretchedTiles.push(tile);
		}
	}
	expect(stretchedTiles.length).toBeGreaterThan(0);

	for (const tile of await tilesWithForfeit.all()) {
		const forfeitFoot = await measureFoot(tile.getByRole('button', { name: 'Forfeit' }));
		const secondPlayerFoot = await measureFoot(findSecondPlayer(tile));
		/*
		 * toBeCloseTo counts the digits after the point that must match:
		 * none, so to the whole pixel.
		 */
		const digitsAfterPoint = 0;
		expect(forfeitFoot).toBeCloseTo(secondPlayerFoot, digitsAfterPoint);
	}
});

test('moves no tile, Board number or Round when Start brings each tile its Forfeit', async ({
	page,
}) => {
	/*
	 * 21 Players on 8 Boards: Bye Players meet in Round 2 beside Round 1's Matches,
	 * so tiles name their Rounds.
	 */
	await page.goto('/?players=21&boards=8');
	await confirmDraw(page);
	const tiles = findMatchesOnBoards(page).getByRole('listitem');
	const parts = [
		tiles,
		tiles.getByText(/^\d+$/),
		tiles.getByText(/^(Round \d+|Final)$/),
		page.getByRole('heading', { name: 'Winners Bracket' }),
	];

	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(tiles.getByRole('button', { name: 'Forfeit' }).first()).toBeVisible();
	});
});

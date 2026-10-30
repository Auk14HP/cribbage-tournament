import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { confirmDraw, holdScreen } from './setUpTournament';

/*
 * The fields that ask most of the TV at each size Now playing can take: the whole Waiting for a Board list
 * stays on screen, on Tonight's Draw and on Now playing, and the page doesn't outgrow it.
 */
const tvHeight = 1080;

const expectPageFitsTv = async (tv: Page) => {
	const pageHeight = await tv.evaluate(() => document.documentElement.scrollHeight);
	expect(pageHeight).toBeLessThanOrEqual(tvHeight);
};

const expectWaitingOnScreen = async (tv: Page, waitingMatchCount: number) => {
	const waiting = tv.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem');
	await expect(waiting).toHaveCount(waitingMatchCount);
	const lastEntry = await waiting.last().boundingBox();
	expect(lastEntry!.y + lastEntry!.height).toBeLessThanOrEqual(tvHeight);
	await expectPageFitsTv(tv);
};

// 32 Players open 16 Matches, and those without a Board wait for one.
const openingMatchCount = 16;

const openTv = async (context: BrowserContext) => {
	const tv = await context.newPage();
	await tv.setViewportSize({ width: 1920, height: tvHeight });
	await tv.goto('/display');
	return tv;
};

const makeDraw = async (organizer: Page, tv: Page) => {
	await confirmDraw(organizer);
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
};

const registerLongNames = async (organizer: Page, players: number) => {
	const playerName = organizer.getByLabel('Player name');
	for (let player = 1; player <= players; player++) {
		await playerName.fill(`Bartholomew Featherstonehaugh ${player}`);
		await playerName.press('Enter');
	}
};

for (const boards of [2, 5, 6, 7, 13]) {
	const waitingMatchCount = openingMatchCount - boards;

	test(`Waiting for a Board stays on the TV at 32 Players on ${boards} Boards`, async ({
		context,
		page: organizer,
	}) => {
		await organizer.goto(`/?players=32&boards=${boards}`);
		const tv = await openTv(context);

		await makeDraw(organizer, tv);
		await expectWaitingOnScreen(tv, waitingMatchCount);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await holdScreen(organizer, tv, 'Now playing');
		await expectWaitingOnScreen(tv, waitingMatchCount);
	});
}

test('Long names stay on one line on Tonight’s Draw', async ({ context, page: organizer }) => {
	// 32 Players on 13 Boards leaves no slack, so one name wrapping would push the page past the TV.
	const boards = 13;
	await organizer.goto(`/?players=0&boards=${boards}`);
	const tv = await openTv(context);
	await registerLongNames(organizer, 32);

	await makeDraw(organizer, tv);

	await expectWaitingOnScreen(tv, openingMatchCount - boards);
});

test('A Bye Player’s card shows the whole Match they wait for', async ({
	context,
	page: organizer,
}) => {
	// 31 Players on 16 Boards: the Bye Player waiting for a winner has a card of their own.
	await organizer.goto('/?players=31&boards=16');
	const tv = await openTv(context);

	await makeDraw(organizer, tv);

	const awaitedMatchLine = tv.getByText(/^Winner of /);
	const isCutShort = await awaitedMatchLine.evaluate(
		(line) => line.scrollWidth > line.clientWidth || line.scrollHeight > line.clientHeight,
	);
	expect(isCutShort).toBe(false);
	await expectPageFitsTv(tv);
});

test('A very long Match a Bye Player waits for takes two lines at most', async ({
	context,
	page: organizer,
}) => {
	// 31 Players on 16 Boards: the page has no room for a third line.
	await organizer.goto('/?players=0&boards=16');
	const tv = await openTv(context);
	await registerLongNames(organizer, 31);

	await makeDraw(organizer, tv);

	await expectPageFitsTv(tv);
});

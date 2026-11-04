import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { confirmDraw, holdScreen, seedDraw } from './setUpTournament';

const tvHeight = 1080;

const expectPageFitsTv = async (tv: Page) => {
	const pageHeight = await tv.evaluate(() => document.documentElement.scrollHeight);
	expect(pageHeight).toBeLessThanOrEqual(tvHeight);
};

/*
 * Checks that the whole Waiting for a Board list fits on the TV and the page doesn't grow past it. The tests
 * below use the fields that fill the most of the TV for each of Now playing's sizes, and check both Tonight's
 * Draw and Now playing.
 */
const expectWaitingListFitsTv = async (tv: Page, waitingMatchCount: number) => {
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

const showDrawOnTv = async (organizer: Page, tv: Page) => {
	await confirmDraw(organizer);
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
};

const registerPlayers = async (organizer: Page, names: string[]) => {
	const playerName = organizer.getByLabel('Player name');
	for (const name of names) {
		await playerName.fill(name);
		await playerName.press('Enter');
	}
};

const registerLongNames = async (organizer: Page, playerCount: number) => {
	await registerPlayers(
		organizer,
		Array.from(
			{ length: playerCount },
			(_, index) => `Bartholomew Featherstonehaugh ${index + 1}`,
		),
	);
};

/*
 * Names as long as the room's longest, such as "Frank the Tank": two long first names, each with one of the
 * widest initials. Any two of them make as long a pair as the room is likely to see, so whichever Match the
 * Draw makes a Bye Player wait for is the longest realistic one.
 */
const makeLongestRealisticNames = (playerCount: number) => {
	const initials = 'WMQOGDHNUCBRKAVX';
	return Array.from(
		{ length: playerCount },
		(_, index) =>
			`${index % 2 === 0 ? 'Bartholomew' : 'Christopher'} ${initials[Math.floor(index / 2)]}.`,
	);
};

for (const boardCount of [2, 5, 6, 7, 13]) {
	const waitingMatchCount = openingMatchCount - boardCount;

	test(`Waiting for a Board stays on the TV at 32 Players on ${boardCount} Boards`, async ({
		context,
		page: organizer,
	}) => {
		await organizer.goto(`/?players=32&boards=${boardCount}`);
		const tv = await openTv(context);

		await showDrawOnTv(organizer, tv);
		await expectWaitingListFitsTv(tv, waitingMatchCount);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await holdScreen(organizer, tv, 'Now playing');
		await expectWaitingListFitsTv(tv, waitingMatchCount);
	});
}

test('Long names stay on one line on Tonight’s Draw', async ({ context, page: organizer }) => {
	// 32 Players on 13 Boards leaves no slack, so one name wrapping would push the page past the TV.
	const boardCount = 13;
	await organizer.goto(`/?players=0&boards=${boardCount}`);
	const tv = await openTv(context);
	await registerLongNames(organizer, 32);

	await showDrawOnTv(organizer, tv);

	await expectWaitingListFitsTv(tv, openingMatchCount - boardCount);
});

test('A Bye Player’s card shows the whole Match they wait for', async ({
	context,
	page: organizer,
}) => {
	// 31 Players on 16 Boards: the Bye Player waiting for a winner has a card of their own.
	await seedDraw(context);
	await organizer.goto('/?players=0&boards=16');
	const tv = await openTv(context);
	await registerPlayers(organizer, makeLongestRealisticNames(31));

	await showDrawOnTv(organizer, tv);

	const awaitedMatchLine = tv.getByText(/^Winner of /);
	const isCutShort = await awaitedMatchLine.evaluate(
		(line) => line.scrollWidth > line.clientWidth || line.scrollHeight > line.clientHeight,
	);
	expect(isCutShort).toBe(false);
	await expectPageFitsTv(tv);
});

test('A very long Match a Bye Player waits for takes three lines at most', async ({
	context,
	page: organizer,
}) => {
	// 31 Players on 16 Boards: the Bye Player waiting for a winner has a card of their own.
	await organizer.goto('/?players=0&boards=16');
	const tv = await openTv(context);
	await registerLongNames(organizer, 31);

	await showDrawOnTv(organizer, tv);

	const awaitedMatchLine = tv.getByText(/^Winner of /);
	const lineCount = await awaitedMatchLine.evaluate((line) => {
		const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
		return Math.round(line.clientHeight / lineHeight);
	});
	expect(lineCount).toBeLessThanOrEqual(3);
	await expectPageFitsTv(tv);
});

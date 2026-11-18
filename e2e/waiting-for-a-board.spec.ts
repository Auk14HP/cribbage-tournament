import { expect, type Page } from '@playwright/test';
import { confirmDraw, holdScreen, openTv, test, tvSizes } from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';

/*
 * Checks that the whole Waiting for a Board list, and all else on the screen, fits inside the TV's safe area.
 * The tests below use the fields that fill the most of the TV for each of Now playing's sizes, and check both
 * Tonight's Draw and Now playing.
 */
const expectWaitingListFitsTv = async (tv: Page, waitingMatchCount: number) => {
	const waiting = tv.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem');
	await expect(waiting).toHaveCount(waitingMatchCount);
	await expectInsideTvSafeArea(tv);
};

// 32 Players open 16 Matches, and those without a Board wait for one.
const openingMatchCount = 16;

// A 16:9 TV, the one most rooms have.
const [sixteenByNineTv] = tvSizes;

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

const makeLongNames = (playerCount: number) =>
	Array.from({ length: playerCount }, (_, index) => `Bartholomew Featherstonehaugh ${index + 1}`);

/*
 * Names as long as the room's longest: a long first name, "Bartholomew" or "Christopher", with one of the
 * widest initials, so each is as wide as the longest name in the test Tournament. Any two of them make a pair
 * at least as long as the room is likely to see. Up to 32 Players, one per initial and first name.
 */
const makeLongestRealisticNames = (playerCount: number) => {
	const initials = 'WMQOGDHNUCBRKAVX';
	return Array.from(
		{ length: playerCount },
		(_, index) =>
			`${index % 2 === 0 ? 'Bartholomew' : 'Christopher'} ${initials[Math.floor(index / 2)]}.`,
	);
};

/*
 * Registers 31 Players on 16 Boards, where the Bye Player waiting for a winner has a card of their own, and
 * returns that card's line naming the Match they wait for. The Draw is seeded so the same pair of names is
 * awaited every run.
 */
const showAwaitedMatchLineOnTv = async (organizer: Page, names: string[]) => {
	await organizer.goto('/?players=0&boards=16');
	const tv = await openTv(organizer, sixteenByNineTv);
	await registerPlayers(organizer, names);
	await showDrawOnTv(organizer, tv);
	return { tv, awaitedMatchLine: tv.getByText(/^Winner of /) };
};

for (const boardCount of [2, 5, 6, 7, 13]) {
	const waitingMatchCount = openingMatchCount - boardCount;

	test(`Waiting for a Board stays on the TV at 32 Players on ${boardCount} Boards`, async ({
		page: organizer,
	}) => {
		await organizer.goto(`/?players=32&boards=${boardCount}`);
		const tv = await openTv(organizer, sixteenByNineTv);

		await showDrawOnTv(organizer, tv);
		await expectWaitingListFitsTv(tv, waitingMatchCount);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await holdScreen(organizer, tv, 'Now playing');
		await expectWaitingListFitsTv(tv, waitingMatchCount);
	});
}

test('Long names stay on one line on Tonight’s Draw', async ({ page: organizer }) => {
	// 32 Players on 13 Boards leaves no slack, so one name wrapping would push the page past the TV.
	const boardCount = 13;
	await organizer.goto(`/?players=0&boards=${boardCount}`);
	const tv = await openTv(organizer, sixteenByNineTv);
	await registerPlayers(organizer, makeLongNames(32));

	await showDrawOnTv(organizer, tv);

	await expectWaitingListFitsTv(tv, openingMatchCount - boardCount);
});

test('A Bye Player’s card shows the whole Match they wait for', async ({ page: organizer }) => {
	const { tv, awaitedMatchLine } = await showAwaitedMatchLineOnTv(
		organizer,
		makeLongestRealisticNames(31),
	);

	const isCutShort = await awaitedMatchLine.evaluate(
		(line) => line.scrollWidth > line.clientWidth || line.scrollHeight > line.clientHeight,
	);
	expect(isCutShort).toBe(false);
	await expectInsideTvSafeArea(tv);
});

test('A very long Match a Bye Player waits for takes three lines at most', async ({
	page: organizer,
}) => {
	const { tv, awaitedMatchLine } = await showAwaitedMatchLineOnTv(organizer, makeLongNames(31));

	const lineCount = await awaitedMatchLine.evaluate((line) => {
		const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
		return Math.round(line.clientHeight / lineHeight);
	});
	expect(lineCount).toBeLessThanOrEqual(3);
	await expectInsideTvSafeArea(tv);
});

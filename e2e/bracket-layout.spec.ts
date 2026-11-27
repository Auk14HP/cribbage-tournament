import { expect, type Locator, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import {
	confirmDraw,
	parkCycleOn,
	openTv,
	playToFinal,
	playUntilTheFinal,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';
import { chooseTvTheme, findArtwork } from './tvTheme';

/*
 * The Winners Bracket's layout on a TV, measured from where the browser drew each Match: every Round header
 * and Board label is one line, every column's Matches start level, every Match sits level with the middle of the two that
 * feed it, and everything sits inside the TV's safe area. A Bye's place in the first Round has no Match, so its empty
 * slot is measured instead. Measured at Start; at the final, when the narrow final column names its Board;
 * and after the final, when winners' names fill later Rounds. On a 16:9 TV and on a narrower one. Then, every
 * Round header and Match card stays put from Tonight's Draw through Start. Last, a long champion's name keeps
 * the bracket's heading on one line, its motifs beside it.
 */

const findMiddle = async (slot: Locator): Promise<number> => {
	// A Match's card when its slot has one, else the empty slot of a Bye.
	const card = slot.getByTestId('match card');
	const box = (await card.count()) > 0 ? card : slot;
	const { y, height } = (await box.boundingBox())!;
	return y + height / 2;
};

// A list's slots, the Bye places included: a Bye's empty slot is hidden from the TV's reading.
const listSlots = (list: Locator) => list.getByRole('listitem', { includeHidden: true }).all();

// Every Round's list, the final's included, across the screen. Each list is as wide as its column.
const findRoundLists = (tv: Page) => tv.getByRole('list', { name: /^(Round \d+|Final)$/ });

// Each list's slots, the Bye places included, in the order the columns appear across the screen.
const listColumns = async (tv: Page, rounds: number) => {
	const listRound = (round: number) =>
		tv.getByRole('list', { name: round === rounds ? 'Final' : `Round ${round}` });
	const columns: { round: number; side: 'left' | 'right'; slots: Locator[] }[] = [];
	for (let round = 1; round < rounds; round++) {
		const [left, right] = await listRound(round).all();
		columns.push({ round, side: 'left', slots: await listSlots(left) });
		columns.push({ round, side: 'right', slots: await listSlots(right) });
	}
	return { columns, final: await listSlots(listRound(rounds)) };
};

for (const { players, rounds } of [
	{ players: 21, rounds: 5 },
	{ players: 32, rounds: 5 },
	{ players: 5, rounds: 3 },
]) {
	for (const moment of ['at Start', 'at the final', 'after the final'] as const) {
		for (const tvSize of tvSizes) {
			test(`with ${players} Players ${moment} on a ${tvSize.width}×${tvSize.height} TV, the bracket lines up, inside the safe area`, async ({
				page: organizer,
			}) => {
				await startTournament(organizer, { players });
				if (moment === 'at the final') {
					await playUntilTheFinal(organizer);
				}
				if (moment === 'after the final') {
					await playToFinal(organizer);
				}
				const tv = await openTv(organizer, tvSize);
				if (moment === 'after the final') {
					// Once finished, the TV opens on the champion.
					await parkCycleOn(organizer, tv, 'Winners Bracket');
				}
				await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();

				// Each header one line, no taller than one line of its text, and inside its column.
				const headers = await tv.getByRole('heading', { level: 2 }).all();
				for (const header of headers) {
					const lines = await header.evaluate(
						(element) =>
							element.getBoundingClientRect().height /
							parseFloat(getComputedStyle(element).lineHeight),
					);
					expect(lines, `the ${await header.textContent()} header wraps`).toBeLessThan(
						1.5,
					);
					const spill = await header.evaluate(
						(element) => element.scrollWidth - element.clientWidth,
					);
					expect(
						spill,
						`the ${await header.textContent()} header spills out of its column`,
					).toBe(0);
				}

				// Each Board label one line, however narrow its column.
				for (const label of await tv.getByText(/^Board \d+$/).all()) {
					const lines = await label.evaluate(
						(element) =>
							element.getBoundingClientRect().height /
							parseFloat(getComputedStyle(element).lineHeight),
					);
					expect(lines, `${await label.textContent()} wraps`).toBeLessThan(1.5);
				}

				const { columns, final } = await listColumns(tv, rounds);
				const lists = await findRoundLists(tv).all();
				const tops = await Promise.all(
					lists.map(async (list) => (await list.boundingBox())!.y),
				);
				for (const top of tops) {
					expect(Math.abs(top - tops[0]), 'a column’s Matches start lower').toBeLessThan(
						1,
					);
				}

				const findColumn = (round: number, side: 'left' | 'right') =>
					columns.find((c) => c.round === round && c.side === side)!.slots;
				for (const { round, side, slots } of columns.filter((c) => c.round > 1)) {
					const feeders = findColumn(round - 1, side);
					for (const [i, slot] of slots.entries()) {
						const [a, b] = [
							await findMiddle(feeders[2 * i]),
							await findMiddle(feeders[2 * i + 1]),
						];
						const slotMiddle = await findMiddle(slot);
						expect(
							Math.abs(slotMiddle - (a + b) / 2),
							`Round ${round}, ${side} half, Match ${i + 1}`,
						).toBeLessThan(2);
					}
				}
				const [left, right] = [
					findColumn(rounds - 1, 'left')[0],
					findColumn(rounds - 1, 'right')[0],
				];
				const middle = ((await findMiddle(left)) + (await findMiddle(right))) / 2;
				const finalMiddle = await findMiddle(final[0]);
				expect(Math.abs(finalMiddle - middle), 'the final').toBeLessThan(2);

				await expectInsideTvSafeArea(tv);
			});
		}
	}
}

/*
 * Tonight's Draw is the Winners Bracket before Start, so pressing Start moves none of its Round headers or
 * Match cards. With 21 Players, Byes put Matches in later Rounds too.
 */
for (const tvSize of tvSizes) {
	test(`with 21 Players on a ${tvSize.width}×${tvSize.height} TV, every Round header and Match card stays still from Tonight’s Draw to Start`, async ({
		page: organizer,
	}) => {
		await organizer.goto('/?players=21&boards=8');
		const tv = await openTv(organizer, tvSize);
		await confirmDraw(organizer);
		await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
		const roundHeaders = tv.getByRole('heading', { level: 2 });
		const matchCards = tv.getByTestId('match card');

		await expectNothingMoves([roundHeaders, matchCards], async () => {
			await organizer.getByRole('button', { name: 'Start', exact: true }).click();
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		});
	});
}

// Names as long as the room's longest, so whoever wins, the champion's line won't fit its row.
const longNames = [
	'Margaret Hatcher',
	'Christopher Long',
	'Wilhelmina Grant',
	'Bartholomew Reed',
	'Maximilian Cross',
	'Rosemary Whitfield',
	'Evelyn Thornton',
	'Frederick Lawson',
];

// Whether the element's text runs to a second line: taller than one line of its own text.
const isWrapped = (element: Locator) =>
	element.evaluate((box) => {
		const fontSize = parseFloat(getComputedStyle(box).fontSize);
		return box.getBoundingClientRect().height > fontSize * 1.5;
	});

test('keeps the Winners Bracket’s heading on one line, its motifs beside it, when a long name is champion on the narrower TV', async ({
	page: organizer,
}) => {
	await organizer.goto(`/?boards=${longNames.length / 2}`);
	const nameBox = organizer.getByLabel('Player name');
	for (const name of longNames) {
		await nameBox.fill(name);
		await nameBox.press('Enter');
	}
	await chooseTvTheme(organizer, 'Christmas');
	await confirmDraw(organizer);
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await playToFinal(organizer);
	const tv = await openTv(organizer, tvSizes[1]);
	await parkCycleOn(organizer, tv, 'Winners Bracket');
	const heading = tv.getByRole('heading', { name: 'Winners Bracket' });
	const championLine = tv.getByText(/^Champion: /);
	await expect(championLine).toBeVisible();

	expect(await isWrapped(heading), 'the heading wraps').toBe(false);
	expect(await isWrapped(championLine), 'the champion’s line wraps').toBe(false);
	const headingBox = (await heading.boundingBox())!;
	const motifsBox = (await findArtwork(tv).nth(1).boundingBox())!;
	const gapToMotifs = motifsBox.x - (headingBox.x + headingBox.width);
	// The motifs sit 1.5cqw from the heading: 1.5% of the TV's width, and a pixel for rounding.
	expect(gapToMotifs).toBeLessThanOrEqual(tvSizes[1].width * 0.015 + 1);
});

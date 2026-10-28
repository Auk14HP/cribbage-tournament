import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	holdScreen,
	playToFinal,
	playUntilTheFinal,
	seedDraw,
	startTournament,
} from './setUpTournament';

/*
 * The Winners Bracket's layout on a TV, measured from where the browser drew each Match: every Round header
 * and Board label is one line, every column's Matches start level, every Match sits level with the middle of the two that
 * feed it, and nothing runs off the screen. A Bye's place in the first Round has no Match, so its empty
 * slot is measured instead. Measured at Start; at the final, when the narrow final column names its Board;
 * and after the final, when winners' names fill later Rounds. On a 16:9 TV and on a narrower one.
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
		for (const tvSize of [
			{ width: 1920, height: 1080 },
			{ width: 1258, height: 955 },
		]) {
			test(`with ${players} Players ${moment} on a ${tvSize.width}×${tvSize.height} TV, the bracket lines up, all on screen`, async ({
				context,
				page: organizer,
			}) => {
				await seedDraw(context);
				await startTournament(organizer, players);
				if (moment === 'at the final') {
					await playUntilTheFinal(organizer);
				}
				if (moment === 'after the final') {
					await playToFinal(organizer);
				}
				const tv = await context.newPage();
				await tv.setViewportSize(tvSize);
				await tv.goto('/display');
				if (moment === 'after the final') {
					// Once finished, the TV opens on the champion.
					await holdScreen(organizer, tv, 'Winners Bracket');
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

				for (const column of lists) {
					const { x, width } = (await column.boundingBox())!;
					expect(x + width, 'a column runs off the right of the TV').toBeLessThanOrEqual(
						tvSize.width,
					);
				}
				for (const card of await tv.getByTestId('match card').all()) {
					const { x, y, width, height } = (await card.boundingBox())!;
					expect(y + height, 'a Match runs off the bottom of the TV').toBeLessThanOrEqual(
						tvSize.height,
					);
					expect(x + width, 'a Match runs off the right of the TV').toBeLessThanOrEqual(
						tvSize.width,
					);
				}
			});
		}
	}
}

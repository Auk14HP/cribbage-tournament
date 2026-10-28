import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

/*
 * The Winners Bracket's layout on a TV, measured from where the browser drew each Match: every Round header
 * is one line, every column's Matches start level, every Match sits level with the middle of the two that
 * feed it, and nothing runs off the screen. A Bye's place in the first Round has no Match, so its empty
 * slot is measured instead. Measured at Start and after the final, when winners' names fill later Rounds,
 * on a 16:9 TV and on a narrower one.
 */

const findMiddle = async (slot: Locator): Promise<number> => {
	// A Match's box when its slot has one, else the empty slot of a Bye.
	const box = (await slot.locator('> *').count()) > 0 ? slot.locator('> *') : slot;
	const { y, height } = (await box.boundingBox())!;
	return y + height / 2;
};

// Each list's slots, the Bye places included, in the order the columns appear across the screen.
const listColumns = async (tv: Page, rounds: number) => {
	const listRound = (round: number) =>
		tv.getByRole('list', { name: round === rounds ? 'Final' : `Round ${round}` });
	const columns: { round: number; side: 'left' | 'right'; slots: Locator[] }[] = [];
	for (let round = 1; round < rounds; round++) {
		const [left, right] = await listRound(round).all();
		columns.push({ round, side: 'left', slots: await left.locator('> li').all() });
		columns.push({ round, side: 'right', slots: await right.locator('> li').all() });
	}
	return { columns, final: await listRound(rounds).locator('> li').all() };
};

/*
 * Makes the same Draw every run: the Organizer's Draw shuffles with Math.random, replaced here by a seeded
 * stand-in (mulberry32), so the widths that once squeezed a column come back each time.
 */
const seedDraw = async (context: BrowserContext) => {
	await context.addInitScript(() => {
		let seed = 1;
		Math.random = () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	});
};

const startTournament = async (page: Page, players: number) => {
	await page.goto(`/?players=${players}&boards=${Math.ceil(players / 2)}`);
	await page.getByRole('button', { name: 'Make the Draw' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
};

/*
 * Every Match goes to its first-named Player, the first on the list each time, until there is a champion.
 * Found by its place in the list, not its Players, since any Match will do.
 */
const playToFinal = async (page: Page) => {
	const winnerButton = page.getByRole('list', { name: 'Matches' }).getByRole('button').first();
	while ((await winnerButton.count()) > 0) {
		await winnerButton.click();
	}
};

/*
 * Once finished, the TV opens on the champion. A second per screen moves it on to the Winners Bracket, and a
 * long one then holds it there, since a new time restarts the screen shown.
 */
const showFinishedBracket = async (organizer: Page, tv: Page) => {
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	await secondsInput.fill('1');
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await secondsInput.fill('600');
};

for (const { players, rounds } of [
	{ players: 21, rounds: 5 },
	{ players: 32, rounds: 5 },
	{ players: 5, rounds: 3 },
]) {
	for (const isFinished of [false, true]) {
		for (const tvSize of [
			{ width: 1920, height: 1080 },
			{ width: 1258, height: 955 },
		]) {
			test(`with ${players} Players ${isFinished ? 'after the final' : 'at Start'} on a ${tvSize.width}×${tvSize.height} TV, the bracket lines up, all on screen`, async ({
				context,
				page: organizer,
			}) => {
				await seedDraw(context);
				await startTournament(organizer, players);
				if (isFinished) {
					await playToFinal(organizer);
				}
				const tv = await context.newPage();
				await tv.setViewportSize(tvSize);
				await tv.goto('/display');
				if (isFinished) {
					await showFinishedBracket(organizer, tv);
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

				const { columns, final } = await listColumns(tv, rounds);
				const lists = await tv.locator('section > ul').all();
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

				for (const column of await tv.locator('section').all()) {
					const { x, width } = (await column.boundingBox())!;
					expect(x + width, 'a column runs off the right of the TV').toBeLessThanOrEqual(
						tvSize.width,
					);
				}
				const slots = [...columns.flatMap((c) => c.slots), ...final];
				for (const box of await Promise.all(
					slots.map((slot) => slot.locator('> *').all()),
				)) {
					for (const match of box) {
						const { x, y, width, height } = (await match.boundingBox())!;
						expect(
							y + height,
							'a Match runs off the bottom of the TV',
						).toBeLessThanOrEqual(tvSize.height);
						expect(
							x + width,
							'a Match runs off the right of the TV',
						).toBeLessThanOrEqual(tvSize.width);
					}
				}
			});
		}
	}
}

import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * The Winners Bracket's layout on a 1920×1080 TV, measured from where the browser drew each Match: every
 * Match sits level with the middle of the two that feed it, and nothing runs off the screen. A Bye's place
 * in the first Round has no Match, so its empty slot is measured instead.
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

const startNight = async (page: Page, players: number) => {
	await page.goto(`/?players=${players}&boards=${Math.ceil(players / 2)}`);
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Make the Draw' }).click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
};

for (const { players, rounds } of [
	{ players: 21, rounds: 5 },
	{ players: 32, rounds: 5 },
	{ players: 5, rounds: 3 },
]) {
	test(`with ${players} Players, every Match sits level with the middle of the two that feed it, all on screen`, async ({
		context,
		page: organizer,
	}) => {
		await startNight(organizer, players);
		const tv = await context.newPage();
		await tv.setViewportSize({ width: 1920, height: 1080 });
		await tv.goto('/display');
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();

		const { columns, final } = await listColumns(tv, rounds);
		const findColumn = (round: number, side: 'left' | 'right') =>
			columns.find((c) => c.round === round && c.side === side)!.slots;
		for (const { round, side, slots } of columns.filter((c) => c.round > 1)) {
			const feeders = findColumn(round - 1, side);
			for (const [i, slot] of slots.entries()) {
				const [a, b] = [
					await findMiddle(feeders[2 * i]),
					await findMiddle(feeders[2 * i + 1]),
				];
				expect(
					Math.abs((await findMiddle(slot)) - (a + b) / 2),
					`Round ${round}, ${side} half, Match ${i + 1}`,
				).toBeLessThan(2);
			}
		}
		const [left, right] = [
			findColumn(rounds - 1, 'left')[0],
			findColumn(rounds - 1, 'right')[0],
		];
		const middle = ((await findMiddle(left)) + (await findMiddle(right))) / 2;
		expect(Math.abs((await findMiddle(final[0])) - middle), 'the final').toBeLessThan(2);

		for (const { slots } of columns) {
			for (const box of await Promise.all(slots.map((slot) => slot.locator('> *').all()))) {
				for (const match of box) {
					const { y, height } = (await match.boundingBox())!;
					expect(y + height, 'a Match runs off the bottom of the TV').toBeLessThanOrEqual(
						1080,
					);
				}
			}
		}
	});
}

import { expect, test, type Locator, type Page } from '@playwright/test';
import { holdScreen, playToFinal, seedDraw, startTournament } from './setUpTournament';

/*
 * The TV's countdown ring sits in a corner, clear of every card: measured from where the browser drew it
 * and each Match or Now playing card, with a full 32-place bracket, on a 16:9 TV and on a narrower one.
 */

type Box = { x: number; y: number; width: number; height: number };

const isOverlapping = (a: Box, b: Box) =>
	a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const expectClearOfRing = async (tv: Page, cards: Locator) => {
	const ring = (await tv.getByTestId('countdown ring').boundingBox())!;
	const boxes = await cards.evaluateAll((elements) =>
		elements.map((element) => element.getBoundingClientRect().toJSON() as Box),
	);
	expect(boxes.length, 'no cards to measure').toBeGreaterThan(0);
	for (const [i, box] of boxes.entries()) {
		expect(isOverlapping(ring, box), `the ring covers card ${i + 1}`).toBe(false);
	}
};

const openTv = async (organizer: Page, tvSize: { width: number; height: number }) => {
	const tv = await organizer.context().newPage();
	await tv.setViewportSize(tvSize);
	await tv.goto('/display');
	return tv;
};

/*
 * Each Match's slot on the Winners Bracket, found by its Round's list as the TV reads it out. A slot holds its
 * Match card and is at least as large, so a slot clear of the ring means a card clear of it. A Bye's empty
 * place is hidden, so it isn't found.
 */
const findBracketSlots = (tv: Page) =>
	tv.getByRole('list', { name: /^(Round \d+|Final)$/ }).getByRole('listitem');

for (const tvSize of [
	{ width: 1920, height: 1080 },
	{ width: 1258, height: 955 },
]) {
	test.describe(`on a ${tvSize.width}×${tvSize.height} TV with 32 Players`, () => {
		test.beforeEach(async ({ context, page: organizer }) => {
			await seedDraw(context);
			await startTournament(organizer, 32);
		});

		test('the ring covers no Match on the Winners Bracket or card on Now playing at Start', async ({
			page: organizer,
		}) => {
			const tv = await openTv(organizer, tvSize);

			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expectClearOfRing(tv, findBracketSlots(tv));

			await holdScreen(organizer, tv, 'Now playing');
			const cards = tv.getByRole('list', { name: 'Matches' }).getByRole('listitem');
			await expectClearOfRing(tv, cards);
		});

		test('the ring covers no Match on the finished Winners Bracket', async ({
			page: organizer,
		}) => {
			await playToFinal(organizer);
			const tv = await openTv(organizer, tvSize);

			await holdScreen(organizer, tv, 'Winners Bracket');
			await expectClearOfRing(tv, findBracketSlots(tv));
		});
	});
}

import { expect, type Locator, type Page } from '@playwright/test';
import {
	parkCycleOn,
	openTv,
	playFirstMatchesWithLosersStaying,
	playToFinal,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';

/*
 * The TV's countdown ring sits in a corner, clear of every card: measured from where the
 * browser drew it and each Match card, with a full 32-place bracket, on a 16:9 TV and on a
 * narrower one. The ring shows only while the TV has two screens to cycle: once the Losers
 * Bracket is drawn, or once finished.
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

/*
 * Each Match's slot on the Winners Bracket, found by its Round's list as the TV reads it out. A
 * slot holds its Match card and is at least as large, so a slot clear of the ring means a card
 * clear of it. A Bye's empty place is hidden, so it isn't found.
 */
const findBracketSlots = (tv: Page) =>
	tv.getByRole('list', { name: /^(Round \d+|Final)$/ }).getByRole('listitem');

for (const tvSize of tvSizes) {
	test.describe(`on a ${tvSize.width}×${tvSize.height} TV with 32 Players`, () => {
		test.beforeEach(async ({ page: organizer }) => {
			await startTournament(organizer, { players: 32 });
		});

		test('the ring covers no Match on the Winners Bracket once the Losers Bracket is drawn', async ({
			page: organizer,
		}) => {
			// 32 Players open 16 first Matches; the Losers Bracket is drawn once all are played.
			await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount: 16 });
			const tv = await openTv(organizer, tvSize);

			/*
			 * The TV picks up Auto's cycle where the clock has it, which may be the Losers
			 * Bracket by the time it opens, so the cycle is moved on to the Winners
			 * Bracket and parked there.
			 */
			await parkCycleOn(organizer, tv, 'Winners Bracket');
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectClearOfRing(tv, findBracketSlots(tv));
		});

		test('the ring covers no Match on the finished Winners Bracket', async ({
			page: organizer,
		}) => {
			await playToFinal(organizer);
			const tv = await openTv(organizer, tvSize);

			await parkCycleOn(organizer, tv, 'Winners Bracket');
			await expectClearOfRing(tv, findBracketSlots(tv));
		});
	});
}

/*
 * How far the ring has filled, from 0 (empty) to 1 (full), and the animation the browser plays on
 * it. Read from the browser's computed style, since jsdom plays no animations: a line of the ring's
 * CSS the browser rejects drops the whole animation.
 */
const readRingFill = async (tv: Page) => {
	const filling = tv.getByTestId('countdown ring filling');
	const computed = await filling.evaluate((circle) => {
		const style = getComputedStyle(circle);
		return { animationName: style.animationName, dashOffset: style.strokeDashoffset };
	});
	// The filling's dash offset runs from 1 (empty) down to 0 (full).
	return { animationName: computed.animationName, fill: 1 - parseFloat(computed.dashOffset) };
};

test('a TV reloaded halfway through a screen shows its ring half full', async ({
	page: organizer,
}) => {
	await startTournament(organizer, { players: 6 });
	// 6 Players open 3 first Matches; the Losers Bracket is drawn once all are played.
	await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount: 3 });
	const tv = await openTv(organizer, tvSizes[0]);
	// A new time starts the cycle again, so the screen's time is known from here.
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	await secondsInput.fill('10');
	await secondsInput.press('Enter');
	const halfAScreenMs = 5000;
	await tv.waitForTimeout(halfAScreenMs);

	await tv.reload();

	const ringFill = await readRingFill(tv);
	expect(ringFill.animationName).toBe('countdown');
	// Half full, give or take the reload's time.
	expect(ringFill.fill).toBeGreaterThan(0.3);
	expect(ringFill.fill).toBeLessThan(0.7);
});

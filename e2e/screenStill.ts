import { expect, type Locator } from '@playwright/test';

/*
 * Where each part sits on the page: every element each locator finds, in order, by its box. A locator that
 * finds many elements, such as every Match row, gives a box for each.
 */
const measureParts = async (parts: readonly Locator[]) => {
	const locatedParts = await Promise.all(parts.map((part) => part.all()));
	const elements = locatedParts.flat();
	return Promise.all(elements.map((element) => element.boundingBox()));
};

/*
 * Checks a change moves nothing on the screen: each part is measured, the change is made, and every part is
 * measured again in the same place and at the same size. It expects the change it is given to wait until the
 * change shows (a line appearing, a button pressed), and measures straight after. A part that comes or goes
 * counts as a move. Every part must be found and shown at first, so a check that finds nothing fails rather
 * than passing on nothing.
 */
export const expectNothingMoves = async (
	parts: readonly Locator[],
	change: () => Promise<void>,
) => {
	const before = await measureParts(parts);
	expect(before.length, 'every part found').toBeGreaterThan(0);
	expect(before, 'every part shown').not.toContain(null);
	await change();
	expect(await measureParts(parts)).toEqual(before);
};

import { expect, type Locator } from '@playwright/test';

/*
 * Where each part sits on the page: every element each locator finds, in order, by its box. A locator that
 * finds many elements, such as every Match row, gives a box for each.
 */
const measureParts = async (parts: readonly Locator[]) => {
	const elements = (await Promise.all(parts.map((part) => part.all()))).flat();
	return Promise.all(elements.map((element) => element.boundingBox()));
};

/*
 * Checks a change moves nothing on the screen: each part is measured, the change is made, and every part is
 * measured again in the same place and at the same size. The change waits until it shows (a line appearing, a
 * button pressed), so the second measuring sees it. A part that comes or goes counts as a move.
 */
export const expectNothingMoves = async (
	parts: readonly Locator[],
	change: () => Promise<void>,
) => {
	const before = await measureParts(parts);
	await change();
	expect(await measureParts(parts)).toEqual(before);
};

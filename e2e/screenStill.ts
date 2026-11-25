import { expect, type Locator, type Page } from '@playwright/test';

/*
 * Where each part sits on the page: how many elements each locator finds, and every element's box, in order.
 * A locator that finds many elements, such as every Match row, gives a box for each.
 */
const measureParts = async (parts: readonly Locator[]) => {
	const locatedParts = await Promise.all(parts.map((part) => part.all()));
	const elements = locatedParts.flat();
	const boxes = await Promise.all(elements.map((element) => element.boundingBox()));
	return { partCounts: locatedParts.map((found) => found.length), boxes };
};

/*
 * How far the page, and every area in it scrolled away from its start, is scrolled, each as "left,top", in the
 * page's order. An area at its start is left out, so a list that only grows long enough to scroll doesn't show
 * here: that is a move, which the parts' boxes catch.
 */
const measureScrolling = (page: Page) =>
	page.evaluate(() => {
		const scrolledAreas = [...document.querySelectorAll('*')].filter(
			(element) => element.scrollLeft !== 0 || element.scrollTop !== 0,
		);
		return [
			`page ${window.scrollX},${window.scrollY}`,
			...scrolledAreas.map((area) => `${area.tagName} ${area.scrollLeft},${area.scrollTop}`),
		];
	});

/*
 * Checks a change moves nothing on the screen: each part is measured, the change is made, and every part is
 * measured again in the same place and at the same size. It expects the change it is given to wait until the
 * change shows (a line appearing, a button pressed), and measures straight after. A part that comes or goes
 * counts as a move. Every part must be found and shown at first, so a check that finds nothing fails rather
 * than passing on nothing. A change that scrolls the page or an area, as a click on a part out of view does,
 * fails first, saying so, since every box below it moves: scroll that part into view before measuring.
 */
export const expectNothingMoves = async (
	parts: readonly Locator[],
	change: () => Promise<void>,
) => {
	const page = parts[0].page();
	const scrollingBefore = await measureScrolling(page);
	const before = await measureParts(parts);
	expect(before.partCounts, 'every part found').not.toContain(0);
	expect(before.boxes, 'every part shown').not.toContain(null);
	await change();
	expect(
		await measureScrolling(page),
		'the change scrolled: scroll the part it clicks into view before measuring',
	).toEqual(scrollingBefore);
	expect(await measureParts(parts)).toEqual(before);
};

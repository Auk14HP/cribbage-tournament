import { expect, type Page } from '@playwright/test';

/*
 * A TV that overscans crops the picture's edges, so the display route's content must sit inside a margin of
 * 5% of the screen's width and height on each side.
 */
const safeMargin = 0.05;

// A part of a pixel's leeway for where the browser rounds a box's edge.
const roundingLeeway = 0.5;

/*
 * Checks every element the TV drew, the countdown ring included, sits inside the safe area, and that the page
 * doesn't scroll. Measured from where the browser drew each element inside the display route's main, cut to
 * what its clipping ancestors show, so the hidden end of a name cut short doesn't count.
 */
export const expectInsideTvSafeArea = async (tv: Page) => {
	const { width, height, scrollHeight, boxes } = await tv.evaluate(() => {
		const findVisibleBox = (element: Element) => {
			const box = element.getBoundingClientRect();
			let [left, top, right, bottom] = [box.left, box.top, box.right, box.bottom];
			for (
				let ancestor = element.parentElement;
				ancestor;
				ancestor = ancestor.parentElement
			) {
				const style = getComputedStyle(ancestor);
				const ancestorBox = ancestor.getBoundingClientRect();
				if (style.overflowX !== 'visible') {
					[left, right] = [
						Math.max(left, ancestorBox.left),
						Math.min(right, ancestorBox.right),
					];
				}
				if (style.overflowY !== 'visible') {
					[top, bottom] = [
						Math.max(top, ancestorBox.top),
						Math.min(bottom, ancestorBox.bottom),
					];
				}
			}
			return { left, top, right, bottom };
		};
		return {
			width: window.innerWidth,
			height: window.innerHeight,
			scrollHeight: document.documentElement.scrollHeight,
			// Every element, not one found by its role or test ID: anything drawn may stray into a margin.
			boxes: [...document.querySelectorAll('main *')]
				.map((element) => ({
					elementHtml: element.outerHTML.slice(0, 80),
					box: findVisibleBox(element),
				}))
				.filter(({ box }) => box.right > box.left && box.bottom > box.top),
		};
	});
	expect(scrollHeight, 'the page scrolls').toBeLessThanOrEqual(height);
	expect(boxes.length, 'nothing drawn to measure').toBeGreaterThan(0);
	const [safeLeft, safeTop] = [
		width * safeMargin - roundingLeeway,
		height * safeMargin - roundingLeeway,
	];
	const [safeRight, safeBottom] = [width - safeLeft, height - safeTop];
	for (const { elementHtml, box } of boxes) {
		expect(box.left, `${elementHtml} is in the left margin`).toBeGreaterThanOrEqual(safeLeft);
		expect(box.top, `${elementHtml} is in the top margin`).toBeGreaterThanOrEqual(safeTop);
		expect(box.right, `${elementHtml} is in the right margin`).toBeLessThanOrEqual(safeRight);
		expect(box.bottom, `${elementHtml} is in the bottom margin`).toBeLessThanOrEqual(
			safeBottom,
		);
	}
};

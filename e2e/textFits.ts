import { expect, type Locator } from '@playwright/test';

/*
 * Checks every element a locator finds holds its text: none is narrower than what it
 * holds, as a seat is when a long name and its PICKED tag spill past its edge. Fails
 * naming each element's text. A name wrapping over two lines still fits, so it passes.
 */
export const expectTextFits = async (boxes: Locator) => {
	const overflowingTexts = await boxes.evaluateAll((elements) =>
		elements
			.filter((element) => element.scrollWidth > element.clientWidth)
			.map((element) => element.textContent),
	);
	expect(overflowingTexts, 'text wider than its box').toEqual([]);
};

/*
 * Of the buttons a locator finds, the one with the longest name,
 * such as the Player with the longest name among a list's seats.
 */
export const findLongestNamedButton = async (area: Locator) => {
	const buttons = area.getByRole('button');
	const names = await buttons.allTextContents();
	expect(names, 'buttons to choose from').not.toEqual([]);
	const longestName = names.reduce((longest, name) =>
		name.length > longest.length ? name : longest,
	);
	return area.getByRole('button', { name: longestName, exact: true });
};

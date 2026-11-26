import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import { showHouseRules, test } from './setUpTournament';

/*
 * Showing a House Rule on the TV, or hiding one, moves nothing on the House Rules step: the cards change tag and
 * look in place, and the main button's label changes in its own box. jsdom can't lay out a page, so this runs in
 * a real browser, in a narrow window too, where the longest House Rule wraps.
 */

/*
 * The parts of the House Rules step: the line counting the House Rules on the TV, every card, the text of each,
 * which would rewrap if its tag widened, the buttons below them, and Make the Draw beside them.
 */
const listHouseRulesParts = (page: Page) => {
	const cards = page.getByRole('list', { name: 'House Rules' }).getByRole('listitem');
	return [
		page.getByText(/^\d of 4 on the TV$/),
		cards,
		cards.getByText(/\.|\?/),
		page.getByRole('button', { name: 'Back', exact: true }),
		page.getByRole('button', { name: /^Show rule \d on the TV$|^Every rule is on the TV$/ }),
		page.getByRole('button', { name: 'Show all' }),
		page.getByRole('button', { name: 'Make the Draw' }),
	];
};

for (const viewport of [
	{ width: 1280, height: 800 },
	{ width: 900, height: 800 },
]) {
	test(`moves nothing as House Rules are shown and hidden, in a ${viewport.width}px window`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await page.goto('/?players=21&boards=8');
		await showHouseRules(page);
		const parts = listHouseRulesParts(page);
		const countLine = page.getByText(/^\d of 4 on the TV$/);

		// Each House Rule shown in turn: the first card goes from NEXT to ON THE TV, the second from none to NEXT.
		for (const ruleNumber of [1, 2, 3]) {
			await expectNothingMoves(parts, async () => {
				await page
					.getByRole('button', { name: `Show rule ${ruleNumber} on the TV` })
					.click();
				await expect(countLine).toHaveText(`${ruleNumber} of 4 on the TV`);
			});
		}
		// The last shown turns the main button into its disabled label; Back takes it back.
		await expectNothingMoves(parts, async () => {
			await page.getByRole('button', { name: 'Show rule 4 on the TV' }).click();
			await expect(countLine).toHaveText('4 of 4 on the TV');
		});
		await expectNothingMoves(parts, async () => {
			await page.getByRole('button', { name: 'Back', exact: true }).click();
			await expect(countLine).toHaveText('3 of 4 on the TV');
		});
	});
}

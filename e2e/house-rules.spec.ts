import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import { houseRules } from '../src/tournament/houseRules';
import { showHouseRules, test } from './setUpTournament';

/*
 * Showing a House Rule on the TV, or hiding one, moves nothing on the House Rules step: the cards change tag and
 * look in place, and the main button's label changes in its own box. jsdom can't lay out a page, so this runs in
 * a real browser, in a narrow window too, where the longest House Rule wraps.
 */

// The line counting the House Rules on the TV: "2 of 4 on the TV".
const findCountLine = (page: Page) => page.getByText(/^\d of 4 on the TV$/);

/*
 * The parts of the House Rules step: the line counting the House Rules on the TV, the list of cards, which holds
 * the change, every card, the text of each House Rule, which would rewrap if its tag widened, the row of buttons
 * below them and each button in it, and Make the Draw beside them.
 */
const listHouseRulesParts = (page: Page) => {
	const cardList = page.getByRole('list', { name: 'House Rules' });
	const showRuleButton = page.getByRole('button', {
		name: /^Show rule \d on the TV$|^Every rule is on the TV$/,
	});
	return [
		findCountLine(page),
		cardList,
		cardList.getByRole('listitem'),
		...houseRules.map((rule) => cardList.getByText(rule, { exact: true })),
		page.getByTestId('House Rules buttons'),
		page.getByRole('button', { name: 'Back', exact: true }),
		showRuleButton,
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
		const countLine = findCountLine(page);

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

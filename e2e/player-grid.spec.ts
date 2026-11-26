import { expect, type Page } from '@playwright/test';
import { expectNothingMoves, expectTextStays } from './screenStill';
import { test } from './setUpTournament';
import { expectTextFits } from './textFits';

/*
 * The registration screen's Players grid, in a real browser, since jsdom can't lay out a page: a typical field
 * fits without scrolling, renaming a Player happens in their own cell and moves no other, and the Home Board tag
 * fits beside the longest name.
 */

test.use({ viewport: { width: 1280, height: 720 } });

// The longest name in the test Tournament's first 30 Players.
const longestName = 'Frank the Tank';

const findPlayersGrid = (page: Page) => page.getByRole('list', { name: 'Players' });

// Gives the Player named a Home Board on the Board given, picked from the Boards panel.
const giveHomeBoard = async (page: Page, { name, board }: { name: string; board: string }) => {
	await page.getByRole('combobox', { name: 'Board', exact: true }).selectOption(board);
	await page.getByLabel('Home Board for').selectOption(name);
};

/*
 * The parts of the registration screen around the grid: the Players' refusal line, found by its place as the
 * first on the page, the name box, Register, the running count, and every Player's cell.
 */
const listRegistrationParts = (page: Page) => [
	page.getByRole('alert').first(),
	page.getByLabel('Player name'),
	page.getByRole('button', { name: 'Register' }),
	page.getByText('30 Players registered'),
	findPlayersGrid(page).getByRole('listitem'),
];

test.beforeEach(async ({ page }) => {
	await page.goto('/?players=30&boards=15');
});

test.describe('in a common laptop window', () => {
	// A 1280 by 720 window holds 8 rows of 3 Players; a laptop's usual 1440 by 900 holds a field of 30.
	test.use({ viewport: { width: 1440, height: 900 } });

	test('fits a field of 30 Players in the grid without scrolling', async ({ page }) => {
		const grid = findPlayersGrid(page);

		const isScrollable = await grid.evaluate(
			(element) => element.scrollHeight > element.clientHeight,
		);

		expect(isScrollable).toBe(false);
	});
});

test('moves no cell in the grid as a Player is renamed, cancelled, refused or saved', async ({
	page,
}) => {
	await giveHomeBoard(page, { name: longestName, board: '3' });
	const parts = listRegistrationParts(page);
	const newNameBox = page.getByLabel(`New name for ${longestName}`, { exact: true });

	await expectNothingMoves(parts, async () => {
		await page.getByRole('button', { name: `Rename ${longestName}` }).click();
		await expect(newNameBox).toBeFocused();
	});
	await expectNothingMoves(parts, async () => {
		await newNameBox.press('Escape');
		await expect(newNameBox).toBeHidden();
	});
	const firstRefusalLine = page.getByRole('alert').first();
	await page.getByRole('button', { name: 'Rename Sue' }).click();
	const sueNameBox = page.getByLabel('New name for Sue', { exact: true });
	// A name already taken is refused, its reason shown on the line kept for it above the grid.
	await expectNothingMoves(parts, async () => {
		await sueNameBox.fill('Joe');
		await sueNameBox.press('Enter');
		await expect(firstRefusalLine).toHaveText('There is already a Player called "Joe".');
	});
	await expectNothingMoves(parts, async () => {
		await sueNameBox.fill('Susan');
		await page.getByRole('button', { name: 'Save new name for Sue' }).click();
		await expect(page.getByRole('button', { name: 'Rename Susan' })).toBeVisible();
	});
});

// Checks the Player's name, once Rename is clicked, shows in the name box where and as it was drawn.
const expectNameStaysOnRename = async (page: Page, name: string) => {
	const text = {
		before: findPlayersGrid(page).getByText(name, { exact: true }),
		after: page.getByLabel(`New name for ${name}`, { exact: true }),
	};

	await expectTextStays(text, async () => {
		await page.getByRole('button', { name: `Rename ${name}` }).click();
		await expect(text.after).toBeFocused();
	});
};

test('keeps a Player’s name in place as it becomes the name box', async ({ page }) => {
	await expectNameStaysOnRename(page, 'Sue');
});

test('keeps a name in place as it becomes the name box, its Home Board tag on the line below', async ({
	page,
}) => {
	// The longest name leaves no room beside it for its tag, which drops to a second line.
	await giveHomeBoard(page, { name: longestName, board: '3' });

	await expectNameStaysOnRename(page, longestName);
});

test('fits the Home Board tag beside the longest name', async ({ page }) => {
	await giveHomeBoard(page, { name: longestName, board: '3' });

	await expect(page.getByText('Home Board 3')).toBeVisible();
	await expectTextFits(findPlayersGrid(page).getByRole('listitem'));
});

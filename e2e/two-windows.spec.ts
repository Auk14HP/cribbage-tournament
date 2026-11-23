import { expect, type Page } from '@playwright/test';
import { confirmDraw, findMatchesOnBoards, test } from './setUpTournament';

/*
 * The Organizer's window and the TV's window share one browser session (and so one local storage),
 * as they do on the laptop. Every change on the organizer route must reach the TV without a refresh.
 */

// Collects console errors (failed requests, React warnings) so the test fails on them.
const watchConsole = (page: Page, errors: string[]) => {
	page.on('console', (message) => {
		if (message.type() === 'error') {
			errors.push(`${page.url()}: ${message.text()}`);
		}
	});
	page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
};

const register = async (organizer: Page, name: string) => {
	await organizer.getByLabel('Player name').fill(name);
	await organizer.getByLabel('Player name').press('Enter');
};

test('the TV shows each change the Organizer makes, live, and both windows resume after a reload', async ({
	context,
	page: organizer,
}) => {
	const consoleErrors: string[] = [];
	watchConsole(organizer, consoleErrors);
	await organizer.goto('/');
	const tv = await context.newPage();
	watchConsole(tv, consoleErrors);
	await tv.goto('/display');
	const tvNames = tv.getByRole('listitem');

	await register(organizer, 'Dave K');
	await register(organizer, 'Big Dave');
	await register(organizer, 'Sue');
	await expect(tv.getByText('3 Players registered')).toBeVisible();
	await expect(tvNames).toHaveText(['Dave K', 'Big Dave', 'Sue']);

	await organizer
		.getByRole('listitem')
		.filter({ hasText: 'Dave K' })
		.getByRole('button', { name: 'Rename' })
		.click();
	await organizer.getByLabel('New name for Dave K').fill('Dave K.');
	await organizer.getByLabel('New name for Dave K').press('Enter');
	await expect(tvNames).toHaveText(['Dave K.', 'Big Dave', 'Sue']);

	await organizer
		.getByRole('listitem')
		.filter({ hasText: 'Sue' })
		.getByRole('button', { name: 'Remove' })
		.click();
	await expect(tvNames).toHaveText(['Dave K.', 'Big Dave']);

	await organizer.reload();
	await tv.reload();
	await expect(organizer.getByRole('listitem')).toHaveCount(2);
	await expect(tvNames).toHaveText(['Dave K.', 'Big Dave']);

	await organizer.getByRole('button', { name: 'Start a new Tournament' }).click();
	await organizer
		.getByRole('dialog')
		.getByRole('button', { name: 'Start a new Tournament' })
		.click();
	await expect(tv.getByText('0 Players registered')).toBeVisible();
	await expect(tvNames).toHaveCount(0);

	expect(consoleErrors).toEqual([]);
});

test('the TV holds Tonight’s Draw from the moment the Draw is made until the Organizer presses Start', async ({
	context,
	page: organizer,
}) => {
	const consoleErrors: string[] = [];
	watchConsole(organizer, consoleErrors);
	await organizer.goto('/');
	const tv = await context.newPage();
	watchConsole(tv, consoleErrors);
	await tv.goto('/display');

	for (const name of ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Marge']) {
		await register(organizer, name);
	}
	await organizer.getByLabel('Number of Boards').fill('3');
	await confirmDraw(organizer);

	/*
	 * 6 Players, Tonight's Draw shown as the Winners Bracket: two first-Round Matches, and in Round 2 a
	 * Match between the two Bye Players, on Boards 1 to 3.
	 */
	await expect(tv.getByRole('heading', { name: 'Tonight’s Draw' })).toBeVisible();
	const roundOneCards = tv.getByRole('list', { name: 'Round 1' }).getByTestId('match card');
	const roundTwoCards = tv.getByRole('list', { name: 'Round 2' }).getByTestId('match card');
	await expect(roundOneCards).toHaveCount(2);
	await expect(roundTwoCards.filter({ hasText: /^Board \d+/ })).toHaveCount(1);
	await expect(tv.getByTestId('match card').getByText(/^Board \d+$/)).toHaveCount(3);
	for (const board of ['Board 1', 'Board 2', 'Board 3']) {
		await expect(tv.getByText(board, { exact: true })).toBeVisible();
	}

	await tv.reload();
	await expect(tv.getByRole('heading', { name: 'Tonight’s Draw' })).toBeVisible();

	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(tv.getByRole('heading', { name: 'Winners Bracket' })).toBeVisible();

	expect(consoleErrors).toEqual([]);
});

test('each winner the Organizer records reaches the TV’s Winners Bracket, through to the champion screen', async ({
	context,
	page: organizer,
}) => {
	const consoleErrors: string[] = [];
	watchConsole(organizer, consoleErrors);
	await organizer.goto('/');
	const tv = await context.newPage();
	watchConsole(tv, consoleErrors);
	await tv.goto('/display');

	for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
		await register(organizer, name);
	}
	await organizer.getByLabel('Number of Boards').fill('2');
	await confirmDraw(organizer);
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();

	// 3 Players: one first-Round Match, and a Bye Player waiting in the final for its winner.
	const matches = findMatchesOnBoards(organizer).getByRole('listitem');
	const tvFinal = tv.getByRole('list', { name: 'Final' }).getByRole('listitem');
	await expect(tvFinal).toContainText('—');
	const winner = await matches.first().getByRole('button').first().textContent();
	await matches.first().getByRole('button', { name: winner! }).click();
	// With the loser leaving, there is no Losers Bracket, and the final is the last Match.
	await organizer.getByRole('dialog').getByRole('button', { name: 'Leaving' }).click();
	await expect(tvFinal).toContainText(winner!);
	await expect(tvFinal).not.toContainText('—');

	await matches.first().getByRole('button', { name: winner! }).click();
	const championHeading = tv.getByRole('heading', { name: 'Tonight’s Champion' });
	await expect(championHeading).toBeVisible();
	await expect(tv.getByText(winner!, { exact: true })).toBeVisible();

	await tv.reload();
	await expect(championHeading).toBeVisible();
	await expect(tv.getByText(winner!, { exact: true })).toBeVisible();

	expect(consoleErrors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

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

	organizer.once('dialog', (dialog) => dialog.accept());
	await organizer.getByRole('button', { name: 'Start a new Tournament' }).click();
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
	organizer.once('dialog', (dialog) => dialog.accept());
	await organizer.getByRole('button', { name: 'Make the Draw' }).click();

	// 6 Players: two first-Round Matches and a Match between the two Bye Players, on Boards 1 to 3.
	await expect(tv.getByRole('heading', { name: 'Tonight’s Draw' })).toBeVisible();
	const tvMatches = tv.getByRole('list', { name: 'Matches' }).getByRole('listitem');
	await expect(tvMatches).toHaveCount(3);
	await expect(tvMatches.nth(0)).toContainText('Board 1');
	await expect(tvMatches.nth(1)).toContainText('Board 2');
	await expect(tvMatches.nth(2)).toContainText('Board 3');

	await tv.reload();
	await expect(tv.getByRole('heading', { name: 'Tonight’s Draw' })).toBeVisible();

	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(tv.getByRole('heading', { name: 'Winners Bracket' })).toBeVisible();

	expect(consoleErrors).toEqual([]);
});

test('each winner the Organizer records reaches the TV’s Winners Bracket, through to the champion', async ({
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
	organizer.once('dialog', (dialog) => dialog.accept());
	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();

	// 3 Players: one first-Round Match, and a Bye Player waiting in the final for its winner.
	const matches = organizer.getByRole('list', { name: 'Matches' }).getByRole('listitem');
	const tvFinal = tv.getByRole('list', { name: 'Final' }).getByRole('listitem');
	await expect(tvFinal).toContainText('—');
	const winner = await matches.first().getByRole('button').first().textContent();
	await matches.first().getByRole('button', { name: winner! }).click();
	await expect(tvFinal).toContainText(winner!);
	await expect(tvFinal).not.toContainText('—');

	await matches.first().getByRole('button', { name: winner! }).click();
	await expect(tv.getByText(`Champion: ${winner}`)).toBeVisible();

	await tv.reload();
	await expect(tv.getByText(`Champion: ${winner}`)).toBeVisible();

	expect(consoleErrors).toEqual([]);
});

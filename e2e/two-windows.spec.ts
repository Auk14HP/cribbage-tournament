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

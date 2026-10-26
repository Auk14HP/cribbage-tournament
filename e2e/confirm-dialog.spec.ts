import { expect, test } from '@playwright/test';

/*
 * The app's confirmation dialog, in a real browser: jsdom has no modal dialogs, so Escape and where
 * focus goes are checked here. The route tests cover what Cancel and confirming do to the Tournament.
 */
test('Start a new Tournament asks first: Escape and Cancel keep the Tournament, and focus moves into the dialog and back', async ({
	page,
}) => {
	await page.goto('/');
	await page.getByLabel('Player name').fill('Dave K.');
	await page.getByLabel('Player name').press('Enter');
	const opener = page.getByRole('button', { name: 'Start a new Tournament' });
	const dialog = page.getByRole('dialog');

	await opener.click();
	await expect(dialog).toContainText(
		'Start a new Tournament? Every Player, Board and the Draw will be cleared.',
	);
	await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();
	await expect(page.getByRole('listitem')).toContainText(['Dave K.']);

	await opener.click();
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();
	await expect(page.getByRole('listitem')).toContainText(['Dave K.']);

	await opener.click();
	await dialog.getByRole('button', { name: 'Start a new Tournament' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('listitem')).toHaveCount(0);
	await expect(page.getByLabel('Player name')).toBeFocused();
});

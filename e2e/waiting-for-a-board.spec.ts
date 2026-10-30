import { expect, test, type Page } from '@playwright/test';

/*
 * The most a 32-place bracket can ask of the TV: four rows of Matches on 13 Boards and three more waiting.
 * The whole Waiting for a Board list stays on screen, on Tonight's Draw and on Now playing.
 */
const expectWaitingOnScreen = async (tv: Page) => {
	const waiting = tv.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem');
	await expect(waiting).toHaveCount(3);
	const lastEntry = await waiting.last().boundingBox();
	expect(lastEntry!.y + lastEntry!.height).toBeLessThanOrEqual(1080);
};

test('Waiting for a Board stays on the TV at 32 Players on 13 Boards', async ({
	context,
	page: organizer,
}) => {
	await organizer.goto('/?players=32&boards=13');
	const tv = await context.newPage();
	await tv.setViewportSize({ width: 1920, height: 1080 });
	await tv.goto('/display');

	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await organizer.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
	await expectWaitingOnScreen(tv);

	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await organizer.getByLabel('Seconds per TV screen').fill('1');
	await tv.getByRole('heading', { name: 'Now playing' }).waitFor();
	await expectWaitingOnScreen(tv);
});

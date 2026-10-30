import { expect, test, type Page } from '@playwright/test';
import { holdScreen } from './setUpTournament';

/*
 * The fields that ask most of the TV at each size Now playing can take: the whole Waiting for a Board list
 * stays on screen, on Tonight's Draw and on Now playing, and the page doesn't outgrow it.
 */
const expectWaitingOnScreen = async (tv: Page, waitingMatches: number) => {
	const waiting = tv.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem');
	await expect(waiting).toHaveCount(waitingMatches);
	const lastEntry = await waiting.last().boundingBox();
	expect(lastEntry!.y + lastEntry!.height).toBeLessThanOrEqual(1080);
	const pageHeight = await tv.evaluate(() => document.documentElement.scrollHeight);
	expect(pageHeight).toBeLessThanOrEqual(1080);
};

for (const boards of [2, 5, 6, 7, 13]) {
	test(`Waiting for a Board stays on the TV at 32 Players on ${boards} Boards`, async ({
		context,
		page: organizer,
	}) => {
		await organizer.goto(`/?players=32&boards=${boards}`);
		const tv = await context.newPage();
		await tv.setViewportSize({ width: 1920, height: 1080 });
		await tv.goto('/display');

		await organizer.getByRole('button', { name: 'Make the Draw' }).click();
		await organizer.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
		await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
		await expectWaitingOnScreen(tv, 16 - boards);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await holdScreen(organizer, tv, 'Now playing');
		await expectWaitingOnScreen(tv, 16 - boards);
	});
}

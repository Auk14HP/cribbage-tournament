import { expect, test, type Page } from '@playwright/test';
import { holdScreen } from './setUpTournament';

/*
 * The fields that ask most of the TV at each size Now playing can take: the whole Waiting for a Board list
 * stays on screen, on Tonight's Draw and on Now playing, and the page doesn't outgrow it.
 */
const expectWaitingOnScreen = async (tv: Page, waitingMatchCount: number) => {
	const waiting = tv.getByRole('list', { name: 'Waiting for a Board' }).getByRole('listitem');
	await expect(waiting).toHaveCount(waitingMatchCount);
	const lastEntry = await waiting.last().boundingBox();
	expect(lastEntry!.y + lastEntry!.height).toBeLessThanOrEqual(1080);
	const pageHeight = await tv.evaluate(() => document.documentElement.scrollHeight);
	expect(pageHeight).toBeLessThanOrEqual(1080);
};

// 32 Players open 16 Matches, and those without a Board wait for one.
const openingMatches = 16;
const waitingAtThirteenBoards = openingMatches - 13;

for (const boards of [2, 5, 6, 7, 13]) {
	const waitingMatchCount = openingMatches - boards;
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
		await expectWaitingOnScreen(tv, waitingMatchCount);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await holdScreen(organizer, tv, 'Now playing');
		await expectWaitingOnScreen(tv, waitingMatchCount);
	});
}

test('Long names stay on one line on Tonight’s Draw', async ({ context, page: organizer }) => {
	// 32 Players on 13 Boards leaves no slack, so one name wrapping would push the page past the TV.
	await organizer.goto('/?players=0&boards=13');
	const tv = await context.newPage();
	await tv.setViewportSize({ width: 1920, height: 1080 });
	await tv.goto('/display');
	const playerName = organizer.getByLabel('Player name');
	for (let player = 1; player <= 32; player++) {
		await playerName.fill(`Bartholomew Featherstonehaugh ${player}`);
		await playerName.press('Enter');
	}

	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await organizer.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();

	await expectWaitingOnScreen(tv, waitingAtThirteenBoards);
});

import { test } from '@playwright/test';

/*
 * Not a test: screenshots of both routes for a Tournament of any size, set up through the test Tournament URL.
 *   PLAYERS=29 BOARDS=16 npm run screens    registration
 *   ... DRAW=1                              and Tonight's Draw
 *   ... DRAW=1 START=1                      and after Start
 *   ... DRAW=1 START=1 RESULTS=12           and after 12 Match results are recorded (RESULTS=all: to the champion)
 * Writes test-results/screens/{organizer,tv}-{registration,draw,started,results}.png: the organizer at
 * 1280×720, the TV at 1920×1080.
 */
const players = process.env.PLAYERS ?? '26';
const boards = process.env.BOARDS ?? '16';

test('screens', async ({ context, page: organizer }) => {
	await organizer.setViewportSize({ width: 1280, height: 720 });
	await organizer.goto(`/?players=${players}&boards=${boards}`);
	const tv = await context.newPage();
	await tv.setViewportSize({ width: 1920, height: 1080 });
	await tv.goto('/display');

	const shoot = async (moment: string) => {
		await organizer.screenshot({ path: `test-results/screens/organizer-${moment}.png` });
		await tv.screenshot({ path: `test-results/screens/tv-${moment}.png` });
	};

	await shoot('registration');
	if (!process.env.DRAW) {
		return;
	}
	organizer.once('dialog', (dialog) => dialog.accept());
	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
	await shoot('draw');
	if (!process.env.START) {
		return;
	}
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await shoot('started');
	if (!process.env.RESULTS) {
		return;
	}
	// The first Match on the list that can be won goes to its first-named Player each time.
	const results = process.env.RESULTS === 'all' ? Infinity : Number(process.env.RESULTS);
	const first = organizer.getByRole('list', { name: 'Matches' }).getByRole('button').first();
	for (let recorded = 0; recorded < results && (await first.count()) > 0; recorded++) {
		await first.click();
	}
	await shoot('results');
});

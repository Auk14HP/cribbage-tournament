import { test } from '@playwright/test';
import { answerStayingIfAsked } from '../e2e/setUpTournament';

/*
 * Not a test: screenshots of both routes for a Tournament of any size, set up through the test Tournament URL.
 *   PLAYERS=29 BOARDS=16 npm run screens    registration
 *   ... DRAW=1                              and Tonight's Draw
 *   ... DRAW=1 START=1                      and after Start, then Now playing
 *   ... DRAW=1 START=1 RESULTS=12           and after 12 Match results are recorded (RESULTS=all: to the champion)
 *   ... DRAW=1 START=1 RESULTS=3 FORFEIT=1  and the Forfeit dialog, then after that Forfeit
 * Writes test-results/screens/{organizer,tv}-{registration,draw,started,now-playing,results,losers-bracket,results-now-playing,champion,forfeit-dialog,
 * forfeit}.png: the organizer at
 * 1280×720, the TV at 1920×1080.
 */
const players = process.env.PLAYERS ?? '26';
const boards = process.env.BOARDS ?? '16';

test('screens', async ({ context, page: organizer }) => {
	// Recording many results, each waiting on the TV, takes longer than a test's usual 30 seconds.
	test.setTimeout(120_000);
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
	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await organizer.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
	await shoot('draw');
	if (!process.env.START) {
		return;
	}
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await shoot('started');
	// Each screen for 1 second, so the TV soon moves on to Now playing.
	await organizer.getByLabel('Seconds per TV screen').fill('1');
	await tv.getByRole('heading', { name: 'Now playing' }).waitFor();
	await shoot('now-playing');
	if (!process.env.RESULTS) {
		return;
	}
	// The first Match on the list that can be won goes to its first-named Player each time.
	const results = process.env.RESULTS === 'all' ? Infinity : Number(process.env.RESULTS);
	const nextWinnerButton = organizer
		.getByRole('list', { name: 'Matches' })
		.getByRole('button')
		.first();
	// Each Player losing their first Match stays, so the Losers Bracket is played too.
	for (let recorded = 0; recorded < results && (await nextWinnerButton.count()) > 0; recorded++) {
		await nextWinnerButton.click();
		await answerStayingIfAsked(organizer, 'Staying');
	}
	// The TV cycles each second, so wait for the screen to shoot: the bracket, then the champion once finished.
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await shoot('results');
	// With a Losers Bracket drawn, its screen, then Now playing with any Matches waiting for a Board beneath.
	const losersHeading = tv.getByRole('heading', { name: 'Losers Bracket' });
	const isLosersBracketShown = await losersHeading.waitFor({ timeout: 5000 }).then(
		() => true,
		() => false,
	);
	if (isLosersBracketShown && (await nextWinnerButton.count()) > 0) {
		await shoot('losers-bracket');
		await tv.getByRole('heading', { name: 'Now playing' }).waitFor();
		await shoot('results-now-playing');
	}
	if ((await nextWinnerButton.count()) === 0) {
		await tv.getByRole('heading', { name: /^Tonight’s Champions?$/ }).waitFor();
		await shoot('champion');
	}
	if (!process.env.FORFEIT || (await nextWinnerButton.count()) === 0) {
		return;
	}
	// The first Match on the list that can be won is forfeited by its first-named Player.
	const leaver = await nextWinnerButton.textContent();
	const forfeitButton = organizer
		.getByRole('list', { name: 'Matches' })
		.getByRole('button', { name: 'Forfeit' })
		.first();
	await forfeitButton.click();
	await shoot('forfeit-dialog');
	await organizer.getByRole('dialog').getByRole('button', { name: leaver! }).click();
	await answerStayingIfAsked(organizer, 'Staying');
	await shoot('forfeit');
});

import { expect, type Locator } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDrawFromHouseRules,
	findMatchesOnBoards,
	showHouseRules,
	test,
} from '../e2e/setUpTournament';

// Whether the element shows within the time, rather than failing the run when it doesn't.
const isShownWithin = async (element: Locator, timeout: number) => {
	try {
		await element.waitFor({ timeout });
		return true;
	} catch {
		return false;
	}
};

/*
 * Not a test: screenshots of both routes for a Tournament of any size, set up through the test Tournament URL.
 * Before running it, read the run-app skill (.claude/skills/run-app/SKILL.md) for how to shoot and view these
 * screenshots.
 *   PLAYERS=29 BOARDS=16 npm run screens    registration
 *   ... HOME_BOARD=3                        with the first Player registered given Home Board 3
 *   ... DRAW=1                              and the House Rules, every one shown, then Tonight's Draw
 *   ... DRAW=1 SWAP=1                       and Swap mode, the first Player picked, then after swapping them
 *                                           with the last Player listed
 *   ... DRAW=1 START=1                      and after Start
 *   ... DRAW=1 START=1 RESULTS=12           and after 12 Match results are recorded (RESULTS=all: to the champion)
 *   ... DRAW=1 START=1 RESULTS=3 FORFEIT=1  and the Forfeit dialog, then after that Forfeit
 * Writes test-results/screens/{organizer,tv}-{registration,house-rules,draw,swap-picked,swapped,started,results,losers-bracket,champion,
 * forfeit-dialog,forfeit}.png: the organizer at
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

	const homeBoard = process.env.HOME_BOARD;
	if (homeBoard) {
		const boardSelect = organizer.getByRole('combobox', { name: 'Board', exact: true });
		await boardSelect.selectOption(homeBoard);
		const homeBoardForSelect = organizer.getByRole('combobox', { name: 'Home Board for' });
		// The first Player registered: the first option after Nobody.
		await homeBoardForSelect.selectOption({ index: 1 });
	}
	// The Fun Fact fades in at the start of its 12 seconds, so Tonight's Players is shot once it is fully shown.
	await expect(tv.getByText(/^Fun fact: /)).toHaveCSS('opacity', '1');
	await shoot('registration');
	if (!process.env.DRAW) {
		return;
	}
	await showHouseRules(organizer);
	await organizer.getByRole('button', { name: 'Show all' }).click();
	await tv.getByRole('heading', { name: 'House Rules' }).waitFor();
	await shoot('house-rules');
	await confirmDrawFromHouseRules(organizer);
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
	await shoot('draw');
	if (process.env.SWAP) {
		await organizer.getByRole('button', { name: 'Swap Players' }).click();
		const playerButtons = findMatchesOnBoards(organizer).getByRole('button');
		await playerButtons.first().click();
		await shoot('swap-picked');
		await playerButtons.last().click();
		await shoot('swapped');
		await organizer.getByRole('button', { name: 'Done' }).click();
	}
	if (!process.env.START) {
		return;
	}
	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await shoot('started');
	if (!process.env.RESULTS) {
		return;
	}
	// Each screen for 1 second, so the TV soon cycles to each bracket once the Losers Bracket is drawn.
	await organizer.getByLabel('Seconds per TV screen').fill('1');
	// The first Match on the list that can be won goes to its first-named Player each time.
	const results = process.env.RESULTS === 'all' ? Infinity : Number(process.env.RESULTS);
	const nextWinnerButton = findMatchesOnBoards(organizer).getByRole('button').first();
	// Each Player losing their first Match stays, so the Losers Bracket is played too.
	for (let recorded = 0; recorded < results && (await nextWinnerButton.count()) > 0; recorded++) {
		await nextWinnerButton.click();
		await answerIsLoserStayingDialogIfAsked(organizer, 'Staying');
	}
	// The TV cycles each second, so wait for the screen to shoot: the bracket, then the champion once finished.
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await shoot('results');
	// With a Losers Bracket drawn, its screen.
	const losersHeading = tv.getByRole('heading', { name: 'Losers Bracket' });
	const isLosersBracketShown = await isShownWithin(losersHeading, 5000);
	if (isLosersBracketShown && (await nextWinnerButton.count()) > 0) {
		await shoot('losers-bracket');
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
	const forfeitButton = findMatchesOnBoards(organizer)
		.getByRole('button', { name: 'Forfeit' })
		.first();
	await forfeitButton.click();
	await shoot('forfeit-dialog');
	await organizer.getByRole('dialog').getByRole('button', { name: leaver! }).click();
	await answerIsLoserStayingDialogIfAsked(organizer, 'Staying');
	await shoot('forfeit');
});

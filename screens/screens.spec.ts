import { expect, type Locator } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDrawFromHouseRules,
	findMatchesOnBoards,
	showHouseRules,
	test,
} from '../e2e/setUpTournament';
import { findLongestNamedButton } from '../e2e/textFits';

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
 *   ... DRAW=1 SWAP=1                       and Swap mode, the Player with the longest name in a Match tile
 *                                           picked, then after swapping them with the last Player listed
 *   ... DRAW=1 START=1                      and after Start
 *   ... DRAW=1 START=1 RESULTS=12           and after 12 Match results are recorded (RESULTS=all: to the champion)
 *   ... DRAW=1 START=1 RESULTS=12 PEEK=1    and the brackets looked at on the laptop: the bracket on show,
 *                                           then the Losers Bracket's tab once it has one
 *   ... DRAW=1 START=1 RESULTS=3 FORFEIT=1  and the Forfeit dialog, then after that Forfeit
 *   ... SCHEME=dark                         with the laptop set dark (or light), which the Organizer screen's
 *                                           Same as laptop Theme follows
 *   ... THEME_MENU=1                        and the Theme menu open at registration
 * Writes test-results/screens/{organizer,tv}-{registration,theme-menu,house-rules,draw,swap-picked,swapped,started,results,losers-bracket,champion,
 * peek,peek-losers,forfeit-dialog,forfeit}.png: the organizer at
 * 1280×720, the TV at 1920×1080.
 */
const players = process.env.PLAYERS ?? '26';
const boards = process.env.BOARDS ?? '16';

test('screens', async ({ context, page: organizer }) => {
	// Recording many results, each waiting on the TV, takes longer than a test's usual 30 seconds.
	test.setTimeout(120_000);
	await organizer.setViewportSize({ width: 1280, height: 720 });
	const laptopScheme = process.env.SCHEME;
	if (laptopScheme !== undefined && laptopScheme !== 'light' && laptopScheme !== 'dark') {
		throw new Error(`SCHEME must be light or dark, not ${laptopScheme}`);
	}
	if (laptopScheme) {
		await organizer.emulateMedia({ colorScheme: laptopScheme });
	}
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
	if (process.env.THEME_MENU) {
		await organizer.getByRole('button', { name: 'Theme' }).click();
		await shoot('theme-menu');
		await organizer.keyboard.press('Escape');
		// Closed before going on, so no later shot shows the menu.
		await expect(organizer.getByRole('menu', { name: 'Theme' })).toBeHidden();
	}
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
		// The longest name, so the shot shows the PICKED tag beside the widest name a seat holds.
		const matchesOnBoards = findMatchesOnBoards(organizer);
		const longestNamedSeat = await findLongestNamedButton(matchesOnBoards);
		await longestNamedSeat.click();
		await shoot('swap-picked');
		// The last seat not picked, so the tap swaps rather than clearing the pick.
		await matchesOnBoards.getByRole('button', { pressed: false }).last().click();
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
	// The first Match on the list that can be won goes to its first-named Player each time.
	const results = process.env.RESULTS === 'all' ? Infinity : Number(process.env.RESULTS);
	const nextWinnerButton = findMatchesOnBoards(organizer).getByRole('button').first();
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	let isOneSecondSet = false;
	// Each Player losing their first Match stays, so the Losers Bracket is played too.
	for (let recorded = 0; recorded < results && (await nextWinnerButton.count()) > 0; recorded++) {
		await nextWinnerButton.click();
		await answerIsLoserStayingDialogIfAsked(organizer, 'Staying');
		/*
		 * Each screen for 1 second, so the TV soon cycles to each bracket. The box is usable once the TV has a
		 * second screen to cycle: the Losers Bracket drawn, or the Tournament finished.
		 */
		if (!isOneSecondSet && (await secondsInput.isEnabled())) {
			await secondsInput.fill('1');
			await secondsInput.press('Enter');
			isOneSecondSet = true;
		}
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
	if (process.env.PEEK) {
		await organizer.getByRole('button', { name: 'Look at the brackets here' }).click();
		const peek = organizer.getByRole('dialog', { name: 'The brackets' });
		await shoot('peek');
		const losersTab = peek.getByRole('tab', { name: 'Losers Bracket' });
		if ((await losersTab.count()) > 0) {
			await losersTab.click();
			await shoot('peek-losers');
		}
		await organizer.keyboard.press('Escape');
		// Closed before going on, so no later shot shows the brackets.
		await expect(peek).toBeHidden();
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

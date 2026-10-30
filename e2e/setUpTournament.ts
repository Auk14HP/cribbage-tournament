import { expect, type BrowserContext, type Page } from '@playwright/test';

// Set-up shared by the TV layout tests.

/*
 * Makes the same Draw every run: the Organizer's Draw shuffles with Math.random, replaced here by a seeded
 * stand-in (mulberry32), so the widths that once squeezed a column come back each time.
 */
export const seedDraw = async (context: BrowserContext) => {
	await context.addInitScript(() => {
		let seed = 1;
		Math.random = () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	});
};

export const startTournament = async (page: Page, players: number) => {
	await page.goto(`/?players=${players}&boards=${Math.ceil(players / 2)}`);
	await page.getByRole('button', { name: 'Make the Draw' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
	await page.getByRole('button', { name: 'Start', exact: true }).click();
};

/*
 * Every Match goes to its first-named Player, the first on the list each time, its loser leaving rather than
 * staying for a Losers Bracket, until the Matches list is down
 * to the given number: 0 plays to the champion, 1 stops at the final, both its Players known. Found by its
 * place in the list, not its Players, since any Match will do. A locator is looked up afresh each time it is
 * used, so the one button it names is the next to click.
 */
const playUntilMatchesLeft = async (page: Page, matchesLeft: number) => {
	const matches = page.getByRole('list', { name: 'Matches' });
	const matchesOnBoards = matches.getByRole('listitem');
	const nextWinnerButton = matches.getByRole('button').first();
	/*
	 * Counts Matches, not buttons: the final still has its buttons when it is the only Match left. While
	 * more than one Match holds a Board, at least one has both Players known, so there is a button to click.
	 */
	while ((await matchesOnBoards.count()) > matchesLeft) {
		await nextWinnerButton.click();
		await answerStayingIfAsked(page, 'Leaving');
	}
};

/*
 * Answers whether the loser is staying for the Losers Bracket, if they were asked: only a Player losing their
 * first Match is.
 */
export const answerStayingIfAsked = async (page: Page, answer: 'Staying' | 'Leaving') => {
	const stayingDialog = page.getByRole('dialog', { name: /staying for the Losers Bracket/ });
	if (await stayingDialog.isVisible()) {
		await stayingDialog.getByRole('button', { name: answer }).click();
	}
};

export const playToFinal = (page: Page) => playUntilMatchesLeft(page, 0);

export const playUntilTheFinal = (page: Page) => playUntilMatchesLeft(page, 1);

// Past the one-second screen, so a long hold saved too late has shown itself.
const pastOneSecondScreen = 1500;

/*
 * Moves the TV's cycle on to the named screen and holds it there: a second per screen moves it on, and a
 * long one then holds it, since a new time restarts the screen shown. The long one can land after the second
 * is up, holding the wrong screen, so the screen is checked once after saving and a miss goes round again.
 * Each time is saved with Enter, as an Organizer would.
 */
export const holdScreen = async (organizer: Page, tv: Page, screenHeading: string) => {
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	const heading = tv.getByRole('heading', { name: screenHeading });
	await expect(async () => {
		await secondsInput.fill('1');
		await secondsInput.press('Enter');
		await heading.waitFor();
		await secondsInput.fill('600');
		await secondsInput.press('Enter');
		await tv.waitForTimeout(pastOneSecondScreen);
		expect(await heading.isVisible()).toBe(true);
	}).toPass({ timeout: 20_000 });
};

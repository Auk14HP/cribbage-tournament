import type { BrowserContext, Page } from '@playwright/test';

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
 * Every Match goes to its first-named Player, the first on the list each time, until there is a champion.
 * Found by its place in the list, not its Players, since any Match will do.
 */
export const playToFinal = async (page: Page) => {
	const winnerButton = page.getByRole('list', { name: 'Matches' }).getByRole('button').first();
	while ((await winnerButton.count()) > 0) {
		await winnerButton.click();
	}
};

/*
 * Moves the TV's cycle on to the named screen and holds it there: a second per screen moves it on, and a
 * long one then holds it, since a new time restarts the screen shown.
 */
export const holdScreen = async (organizer: Page, tv: Page, screenHeading: string) => {
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	await secondsInput.fill('1');
	await tv.getByRole('heading', { name: screenHeading }).waitFor();
	await secondsInput.fill('600');
};

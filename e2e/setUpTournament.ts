import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

// Set-up shared by the browser tests and the screenshot script.

/*
 * Makes the same Draw every run: the Organizer's Draw shuffles with Math.random, replaced here by a
 * seeded stand-in (mulberry32), so a layout that once squeezed a column, or a pair of names that
 * once overflowed a card, comes back each time.
 */
const seedDraw = async (context: BrowserContext, seed: number) => {
	await context.addInitScript((initialSeed) => {
		let state = initialSeed;
		Math.random = () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}, seed);
};

/*
 * Moves every window's calendar to the same day of the month in November, or its last, the 30th,
 * from the 31st: November has no TV Theme of its own, so the TV draws in Classic unless a test
 * picks another TV Theme, in whatever month the tests run. Every window moves back by the same
 * whole number of days, worked out from today's date, so the Organizer's and the TV's windows still
 * agree on the time, and the clock still runs.
 */
const setCalendarToNovember = async (context: BrowserContext) => {
	await context.addInitScript(() => {
		const RealDate = Date;
		const today = new RealDate();
		const todayMidnight = new RealDate(today.getFullYear(), today.getMonth(), today.getDate());
		// Months as Date counts them, from 0 for January.
		const novemberIndex = 10;
		const novemberDayCount = 30;
		const novemberDay = Math.min(today.getDate(), novemberDayCount);
		const novemberMidnight = new RealDate(today.getFullYear(), novemberIndex, novemberDay);
		const shiftMs = todayMidnight.getTime() - novemberMidnight.getTime();
		/*
		 * A Date made with no arguments, and Date.now(), give the moved time; a Date
		 * made from a time is as given.
		 */
		class NovemberDate extends RealDate {
			constructor(...dateParts: unknown[]) {
				if (dateParts.length === 0) {
					super(RealDate.now() - shiftMs);
				} else {
					super(...(dateParts as [number, number]));
				}
			}

			static now() {
				return RealDate.now() - shiftMs;
			}
		}
		globalThis.Date = NovemberDate as DateConstructor;
	});
};

/*
 * Playwright's test, with every browser context's Draw seeded, so no test depends on a random Draw,
 * and its calendar in November, so no test depends on the month's TV Theme. A test that wants
 * another Draw sets its own seed: `test.use({ drawSeed: 7 })`.
 */
export const test = base.extend<{ drawSeed: number }>({
	drawSeed: [1, { option: true }],
	// runTest is Playwright's `use`: it runs the test with this context.
	context: async ({ context, drawSeed }, runTest) => {
		await seedDraw(context, drawSeed);
		await setCalendarToNovember(context);
		await runTest(context);
	},
});

/*
 * How long to wait for the Organizer screen to show TV closed: it does so within a few seconds of
 * the TV's last heartbeat, more than Playwright's usual wait.
 */
export const tvClosingTimeoutMs = 10_000;

// The TVs the browser tests draw on: a 16:9 TV and a narrower one.
export const tvSizes = [
	{ width: 1920, height: 1080 },
	{ width: 1258, height: 955 },
];

// Opens the display route in a TV window of the given size, beside the Organizer's.
export const openTv = async (organizer: Page, tvSize: { width: number; height: number }) => {
	const tv = await organizer.context().newPage();
	await tv.setViewportSize(tvSize);
	await tv.goto('/display');
	return tv;
};

// Registers Players by typing each name given into the Player name box, as an Organizer does.
export const registerPlayersByName = async (organizer: Page, names: readonly string[]) => {
	const playerName = organizer.getByLabel('Player name');
	for (const name of names) {
		await playerName.fill(name);
		await playerName.press('Enter');
	}
};

// Names as long as a name can sensibly be, numbered so each is different.
export const makeLongNames = (playerCount: number) =>
	Array.from({ length: playerCount }, (_, index) => `Bartholomew Featherstonehaugh ${index + 1}`);

// Goes from registration to the House Rules step, where the Draw is made.
export const showHouseRules = async (organizer: Page) => {
	await organizer.getByRole('button', { name: 'Show House Rules' }).click();
};

// Makes the Draw from the House Rules step, confirming it.
export const confirmDrawFromHouseRules = async (organizer: Page) => {
	await organizer.getByRole('button', { name: 'Make the Draw' }).click();
	await organizer.getByRole('dialog').getByRole('button', { name: 'Make the Draw' }).click();
};

/*
 * Goes on from registration through the House Rules step, none shown, and
 * makes the Draw, confirming it.
 */
export const confirmDraw = async (organizer: Page) => {
	await showHouseRules(organizer);
	await confirmDrawFromHouseRules(organizer);
};

export const startTournament = async (page: Page, { players }: { players: number }) => {
	await page.goto(`/?players=${players}&boards=${Math.ceil(players / 2)}`);
	await confirmDraw(page);
	await page.getByRole('button', { name: 'Start', exact: true }).click();
};

// Finds the organizer route's Matches holding a Board: one region holding every bracket's panel.
export const findMatchesOnBoards = (organizer: Page) =>
	organizer.getByRole('region', { name: 'Matches' });

/*
 * Every Match goes to its first-named Player, the first on the list each time, its loser leaving
 * rather than staying for a Losers Bracket, until the Matches list is down to the given number: 0
 * plays to the champion, 1 stops at the final, both its Players known. Found by its place in the
 * list, not its Players, since any Match will do. A locator is looked up afresh each time it is
 * used, so the one button it names is the next to click.
 */
const playUntilMatchesLeft = async (page: Page, matchesLeft: number) => {
	const matches = findMatchesOnBoards(page);
	const matchesOnBoards = matches.getByRole('listitem');
	const nextWinnerButton = matches.getByRole('button').first();
	/*
	 * Counts Matches, not buttons: the final still has its buttons when it is the only Match
	 * left. While more than one Match holds a Board, at least one has both Players known, so
	 * there is a button to click.
	 */
	while ((await matchesOnBoards.count()) > matchesLeft) {
		await nextWinnerButton.click();
		await answerIsLoserStayingDialogIfAsked(page, 'Leaving');
	}
};

/*
 * Answers whether the loser is staying for the Losers Bracket, if they were asked: only a Player
 * losing their first Match is. Returns whether they were asked.
 */
export const answerIsLoserStayingDialogIfAsked = async (
	page: Page,
	answer: 'Staying' | 'Leaving',
) => {
	const stayingDialog = page.getByRole('dialog', { name: /staying for the Losers Bracket/ });
	if (!(await stayingDialog.isVisible())) {
		return false;
	}
	await stayingDialog.getByRole('button', { name: answer }).click();
	return true;
};

/*
 * Records results, each loser of a first Match staying for the Losers Bracket, until every first
 * Match has one, which draws the Losers Bracket. Counts the losers asked rather than clicks, since
 * a click may record a later Match whose loser isn't asked.
 */
export const playFirstMatchesWithLosersStaying = async (
	organizer: Page,
	{ firstMatchCount }: { firstMatchCount: number },
) => {
	const nextWinnerButton = findMatchesOnBoards(organizer).getByRole('button').first();
	let stayingCount = 0;
	while (stayingCount < firstMatchCount) {
		await nextWinnerButton.click();
		if (await answerIsLoserStayingDialogIfAsked(organizer, 'Staying')) {
			stayingCount++;
		}
	}
};

/*
 * Records results, each loser of a first Match staying, until the Losers Bracket has a Match on a Board, so its
 * panel is on the Organizer screen and its screen on the TV. A Bye Player's first Match comes in Round 2, so
 * this plays on past the first Round when the field has Byes. Fails if the Matches run out first: too few
 * Players stayed for a Losers Bracket.
 */
export const playUntilLosersBracketOpens = async (organizer: Page) => {
	const losersPanel = organizer.getByRole('region', { name: 'Losers Bracket' });
	const nextWinnerButton = findMatchesOnBoards(organizer).getByRole('button').first();
	while (!(await losersPanel.isVisible()) && (await nextWinnerButton.count()) > 0) {
		await nextWinnerButton.click();
		await answerIsLoserStayingDialogIfAsked(organizer, 'Staying');
	}
	await expect(losersPanel, 'the Losers Bracket opens').toBeVisible();
};

export const playToFinal = (page: Page) => playUntilMatchesLeft(page, 0);

export const playUntilTheFinal = (page: Page) => playUntilMatchesLeft(page, 1);

/*
 * How long parkCycleOn waits before checking the screen is still shown. Longer than one 1-second
 * screen, so if the long time was saved too late and the TV had already moved on, the wrong
 * screen is showing by then.
 */
const msBeforeCheckingParked = 1500;

/*
 * Moves Auto's cycle on to the named screen and parks it there, still on Auto, so the countdown
 * ring stays (a Held screen has none): a second per screen moves it on, and a 600-second screen
 * then keeps it, since a new time starts the cycle again from the screen on show. The long time can
 * land after the second is up, parking the wrong screen, so the screen is checked once after saving
 * and a miss goes round again. Each time is saved with Enter, as an Organizer would.
 */
export const parkCycleOn = async (organizer: Page, tv: Page, screenHeading: string) => {
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	const heading = tv.getByRole('heading', { name: screenHeading });
	await expect(async () => {
		await secondsInput.fill('1');
		await secondsInput.press('Enter');
		await heading.waitFor();
		await secondsInput.fill('600');
		await secondsInput.press('Enter');
		await tv.waitForTimeout(msBeforeCheckingParked);
		expect(await heading.isVisible()).toBe(true);
	}).toPass({ timeout: 20_000 });
};

import { expect, type Locator, type Page } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDraw,
	startTournament,
	test,
} from './setUpTournament';

/*
 * The organizer route fills the laptop's window and never scrolls as a page: a long list scrolls on its own,
 * so the controls around it stay on screen. jsdom can't lay out a page, so these run in a real browser.
 */

const windowSize = { width: 1280, height: 720 };

test.use({ viewport: windowSize });

const expectPageDoesNotScroll = async (page: Page) => {
	const { pageHeight, windowHeight } = await page.evaluate(() => ({
		pageHeight: document.documentElement.scrollHeight,
		windowHeight: window.innerHeight,
	}));
	expect(pageHeight).toBe(windowHeight);
};

// Wholly on screen: inside the window and not cut off by a list scrolled past it.
const expectWhollyOnScreen = async (elements: Locator[]) => {
	for (const element of elements) {
		await expect(element).toBeInViewport({ ratio: 1 });
	}
};

// Every refusal line on the page, empty or not, is wholly on screen, ready for a refusal to show in.
const expectRefusalLinesOnScreen = async (page: Page) => {
	await expectWhollyOnScreen(await page.getByRole('alert').all());
};

const isScrollable = (list: Locator) =>
	list.evaluate((element) => element.scrollHeight > element.clientHeight);

/*
 * The area a long list scrolls in fills the space left on screen: it ends at the bottom of the window, above
 * the page's own padding. The area is the list itself or the nearest box around it that scrolls.
 */
const expectScrollingAreaReachesWindowBottom = async (list: Locator) => {
	const { areaBottom, spaceBottom } = await list.evaluate((element) => {
		let area: Element = element;
		while (getComputedStyle(area).overflowY !== 'auto' && area.parentElement) {
			area = area.parentElement;
		}
		const page = element.closest('main')!;
		return {
			areaBottom: area.getBoundingClientRect().bottom,
			spaceBottom: window.innerHeight - parseFloat(getComputedStyle(page).paddingBottom),
		};
	});
	expect(areaBottom).toBeCloseTo(spaceBottom, 0);
};

/*
 * The last row of a list, found by its place rather than by its Players: the test needs whichever row sits
 * furthest past the visible part of the list, not a particular Match.
 */
const findLastRow = (list: Locator) => list.getByRole('listitem').last();

/*
 * A row below the visible part of its list is scrolled to, as the Organizer would with the mouse wheel: it
 * comes wholly on screen while the page itself stays put.
 */
const expectRowScrollsIntoView = async (page: Page, row: Locator) => {
	await expect(row).not.toBeInViewport();
	await row.scrollIntoViewIfNeeded();
	await expectWhollyOnScreen([row]);
	await expectPageDoesNotScroll(page);
};

// Starts 32 Players on 16 Boards and records 12 results, each loser staying for the Losers Bracket.
const startWithTwelveResults = async (page: Page) => {
	await startTournament(page, 32);
	const nextWinnerButton = page
		.getByRole('list', { name: 'Matches' })
		.getByRole('button')
		.first();
	for (let recorded = 0; recorded < 12; recorded++) {
		await nextWinnerButton.click();
		await answerIsLoserStayingDialogIfAsked(page, 'Staying');
	}
};

test.describe('Registering a long field', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/?players=32&boards=16');
	});

	test('keeps the registration controls on screen while the Players list scrolls', async ({
		page,
	}) => {
		const players = page.getByRole('list', { name: 'Players' });

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([
			page.getByLabel('Player name'),
			page.getByRole('button', { name: 'Register' }),
			page.getByText('32 Players registered'),
			page.getByRole('heading', { name: 'Boards' }),
			page.getByRole('button', { name: 'Make the Draw' }),
			page.getByRole('heading', { name: 'TV screens' }),
		]);
		expect(await isScrollable(players)).toBe(true);
		await expectScrollingAreaReachesWindowBottom(players);
	});

	test('brings a newly registered Player into view, keeping the name box ready', async ({
		page,
	}) => {
		const playerName = page.getByLabel('Player name');

		await playerName.fill('Zebedee Newcomer');
		await playerName.press('Enter');

		const newRow = page.getByRole('listitem').filter({ hasText: 'Zebedee Newcomer' });
		await expectWhollyOnScreen([newRow]);
		await expect(playerName).toBeFocused();
		await expectPageDoesNotScroll(page);
	});

	test('keeps the last Player’s rename row on screen', async ({ page }) => {
		const players = page.getByRole('list', { name: 'Players' });

		await findLastRow(players).getByRole('button', { name: 'Rename' }).click();

		await expectWhollyOnScreen([
			page.getByRole('textbox', { name: /^New name for / }),
			page.getByRole('button', { name: 'Save' }),
			page.getByRole('button', { name: 'Cancel' }),
		]);
		await expectPageDoesNotScroll(page);
	});
});

test.describe('Playing a long field', () => {
	test('keeps Start and the TV screens on screen on Tonight’s Draw while the Matches list scrolls', async ({
		page,
	}) => {
		await page.goto('/?players=32&boards=16');
		await confirmDraw(page);
		const matches = page.getByRole('list', { name: 'Matches' });
		const controls = [
			page.getByRole('heading', { name: 'Matches' }),
			page.getByRole('button', { name: 'Start', exact: true }),
			page.getByRole('heading', { name: 'TV screens' }),
		];

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen(controls);
		await expectRefusalLinesOnScreen(page);
		await expectScrollingAreaReachesWindowBottom(matches);
		await expectRowScrollsIntoView(page, findLastRow(matches));
		await expectWhollyOnScreen(controls);
	});

	test('keeps the Matches heading, its refusal line and the TV screens on screen once Started, as Results pile up', async ({
		page,
	}) => {
		await startWithTwelveResults(page);

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([
			page.getByRole('heading', { name: 'Matches' }),
			page.getByText('Tap a Match’s winner.'),
			page.getByRole('heading', { name: 'TV screens' }),
			page.getByRole('heading', { name: 'Results' }),
		]);
		await expectRefusalLinesOnScreen(page);
		const matches = page.getByRole('list', { name: 'Matches' });
		await expectRowScrollsIntoView(page, findLastRow(matches));
	});

	test('scrolls the Results list on its own in a short window, keeping the TV screens on screen', async ({
		page,
	}) => {
		await startWithTwelveResults(page);

		// Too short for the few results that can still be undone after 12.
		await page.setViewportSize({ width: windowSize.width, height: 520 });

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([
			page.getByRole('heading', { name: 'TV screens' }),
			page.getByRole('heading', { name: 'Results' }),
		]);
		expect(await isScrollable(page.getByRole('list', { name: 'Results' }))).toBe(true);
	});

	test('keeps the Matches and Waiting for a Board headings on screen when most Matches wait', async ({
		page,
	}) => {
		await page.goto('/?players=32&boards=2');
		await confirmDraw(page);

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([
			page.getByRole('heading', { name: 'Matches' }),
			page.getByRole('heading', { name: 'Waiting for a Board' }),
			page.getByRole('button', { name: 'Start', exact: true }),
		]);
		const waiting = page.getByRole('list', { name: 'Waiting for a Board' });
		await expectRowScrollsIntoView(page, findLastRow(waiting));
	});

	test('shows the whole of a single Match waiting beneath a long Matches list', async ({
		page,
	}) => {
		// 26 Players on 12 Boards: 13 opening Matches, so one waits for a Board below the other 12.
		await page.goto('/?players=26&boards=12');
		await confirmDraw(page);
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		const waitingMatch = page
			.getByRole('list', { name: 'Waiting for a Board' })
			.getByRole('listitem');

		await expectRowScrollsIntoView(page, waitingMatch);
		await expectWhollyOnScreen([page.getByRole('heading', { name: 'Matches' })]);
	});
});

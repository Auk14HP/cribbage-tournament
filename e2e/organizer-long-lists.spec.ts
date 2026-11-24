import { expect, type Locator, type Page } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDraw,
	findMatchesOnBoards,
	startTournament,
	test,
} from './setUpTournament';
import { expectWhollyOnScreen } from './whollyOnScreen';

/*
 * The organizer route fills the laptop's window and never scrolls as a page: a long list scrolls on its own,
 * so the controls around it stay on screen. jsdom can't lay out a page, so these run in a real browser.
 */

const windowSize = { width: 1280, height: 720 };

// The Organizer's Players panel, apart from the TV Display panel's thumbnail, which shows the count too.
const findPlayersPanel = (page: Page) => page.getByRole('region', { name: 'Players' });

test.use({ viewport: windowSize });

const expectPageDoesNotScroll = async (page: Page) => {
	const { pageHeight, windowHeight } = await page.evaluate(() => ({
		pageHeight: document.documentElement.scrollHeight,
		windowHeight: window.innerHeight,
	}));
	expect(pageHeight).toBe(windowHeight);
};

// Every refusal line on the page, empty or not, is wholly on screen, ready for a refusal to show in.
const expectRefusalLinesOnScreen = async (page: Page) => {
	await expectWhollyOnScreen(await page.getByRole('alert').all());
};

const isScrollable = (list: Locator) =>
	list.evaluate((element) => element.scrollHeight > element.clientHeight);

/*
 * The area a long list scrolls in fills the space left on screen: the column holding it, made of panels, ends at
 * the bottom of the window, above the page's own padding. The area is the only box in the column that shrinks,
 * so the column reaches the bottom only if the area grows to fill what the other boxes leave. The column is
 * the list's outermost box short of the row it shares with the other column, and this measures the bottom of
 * the last box drawn in it.
 */
const expectScrollingAreaFillsSpaceLeft = async (list: Locator) => {
	const { columnBottom, spaceBottom } = await list.evaluate((element) => {
		// A box that isn't a flex box reports a flex direction of row too, so the row is the flex box among them.
		const isFlexRow = (box: Element) => {
			const { display, flexDirection } = getComputedStyle(box);
			return display === 'flex' && flexDirection === 'row';
		};
		let column: Element = element;
		while (!isFlexRow(column.parentElement!)) {
			column = column.parentElement!;
		}
		// A closed dialog has no height, so the column's last box is the last one drawn.
		const drawnBoxes = [...column.children].filter(
			(box) => box.getBoundingClientRect().height > 0,
		);
		const lastBox = drawnBoxes[drawnBoxes.length - 1];
		const main = element.closest('main')!;
		return {
			columnBottom:
				lastBox.getBoundingClientRect().bottom +
				parseFloat(getComputedStyle(lastBox).marginBottom),
			spaceBottom: window.innerHeight - parseFloat(getComputedStyle(main).paddingBottom),
		};
	});
	// toBeCloseTo counts the digits after the point that must match: none, so to the whole pixel.
	const digitsAfterPoint = 0;
	expect(columnBottom).toBeCloseTo(spaceBottom, digitsAfterPoint);
};

/*
 * The last row of a list, found by its place rather than by its Players: the test needs whichever row sits
 * furthest past the visible part of the list, not a particular Match.
 */
const findLastRow = (list: Locator) => list.getByRole('listitem').last();

// Scrolls a row into view and checks it then shows whole, not cut off by the edge of its list's area.
const expectWhollyOnScreenOnceScrolledTo = async (row: Locator) => {
	await row.scrollIntoViewIfNeeded();
	await expectWhollyOnScreen([row]);
};

/*
 * A row below the visible part of its list is scrolled to, as the Organizer would with the mouse wheel: it
 * comes wholly on screen while the page itself stays put.
 */
const expectRowScrollsIntoView = async (page: Page, row: Locator) => {
	await expect(row).not.toBeInViewport();
	await expectWhollyOnScreenOnceScrolledTo(row);
	await expectPageDoesNotScroll(page);
};

/*
 * A part of the side column below what fits in the window is scrolled to, as the Organizer would with the
 * mouse wheel: the side column scrolls, and the page itself stays put.
 */
const expectReachableInSideColumn = async (page: Page, part: Locator) => {
	await expect(part).not.toBeInViewport({ ratio: 1 });
	await expectWhollyOnScreenOnceScrolledTo(part);
	await expectPageDoesNotScroll(page);
};

// Starts 32 Players on 16 Boards and records 12 results, each loser staying for the Losers Bracket.
const startWithTwelveResults = async (page: Page) => {
	await startTournament(page, { players: 32 });
	const nextWinnerButton = findMatchesOnBoards(page).getByRole('button').first();
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
			findPlayersPanel(page).getByText('32 Players registered'),
			page.getByRole('heading', { name: 'TV Display' }),
		]);
		expect(await isScrollable(players)).toBe(true);
		await expectScrollingAreaFillsSpaceLeft(players);
		// Below the TV Display panel's full-size thumbnail, a window this short scrolls the side column to it.
		await expectReachableInSideColumn(
			page,
			page.getByRole('button', { name: 'Show House Rules' }),
		);
	});

	test('brings a newly registered Player into view, keeping the name box ready', async ({
		page,
	}) => {
		const playerName = page.getByLabel('Player name');

		await playerName.fill('Zebedee Newcomer');
		await playerName.press('Enter');

		const newRow = page
			.getByRole('list', { name: 'Players' })
			.getByRole('listitem')
			.filter({ hasText: 'Zebedee Newcomer' });
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
	test('keeps Start and the TV Display panel on screen on Tonight’s Draw while the Matches list scrolls', async ({
		page,
	}) => {
		await page.goto('/?players=32&boards=16');
		await confirmDraw(page);
		const matches = findMatchesOnBoards(page);
		const controls = [
			page.getByRole('heading', { name: 'Matches' }),
			page.getByRole('button', { name: 'Start', exact: true }),
			page.getByRole('heading', { name: 'TV Display' }),
		];

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen(controls);
		await expectRefusalLinesOnScreen(page);
		await expectScrollingAreaFillsSpaceLeft(matches);
		await expectRowScrollsIntoView(page, findLastRow(matches));
		await expectWhollyOnScreen(controls);
	});

	test('keeps the Matches heading, its refusal line and the TV Display panel on screen once Started, as Results pile up', async ({
		page,
	}) => {
		await startWithTwelveResults(page);

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([
			page.getByRole('heading', { name: 'Matches' }),
			page.getByText('Tap a Match’s winner.'),
			page.getByRole('heading', { name: 'TV Display' }),
			page.getByRole('heading', { name: 'Results' }),
		]);
		const matches = findMatchesOnBoards(page);
		await expectScrollingAreaFillsSpaceLeft(matches);
		await expectRowScrollsIntoView(page, findLastRow(matches));
	});

	test('scrolls the Results list on its own in a short window, the side column scrolling to it', async ({
		page,
	}) => {
		await startWithTwelveResults(page);

		// Too short for the few results that can still be undone after 12.
		await page.setViewportSize({ width: windowSize.width, height: 520 });

		await expectPageDoesNotScroll(page);
		await expectWhollyOnScreen([page.getByRole('heading', { name: 'TV Display' })]);
		const results = page.getByRole('list', { name: 'Results' });
		await expectReachableInSideColumn(page, results.getByRole('listitem').first());
		await expectWhollyOnScreen([page.getByRole('heading', { name: 'Results' })]);
		expect(await isScrollable(results)).toBe(true);
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

/*
 * Every list on screen can be scrolled to its last row, which then shows whole, while the page itself stays
 * put: no list is squeezed so small that a row is cut off.
 */
const expectEveryLastRowReachable = async (page: Page) => {
	for (const list of await page.getByRole('list').all()) {
		const rowCount = await list.getByRole('listitem').count();
		if (rowCount === 0) {
			continue;
		}
		await expectWhollyOnScreenOnceScrolledTo(findLastRow(list));
	}
	await expectPageDoesNotScroll(page);
};

/*
 * Each field below is checked on registration, Tonight's Draw and once Started, since a layout bug can show in
 * only one shape. 26 Players on 12 Boards seat 12 of their 13 opening Matches, leaving one waiting beneath a
 * long list. One Board makes most Matches wait. An odd field gives a Bye: 33 on 16 fill every Board exactly
 * beside it. 22 on 12 leave one Board to spare, 9 on 6 and 20 on 14 several.
 */
const fieldShapes = [
	{ playerCount: 3, boardCount: 1 },
	{ playerCount: 9, boardCount: 4 },
	{ playerCount: 9, boardCount: 6 },
	{ playerCount: 17, boardCount: 8 },
	{ playerCount: 20, boardCount: 14 },
	{ playerCount: 22, boardCount: 12 },
	{ playerCount: 26, boardCount: 12 },
	{ playerCount: 32, boardCount: 1 },
	{ playerCount: 32, boardCount: 15 },
	{ playerCount: 33, boardCount: 16 },
	{ playerCount: 40, boardCount: 19 },
	{ playerCount: 64, boardCount: 32 },
];

test.describe('Fields of several shapes', () => {
	for (const { playerCount, boardCount } of fieldShapes) {
		test(`reaches every list's last row whole, ${playerCount} Players on ${boardCount} Board${boardCount === 1 ? '' : 's'}`, async ({
			page,
		}) => {
			await page.goto(`/?players=${playerCount}&boards=${boardCount}`);
			await expect(
				findPlayersPanel(page).getByText(`${playerCount} Players registered`),
			).toBeVisible();
			await expect(page.getByLabel('Number of Boards')).toHaveValue(String(boardCount));
			await expectEveryLastRowReachable(page);

			await confirmDraw(page);
			await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible();
			await expectEveryLastRowReachable(page);

			await page.getByRole('button', { name: 'Start', exact: true }).click();
			await expect(page.getByText('Tap a Match’s winner.')).toBeVisible();
			await expectEveryLastRowReachable(page);
		});
	}
});

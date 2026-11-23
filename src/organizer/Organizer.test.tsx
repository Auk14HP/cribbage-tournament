// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Organizer } from './Organizer';
import { listWaitingText } from '../screenTestHelpers';
import { createLocalStorageStore } from '../storage';
import { tournamentVersion, type Tournament } from '../tournament';
import { themeChoiceVersion, type ThemeChoice } from './themes';

const key = 'organizer-test';
const themeKey = 'organizer-theme-test';

/*
 * jsdom has no media queries, so this stands in for the laptop's light or dark setting, which a test can
 * change while the screen is open, as the laptop does at dusk.
 */
let isLaptopDark = false;
const laptopSchemeListeners = new Set<() => void>();

const setLaptopScheme = (scheme: 'light' | 'dark') => {
	isLaptopDark = scheme === 'dark';
	act(() => laptopSchemeListeners.forEach((listener) => listener()));
};

/*
 * jsdom has no modal dialogs, so these stand in for the browser's, opening and closing only. Escape and
 * moving focus are the browser's, covered in e2e/. Nor does it lay out a page, so scrolling a row into view
 * does nothing here; e2e/ covers it.
 */
beforeAll(() => {
	Element.prototype.scrollIntoView = () => {};
	HTMLDialogElement.prototype.showModal = function () {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function () {
		this.open = false;
	};
	window.matchMedia = (query: string) =>
		({
			media: query,
			get matches() {
				return query === '(prefers-color-scheme: dark)' && isLaptopDark;
			},
			addEventListener: (_type: string, listener: () => void) => {
				laptopSchemeListeners.add(listener);
			},
			removeEventListener: (_type: string, listener: () => void) => {
				laptopSchemeListeners.delete(listener);
			},
		}) as unknown as MediaQueryList;
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	isLaptopDark = false;
});

type User = ReturnType<typeof userEvent.setup>;

const showOrganizer = () => {
	render(
		<Organizer
			store={createLocalStorageStore<Tournament>(key, tournamentVersion)}
			themeStore={createLocalStorageStore<ThemeChoice>(themeKey, themeChoiceVersion)}
		/>,
	);
	return userEvent.setup();
};

const register = async (user: User, name: string) => {
	await user.type(screen.getByLabelText('Player name'), `${name}{Enter}`);
};

// Replaces the number in its box, staying in the box, so nothing is saved yet.
const typeNumber = async (user: User, label: string, number: string) => {
	const box = screen.getByLabelText(label);
	await user.clear(box);
	await user.type(box, number);
};

// Types a number into its box and presses Enter, saving it as an Organizer would.
const enterNumber = async (user: User, label: string, number: string) => {
	await typeNumber(user, label, number);
	await user.keyboard('{Enter}');
};

const setBoardCount = async (user: User, count: string) => {
	await enterNumber(user, 'Number of Boards', count);
};

// Answers the open confirmation dialog by pressing one of its buttons.
const answerDialog = async (user: User, button: string) => {
	const dialog = within(screen.getByRole('dialog'));
	await user.click(dialog.getByRole('button', { name: button }));
};

// A refusal shows beside the controls that caused it.
const getRefusalIn = (section: string) =>
	within(screen.getByRole('region', { name: section })).getByRole('alert');

const clickButton = (user: User, name: string) => user.click(screen.getByRole('button', { name }));

// Goes from registration to the House Rules step.
const showHouseRules = async (user: User) => {
	await clickButton(user, 'Show House Rules');
};

// Makes the Draw from the House Rules step, confirming it.
const confirmDraw = async (user: User) => {
	await clickButton(user, 'Make the Draw');
	await answerDialog(user, 'Make the Draw');
};

/*
 * Registers the named Players, sets out the Boards, goes to the House Rules step and makes the Draw,
 * confirming it.
 */
const makeTheDraw = async (user: User, names: string[], boards: string) => {
	for (const name of names) {
		await register(user, name);
	}
	await setBoardCount(user, boards);
	await showHouseRules(user);
	await confirmDraw(user);
};

// The line saying how many House Rules the TV shows: "2 of 4 shown on the TV".
const readHouseRulesShown = () => screen.getByText(/of \d+ shown on the TV$/).textContent;

/*
 * The rows of every Match on a Board, bracket by bracket. Each recorded result re-renders them, so they are
 * looked up afresh each time.
 */
const listMatchRows = () =>
	within(screen.getByRole('region', { name: 'Matches' })).getAllByRole('listitem');

// The rows of one bracket's Matches on a Board.
const listMatchRowsIn = (bracketTitle: string) =>
	within(screen.getByRole('list', { name: bracketTitle })).getAllByRole('listitem');

// The headings of the brackets with Matches on a Board, in the order shown.
const listBracketHeadings = () =>
	within(screen.getByRole('region', { name: 'Matches' }))
		.getAllByRole('heading')
		.map((heading) => heading.textContent);

// A Round's name as a Match row shows it, after its Board: "Round 2" or "Final".
const roundName = /Round \d+|Final/.source;

// The Round a Match row names, after its Board.
const readRoundName = (row: HTMLElement) =>
	row.textContent!.match(new RegExp(`^Board \\d+(${roundName})`))?.[1];

// The Board numbers of a list of Match rows, in the order shown.
const listBoardNumbers = (rows: HTMLElement[]) =>
	rows.map((row) => Number(row.textContent!.match(/^Board (\d+)/)![1]));

// Whether a Match row is a Bye Player waiting for a first-Round Match's winner.
const isWaitingForWinner = (row: HTMLElement) => row.textContent!.includes(' vs Winner of ');

// The row of the Bye Player waiting for a winner.
const findRowAwaitingWinner = () => listMatchRows().find(isWaitingForWinner)!;

// The row of the one Match with both Players known, in a Draw of 3 Players.
const findPlayingRow = () => listMatchRows().find((row) => !isWaitingForWinner(row))!;

// The name of the Bye Player waiting for a winner.
const readByePlayerName = () =>
	findRowAwaitingWinner().textContent!.match(
		new RegExp(`^Board \\d+(?:${roundName})(.+) vs Winner of`),
	)![1];

// The names on a Match row's buttons: in Swap mode, its Players known.
const listButtonNames = (row: HTMLElement) =>
	within(row)
		.queryAllByRole('button')
		.map((b) => b.textContent!);

// The names on a Match row's winner buttons: both its Players, once it is being played.
const listWinnerNames = (row: HTMLElement) =>
	listButtonNames(row).filter((name) => name !== 'Forfeit');

// What each Match row reads, in the order shown.
const listMatchRowTexts = () => listMatchRows().map((row) => row.textContent);

// The row of the Match on a Board that a Player is in.
const findRowOf = (name: string) =>
	listMatchRows().find((row) => within(row).queryByText(name) !== null)!;

// Taps a Player's name in Swap mode.
const tapPlayer = (user: User, name: string) => clickButton(user, name);

// The Players' names highlighted in Swap mode.
const listHighlightedNames = () =>
	screen.queryAllByRole('button', { pressed: true }).map((b) => b.textContent);

const recordWin = (user: User, row: HTMLElement, winner: string) =>
	user.click(within(row).getByRole('button', { name: winner }));

/*
 * Makes the Draw for 8 Players on 4 Boards: four first-Round Matches, each on a Board. Once they are played
 * and their losers stay, both brackets hold Boards.
 */
const drawEightPlayersOnFourBoards = async (user: User) => {
	const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev', 'Kim', 'Lou'];
	await makeTheDraw(user, names, '4');
};

// Records each Match on the Draw for its first-named Player and returns the losers, who all stay.
const playTheDrawWithLosersStaying = async (user: User) => {
	const losers: string[] = [];
	for (const row of listMatchRows()) {
		const [winner, loser] = listWinnerNames(row);
		losers.push(loser);
		await recordWin(user, row, winner);
		await answerDialog(user, 'Staying');
	}
	return losers;
};

// Records the first-named Player as the winner of each of a bracket's Matches now on a Board.
const playEveryMatchIn = async (user: User, bracketTitle: string) => {
	for (const row of listMatchRowsIn(bracketTitle)) {
		const [winner] = listWinnerNames(row);
		await recordWin(user, row, winner);
	}
};

const listResults = () =>
	within(screen.getByRole('list', { name: 'Results' }))
		.getAllByRole('listitem')
		.map((item) => item.textContent);

// The choices of what the TV shows, by their labels.
const listTvChoices = () => {
	const choices = within(screen.getByRole('group', { name: 'TV shows' }));
	return choices
		.getAllByRole('radio')
		.map((radio) => (radio as HTMLInputElement).labels![0].textContent);
};

const listPlayerNames = () =>
	within(screen.getByRole('list', { name: 'Players' }))
		.queryAllByRole('listitem')
		.map((item) => item.querySelector('span')?.textContent);

// The theme the Organizer screen is drawn in, set on the page's root: Light or Dark.
const readScreenTheme = () => document.documentElement.dataset.theme;

const openThemeMenu = (user: User) => clickButton(user, 'Theme');

// Picks a theme from the palette menu in the header.
const chooseTheme = async (user: User, themeName: string) => {
	await openThemeMenu(user);
	await user.click(screen.getByRole('menuitemradio', { name: themeName }));
};

// The theme menu's choices, by name, and which one is chosen.
const listThemeChoices = () =>
	screen.getAllByRole('menuitemradio').map((item) => ({
		name: item.textContent,
		isChosen: item.getAttribute('aria-checked') === 'true',
	}));

describe('the organizer route', () => {
	it('registers a Player, lists them with the running count, and clears the name box', async () => {
		const user = showOrganizer();

		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		expect(listPlayerNames()).toEqual(['Dave K.', 'Big Dave']);
		expect(screen.getByText('2 Players registered')).toBeInTheDocument();
		expect(screen.getByLabelText('Player name')).toHaveValue('');
	});

	it('shows the reason when a name is refused, and keeps what was typed', async () => {
		const user = showOrganizer();
		await register(user, 'Big Dave');

		await register(user, 'Big Dave');

		expect(getRefusalIn('Players')).toHaveTextContent(
			'There is already a Player called "Big Dave".',
		);
		expect(screen.getByLabelText('Player name')).toHaveValue('Big Dave');
		expect(listPlayerNames()).toEqual(['Big Dave']);
	});

	it('renames a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');

		await clickButton(user, 'Rename');
		await user.clear(screen.getByLabelText('New name for Dave K'));
		await user.type(screen.getByLabelText('New name for Dave K'), 'Dave K.{Enter}');

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('removes a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		const players = within(screen.getByRole('list', { name: 'Players' }));
		const daveK = players.getByText('Dave K.').closest('li')!;
		await user.click(within(daveK).getByRole('button', { name: 'Remove' }));

		expect(listPlayerNames()).toEqual(['Big Dave']);
		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
	});

	it('starts a new Tournament only once the Organizer confirms', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');

		await clickButton(user, 'Start a new Tournament');
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Start a new Tournament? Every Player, Board and the Draw will be cleared.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(listPlayerNames()).toEqual(['Dave K.']);

		await clickButton(user, 'Start a new Tournament');
		await answerDialog(user, 'Start a new Tournament');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(listPlayerNames()).toEqual([]);
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('numbers the Boards from 1 up to how many there are, and resumes with them', async () => {
		const user = showOrganizer();

		await setBoardCount(user, '12');

		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Number of Boards')).toHaveValue('12');
	});

	it('saves the number of Boards only once the Organizer leaves the box or presses Enter', async () => {
		const user = showOrganizer();

		await user.type(screen.getByLabelText('Number of Boards'), '12');
		expect(screen.queryByText(/^Placards/)).not.toBeInTheDocument();
		await user.tab();
		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();

		await typeNumber(user, 'Number of Boards', '15');
		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();
		await user.keyboard('{Enter}');
		expect(screen.getByText('Placards 1 to 15')).toBeInTheDocument();
	});

	it('shows why a number of Boards is refused, beside the Boards, once the Organizer is done typing', async () => {
		const user = showOrganizer();
		await setBoardCount(user, '12');

		await typeNumber(user, 'Number of Boards', '0');
		expect(getRefusalIn('Boards')).toBeEmptyDOMElement();
		await user.tab();

		expect(getRefusalIn('Boards')).toHaveTextContent(
			'The number of Boards is a whole number above zero, like 12.',
		);
		expect(getRefusalIn('Players')).toBeEmptyDOMElement();
		cleanup();
		showOrganizer();
		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();
	});

	it('gives one Player a Home Board, picked from the Boards, moving it when another Player is picked', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue', 'Lou']) {
			await register(user, name);
		}
		await setBoardCount(user, '4');

		await user.selectOptions(screen.getByLabelText('Board'), '3');
		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Big Dave');
		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Sue');
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Home Board for')).toHaveDisplayValue('Sue');
		expect(screen.getByLabelText('Board')).toHaveDisplayValue('3');

		await showHouseRules(user);
		await confirmDraw(user);
		const sueRow = listMatchRows().find((row) => row.textContent!.includes('Sue'))!;
		expect(sueRow).toHaveTextContent(/^Board 3/);
	});

	it('shows why a Home Board is refused, beside the Boards, and takes it away on Nobody', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await setBoardCount(user, '1');

		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Dave K.');

		expect(getRefusalIn('Boards')).toHaveTextContent(
			'A Player can’t have a Home Board when there is only one Board.',
		);
		await setBoardCount(user, '2');
		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Dave K.');
		expect(getRefusalIn('Boards')).toBeEmptyDOMElement();
		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Nobody');
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Home Board for')).toHaveDisplayValue('Nobody');
	});

	it('shows why the Draw is refused, beside Make the Draw', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');
		await showHouseRules(user);

		await confirmDraw(user);

		expect(getRefusalIn('House Rules')).toHaveTextContent('The Draw needs at least one Board.');
	});

	it('offers Show House Rules in place of Make the Draw, starting with no House Rule shown', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		expect(screen.queryByRole('button', { name: 'Make the Draw' })).not.toBeInTheDocument();

		await showHouseRules(user);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('House Rules');
		expect(readHouseRulesShown()).toBe('0 of 4 shown on the TV');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Make the Draw' })).toBeInTheDocument();
	});

	it('shows the House Rules one at a time with Next, hides the latest with Back, and shows every one with Show all', async () => {
		const user = showOrganizer();
		await showHouseRules(user);
		expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

		await clickButton(user, 'Next');
		await clickButton(user, 'Next');
		expect(readHouseRulesShown()).toBe('2 of 4 shown on the TV');
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('1 of 4 shown on the TV');
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('0 of 4 shown on the TV');
		expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

		await clickButton(user, 'Show all');
		expect(readHouseRulesShown()).toBe('4 of 4 shown on the TV');
		expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Show all' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('3 of 4 shown on the TV');
		expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
	});

	it('goes back to registration for a late arrival, then returns with the same House Rules shown', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await showHouseRules(user);
		await clickButton(user, 'Next');
		await clickButton(user, 'Next');

		await clickButton(user, 'Back to registration');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		await register(user, 'Big Dave');
		expect(listPlayerNames()).toEqual(['Dave K.', 'Big Dave']);

		await showHouseRules(user);
		expect(readHouseRulesShown()).toBe('2 of 4 shown on the TV');
	});

	it('makes the Draw from the House Rules step with every House Rule shown', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave']) {
			await register(user, name);
		}
		await setBoardCount(user, '1');
		await showHouseRules(user);
		await clickButton(user, 'Show all');

		await confirmDraw(user);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
	});

	it('resumes the House Rules step with the same House Rules shown when reopened', async () => {
		const user = showOrganizer();
		await showHouseRules(user);
		await clickButton(user, 'Next');
		cleanup();

		showOrganizer();

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('House Rules');
		expect(readHouseRulesShown()).toBe('1 of 4 shown on the TV');
	});

	it('makes the Draw with fewer Boards than Matches, listing the rest as waiting for a Board', async () => {
		const user = showOrganizer();
		// 3 Players on 1 Board: the first-Round Match takes it, and the Bye Player waits for one.
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '1');

		expect(listMatchRows()).toHaveLength(1);
		// 3 Players in a 4-place bracket: the Bye Player waits for the first Round's winner in the Final.
		expect(listWaitingText()).toEqual([
			expect.stringMatching(/^Winners Bracket · Final.+ vs Winner of .+ \/ .+$/),
		]);
	});

	it('makes the Draw from the House Rules step once confirmed, with no House Rule shown, closing registration and showing the Matches it seats, then Starts', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await setBoardCount(user, '2');
		await showHouseRules(user);

		await clickButton(user, 'Make the Draw');
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('House Rules');

		await confirmDraw(user);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		// 3 Players: one first-Round Match, and the Bye Player sits at a Board of their own to wait for its winner.
		expect(listMatchRows()).toHaveLength(2);
		expect(findRowAwaitingWinner()).toHaveTextContent(/^Board \d+.+ vs Winner of .+ \/ .+$/);
		const byePlayerName = readByePlayerName();
		for (const name of ['Dave K.', 'Big Dave', 'Sue'].filter((n) => n !== byePlayerName)) {
			expect(findPlayingRow()).toHaveTextContent(name);
		}

		await clickButton(user, 'Start');

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
		expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

		await clickButton(user, 'Start a new Tournament');
		await answerDialog(user, 'Start a new Tournament');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		expect(listPlayerNames()).toEqual([]);
		expect(screen.getByLabelText('Number of Boards')).toHaveValue('');
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('offers Swap Players only on Tonight’s Draw, where Swap mode says what the taps do and disables Start until Done', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await setBoardCount(user, '2');
		await showHouseRules(user);
		expect(screen.queryByRole('button', { name: 'Swap Players' })).not.toBeInTheDocument();
		await confirmDraw(user);

		await clickButton(user, 'Swap Players');

		expect(screen.getByText('Tap two Players to swap them.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
		expect(screen.queryByRole('button', { name: 'Swap Players' })).not.toBeInTheDocument();
		await clickButton(user, 'Done');
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
		expect(screen.queryByText('Tap two Players to swap them.')).not.toBeInTheDocument();
		await clickButton(user, 'Start');
		expect(screen.queryByRole('button', { name: 'Swap Players' })).not.toBeInTheDocument();
	});

	it('swaps two Players in different Matches with two taps, staying in Swap mode, and swaps them back', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		const drawnRows = listMatchRowTexts();
		const [firstRow] = listMatchRows();
		expect(listButtonNames(firstRow)).toEqual([]);
		await clickButton(user, 'Swap Players');
		const [, , thirdRow] = listMatchRows();
		const [ann, bob] = listButtonNames(firstRow);
		const [cat, dan] = listButtonNames(thirdRow);

		await tapPlayer(user, ann);
		expect(listHighlightedNames()).toEqual([ann]);
		await tapPlayer(user, dan);

		expect(findRowOf(dan)).toHaveTextContent(`${dan} vs ${bob}`);
		expect(findRowOf(ann)).toHaveTextContent(`${cat} vs ${ann}`);
		expect(listHighlightedNames()).toEqual([]);
		expect(screen.getByText('Tap two Players to swap them.')).toBeInTheDocument();
		await tapPlayer(user, dan);
		await tapPlayer(user, ann);
		expect(listMatchRowTexts()).toEqual(drawnRows);
	});

	it('clears the highlight, swapping no one, when the highlighted Player or their opponent is tapped', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		const drawnRows = listMatchRowTexts();
		await clickButton(user, 'Swap Players');
		const [firstRow] = listMatchRows();
		const [ann, bob] = listButtonNames(firstRow);

		await tapPlayer(user, ann);
		await tapPlayer(user, ann);
		expect(listHighlightedNames()).toEqual([]);
		await tapPlayer(user, ann);
		await tapPlayer(user, bob);
		expect(listHighlightedNames()).toEqual([]);

		expect(listMatchRowTexts()).toEqual(drawnRows);
		expect(
			screen.queryByText('Swapping two Players in the same Match changes nothing.'),
		).not.toBeInTheDocument();
	});

	it('gives the Bye to whoever is swapped with the Bye Player, tapped among the Matches waiting for a Board', async () => {
		const user = showOrganizer();
		// 3 Players on 1 Board: the first-Round Match takes it, and the Bye Player waits for one.
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '1');
		await clickButton(user, 'Swap Players');
		const waitingList = within(screen.getByRole('list', { name: 'Waiting for a Board' }));
		const [byePlayer] = waitingList.getAllByRole('button').map((b) => b.textContent!);
		const [firstRow] = listMatchRows();
		const [playerA, playerB] = listButtonNames(firstRow);

		await tapPlayer(user, byePlayer);
		await tapPlayer(user, playerA);
		await clickButton(user, 'Done');

		expect(findRowOf(byePlayer)).toHaveTextContent(`${byePlayer} vs ${playerB}`);
		expect(listWaitingText()).toEqual([
			`Winners Bracket · Final${playerA} vs Winner of ${byePlayer} / ${playerB}`,
		]);
	});

	it('keeps the Swaps when reopened, but not Swap mode', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		await clickButton(user, 'Swap Players');
		const [firstRow, secondRow] = listMatchRows();
		const [ann] = listButtonNames(firstRow);
		const [, dan] = listButtonNames(secondRow);
		await tapPlayer(user, ann);
		await tapPlayer(user, dan);
		const swappedRows = listMatchRowTexts();
		await tapPlayer(user, ann);
		cleanup();

		showOrganizer();

		expect(listMatchRowTexts()).toEqual(swappedRows);
		expect(screen.queryByText('Tap two Players to swap them.')).not.toBeInTheDocument();
		expect(listHighlightedNames()).toEqual([]);
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
	});

	it('records each Match’s winner with one tap, through to the champion', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		const byePlayerName = readByePlayerName();
		// Before Start, no winner can be recorded.
		const drawnRow = findPlayingRow();
		expect(within(drawnRow).queryAllByRole('button')).toEqual([]);
		await clickButton(user, 'Start');

		// Board 2's Bye Player waits for Board 1's winner, so only Board 1 can be won yet.
		const playingRow = findPlayingRow();
		const waitingRow = findRowAwaitingWinner();
		expect(within(waitingRow).queryAllByRole('button')).toEqual([]);
		const [winner, loser] = within(playingRow)
			.getAllByRole('button')
			.map((b) => b.textContent!);
		await recordWin(user, playingRow, winner);
		await answerDialog(user, 'Leaving');

		// The winner joins the Bye Player at Board 2, and Board 1 frees.
		const matches = listMatchRows();
		expect(matches).toHaveLength(1);
		const [final] = matches;
		expect(final).toHaveTextContent(/^Board 2/);
		expect(final).toHaveTextContent(winner);
		expect(final).not.toHaveTextContent(loser);
		await recordWin(user, final, byePlayerName);

		expect(screen.queryByRole('region', { name: 'Matches' })).not.toBeInTheDocument();
		expect(screen.getByText(`Champion: ${byePlayerName}`)).toBeInTheDocument();
	});

	it('records a Forfeit once the Organizer says who is forfeiting, and their opponent wins', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		// 3 Players: two play on Board 1, and the Bye Player waits at Board 2 for its winner.
		const playing = findPlayingRow();
		const waiting = findRowAwaitingWinner();
		const [stays, leaves] = listWinnerNames(playing);
		const bye = ['Dave K.', 'Big Dave', 'Sue'].find(
			(name) => name !== stays && name !== leaves,
		)!;
		expect(within(waiting).queryByRole('button', { name: 'Forfeit' })).not.toBeInTheDocument();

		await user.click(within(playing).getByRole('button', { name: 'Forfeit' }));
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Who is forfeiting the Match on Board 1?',
		);
		await answerDialog(user, 'Cancel');
		expect(listMatchRows()).toHaveLength(2);

		await user.click(within(playing).getByRole('button', { name: 'Forfeit' }));
		await answerDialog(user, leaves);
		await answerDialog(user, 'Leaving');

		const [final] = listMatchRows();
		expect(listMatchRows()).toHaveLength(1);
		expect(listWinnerNames(final).sort()).toEqual([stays, bye].sort());
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${leaves} forfeited to ${stays}Undo`,
		]);
	});

	it('asks whether a Player losing their first Match is staying for the Losers Bracket, recording nothing on Cancel', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		// 3 Players: two play on Board 1, and the Bye Player waits at Board 2 for its winner.
		const playing = findPlayingRow();
		const [winner, loser] = listWinnerNames(playing);

		await recordWin(user, playing, winner);
		expect(screen.getByRole('dialog')).toHaveTextContent(
			`Is ${loser} staying for the Losers Bracket?`,
		);
		await answerDialog(user, 'Cancel');
		expect(listMatchRows()).toHaveLength(2);
		expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();

		await recordWin(user, playing, winner);
		await answerDialog(user, 'Staying');
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${winner} beat ${loser}Undo`,
		]);

		// The Bye Player's first Match is the final, and a Forfeit asks too, about the Player leaving it.
		const [final] = listMatchRows();
		const [, bye] = listWinnerNames(final);
		await user.click(within(final).getByRole('button', { name: 'Forfeit' }));
		await answerDialog(user, bye);
		expect(screen.getByRole('dialog')).toHaveTextContent(
			`Is ${bye} staying for the Losers Bracket?`,
		);
		await answerDialog(user, 'Leaving');
		expect(screen.getByText(`Champion: ${winner}`)).toBeInTheDocument();
	});

	it('groups the Matches on a Board by bracket, Winners Bracket first, each in Board order', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		// Tonight’s Draw seats only the Winners Bracket, so the Losers Bracket’s section is hidden.
		expect(listBracketHeadings()).toEqual(['Winners Bracket']);
		await clickButton(user, 'Start');

		/*
		 * 8 Players on 4 Boards: once the Draw's four Matches are played and their losers stay, two Winners
		 * Bracket Matches and two Losers Bracket Matches hold the Boards.
		 */
		const losers = await playTheDrawWithLosersStaying(user);

		expect(listBracketHeadings()).toEqual(['Winners Bracket', 'Losers Bracket']);
		const winnersRows = listMatchRowsIn('Winners Bracket');
		const losersRows = listMatchRowsIn('Losers Bracket');
		expect(winnersRows).toHaveLength(2);
		expect(losersRows).toHaveLength(2);
		for (const row of losersRows) {
			expect(listWinnerNames(row).every((name) => losers.includes(name))).toBe(true);
		}
		for (const row of winnersRows) {
			expect(listWinnerNames(row).some((name) => losers.includes(name))).toBe(false);
		}
		for (const rows of [winnersRows, losersRows]) {
			const boards = listBoardNumbers(rows);
			expect(boards).toEqual([...boards].sort((a, b) => a - b));
		}
	});

	it('names each Match’s Round, calling each bracket’s last Round the Final', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		expect(listMatchRows().map(readRoundName)).toEqual(Array(4).fill('Round 1'));
		await clickButton(user, 'Start');
		await playTheDrawWithLosersStaying(user);

		/*
		 * 8 Players: the Winners Bracket's second of three Rounds. The 4 who stayed make a Losers Bracket of two
		 * Rounds, its first being played.
		 */
		expect(listMatchRowsIn('Winners Bracket').map(readRoundName)).toEqual([
			'Round 2',
			'Round 2',
		]);
		expect(listMatchRowsIn('Losers Bracket').map(readRoundName)).toEqual([
			'Round 1',
			'Round 1',
		]);

		// The Losers Bracket's second Round is its last: the Final, though the Winners Bracket has one more.
		await playEveryMatchIn(user, 'Losers Bracket');
		expect(listMatchRowsIn('Losers Bracket').map(readRoundName)).toEqual(['Final']);
		await playEveryMatchIn(user, 'Winners Bracket');
		expect(listMatchRowsIn('Winners Bracket').map(readRoundName)).toEqual(['Final']);
	});

	it('lists the Matches waiting for a Board, in turn', async () => {
		const user = showOrganizer();
		const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'];
		await makeTheDraw(user, names, '3');
		await clickButton(user, 'Start');
		expect(screen.queryByRole('list', { name: 'Waiting for a Board' })).not.toBeInTheDocument();

		/*
		 * 6 Players on 3 Boards: once the Draw's three Matches are played and their losers stay, the
		 * Losers Bracket is one Match on a Board and a Bye Player waiting for one.
		 */
		await playTheDrawWithLosersStaying(user);

		// 3 stayed, so the Losers Bracket has 2 Rounds: the Bye Player waits in its Final.
		expect(listWaitingText()).toEqual([
			expect.stringMatching(/^Losers Bracket · Final.+ vs Winner of .+ \/ .+$/),
		]);
	});

	it('lists each bracket’s results apart, latest first, though their Rounds and places match', async () => {
		const user = showOrganizer();
		const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'];
		await makeTheDraw(user, names, '4');
		await clickButton(user, 'Start');
		const losers = await playTheDrawWithLosersStaying(user);
		const isLosersRow = (row: HTMLElement) => {
			const [firstName] = listWinnerNames(row);
			return losers.includes(firstName);
		};
		const findLosersRow = () => listMatchRows().find(isLosersRow)!;
		const findWinnersRow = () =>
			listMatchRows().find((row) => listWinnerNames(row).length > 0 && !isLosersRow(row))!;
		const recordFirstNamedWinIn = (row: HTMLElement) =>
			recordWin(user, row, listWinnerNames(row)[0]);

		// Round 2 of the Winners Bracket, then the Losers Bracket's first Round and its Round 2 final.
		await recordFirstNamedWinIn(findWinnersRow());
		await recordFirstNamedWinIn(findLosersRow());
		const [winnerOfFinal, loserOfFinal] = listWinnerNames(findLosersRow());
		await recordFirstNamedWinIn(findLosersRow());

		const results = listResults();
		expect(results[0]).toMatch(/^Losers Bracket · Final/);
		expect(results[0]).toContain(`${winnerOfFinal} beat ${loserOfFinal}`);
		expect(new Set(results).size).toBe(results.length);
		// The Winners final: its two Players' earlier result can no longer be undone, so its row goes.
		const [champion, runnerUp] = listWinnerNames(findWinnersRow());
		await recordFirstNamedWinIn(findWinnersRow());

		const afterFinal = listResults();
		expect(afterFinal[0]).toMatch(/^Winners Bracket · Final/);
		expect(afterFinal[0]).toContain(`${champion} beat ${runnerUp}`);
		expect(afterFinal).toHaveLength(2);
	});

	it('undoes a result, re-opening the Match so the other Player can be recorded as its winner', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		const playing = findPlayingRow();
		const [winner, loser] = listWinnerNames(playing);
		await recordWin(user, playing, winner);
		await answerDialog(user, 'Leaving');
		expect(listMatchRows()).toHaveLength(1);
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${winner} beat ${loser}Undo`,
		]);

		await clickButton(user, 'Undo');

		expect(listMatchRows()).toHaveLength(2);
		const reopened = findPlayingRow();
		expect(reopened).toHaveTextContent(/^Board 1/);
		expect(listWinnerNames(reopened)).toEqual([winner, loser]);
		expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
		await recordWin(user, reopened, loser);
		await answerDialog(user, 'Leaving');
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${loser} beat ${winner}Undo`,
		]);
	});

	it('sets how long the TV shows each screen, from 20 seconds, before or after Start', async () => {
		const user = showOrganizer();
		const getSecondsBox = () => screen.getByLabelText('Seconds per TV screen');
		expect(getSecondsBox()).toHaveValue('20');

		await enterNumber(user, 'Seconds per TV screen', '30');
		cleanup();
		showOrganizer();
		expect(getSecondsBox()).toHaveValue('30');

		await makeTheDraw(user, ['Dave K.', 'Big Dave'], '1');
		await clickButton(user, 'Start');
		await enterNumber(user, 'Seconds per TV screen', '45');
		cleanup();
		showOrganizer();
		expect(getSecondsBox()).toHaveValue('45');
	});

	it('saves a screen time only once the Organizer leaves the box or presses Enter', async () => {
		let user = showOrganizer();
		const getSecondsBox = () => screen.getByLabelText('Seconds per TV screen');

		await typeNumber(user, 'Seconds per TV screen', '30');
		cleanup();
		user = showOrganizer();
		expect(getSecondsBox()).toHaveValue('20');

		await typeNumber(user, 'Seconds per TV screen', '30');
		await user.tab();
		cleanup();
		user = showOrganizer();
		expect(getSecondsBox()).toHaveValue('30');

		await enterNumber(user, 'Seconds per TV screen', '45');
		cleanup();
		showOrganizer();
		expect(getSecondsBox()).toHaveValue('45');
	});

	it('shows why a screen time is refused, beside it, once the Organizer is done typing', async () => {
		const user = showOrganizer();

		await typeNumber(user, 'Seconds per TV screen', '0');
		expect(getRefusalIn('TV screens')).toBeEmptyDOMElement();
		await user.keyboard('{Enter}');

		expect(getRefusalIn('TV screens')).toHaveTextContent(
			'The TV shows each screen for a whole number of seconds above zero, like 20.',
		);
		expect(getRefusalIn('Boards')).toBeEmptyDOMElement();
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Seconds per TV screen')).toHaveValue('20');
	});

	it('offers the TV’s screens only once Started, Auto chosen, and saves the screen the Organizer holds', async () => {
		const user = showOrganizer();
		expect(screen.queryByRole('group', { name: 'TV shows' })).not.toBeInTheDocument();
		await makeTheDraw(user, ['Dave K.', 'Big Dave'], '1');
		expect(screen.queryByRole('group', { name: 'TV shows' })).not.toBeInTheDocument();

		await clickButton(user, 'Start');
		expect(listTvChoices()).toEqual(['Auto', 'Winners Bracket']);
		expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked();

		await user.click(screen.getByRole('radio', { name: 'Winners Bracket' }));
		cleanup();
		showOrganizer();
		expect(screen.getByRole('radio', { name: 'Winners Bracket' })).toBeChecked();
	});

	it('offers the finished Tournament’s screens, the champions first', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave'], '1');
		await clickButton(user, 'Start');

		const [champion] = listWinnerNames(findPlayingRow());
		await recordWin(user, findPlayingRow(), champion);
		await answerDialog(user, 'Leaving');

		expect(listTvChoices()).toEqual(['Auto', 'Champion', 'Winners Bracket']);
		expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked();
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('offers Match laptop, Light and Dark in the theme menu, Match laptop chosen at first, and draws the screen in the one picked', async () => {
		const user = showOrganizer();
		expect(readScreenTheme()).toBe('light');

		await openThemeMenu(user);
		expect(listThemeChoices()).toEqual([
			{ name: 'Match laptop', isChosen: true },
			{ name: 'Light', isChosen: false },
			{ name: 'Dark', isChosen: false },
		]);
		await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));

		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(readScreenTheme()).toBe('dark');
		await openThemeMenu(user);
		expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toBeChecked();
	});

	it('works the theme menu by keyboard: opens on the chosen theme, moves with the arrows, picks with Enter, and closes on Escape', async () => {
		const user = showOrganizer();
		const themeButton = screen.getByRole('button', { name: 'Theme' });
		themeButton.focus();

		await user.keyboard('{Enter}');
		expect(screen.getByRole('menuitemradio', { name: 'Match laptop' })).toHaveFocus();
		await user.keyboard('{ArrowDown}{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Match laptop' })).toHaveFocus();
		await user.keyboard('{ArrowUp}{Enter}');

		expect(readScreenTheme()).toBe('dark');
		expect(themeButton).toHaveFocus();
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(themeButton).toHaveFocus();
		expect(readScreenTheme()).toBe('dark');
	});

	it('follows the laptop on Match laptop, even when it turns dark or light while the screen is open', async () => {
		setLaptopScheme('dark');
		const user = showOrganizer();
		expect(readScreenTheme()).toBe('dark');

		setLaptopScheme('light');
		expect(readScreenTheme()).toBe('light');

		await chooseTheme(user, 'Light');
		setLaptopScheme('dark');
		expect(readScreenTheme()).toBe('light');
	});

	it('keeps the theme chosen through a new Tournament and when reopened', async () => {
		const user = showOrganizer();
		await chooseTheme(user, 'Dark');

		await clickButton(user, 'Start a new Tournament');
		await answerDialog(user, 'Start a new Tournament');
		expect(readScreenTheme()).toBe('dark');
		cleanup();
		const reopenedUser = showOrganizer();

		expect(readScreenTheme()).toBe('dark');
		await openThemeMenu(reopenedUser);
		expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toBeChecked();
	});

	it('draws the screen to match the laptop when the saved theme is one the menu no longer offers', async () => {
		createLocalStorageStore<string>(themeKey, themeChoiceVersion).save('christmas');
		setLaptopScheme('dark');
		const user = showOrganizer();

		expect(readScreenTheme()).toBe('dark');
		await openThemeMenu(user);
		expect(screen.getByRole('menuitemradio', { name: 'Match laptop' })).toBeChecked();
	});

	it('moves focus in the theme menu to the theme under the pointer, the chosen theme keeping its tick', async () => {
		const user = showOrganizer();
		await chooseTheme(user, 'Light');
		await openThemeMenu(user);
		const darkItem = screen.getByRole('menuitemradio', { name: 'Dark' });
		const lightItem = screen.getByRole('menuitemradio', { name: 'Light' });

		await user.hover(darkItem);

		expect(darkItem).toHaveFocus();
		expect(lightItem).toBeChecked();
		expect(darkItem).not.toBeChecked();
	});
});

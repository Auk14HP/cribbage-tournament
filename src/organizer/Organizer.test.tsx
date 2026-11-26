// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';
import {
	listWaitingBadges,
	listWaitingText,
	playIntoLosersBracket,
	readTextAloud,
	saveTournament,
	setUpDraw,
	waitSeconds,
} from '../screenTestHelpers';
import { createLocalStorageStore, type Store } from '../storage';
import {
	chooseTvScreen,
	getChampions,
	getMatchesOnBoards,
	makeDraw,
	recordForfeit,
	setBoardCount as setBoardCountOn,
	showHouseRules as showHouseRulesOn,
	start,
	tournamentVersion,
	type BracketName,
	type MatchOnBoard,
	type Player,
	type Tournament,
} from '../tournament';
import {
	createSeededRandom,
	expectOk,
	hasBothPlayersKnown,
	playDrawStaying,
	recordWin as recordWinOn,
	registerPlayers,
} from '../tournament/testSetup';
import { themeChoiceVersion, type ThemeChoice } from './themes';
import { tvHeartbeatVersion, type TvHeartbeat } from '../tvHeartbeat';

const key = 'organizer-test';
const themeKey = 'organizer-theme-test';
const heartbeatKey = 'organizer-heartbeat-test';

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
	/*
	 * The browser's `window.matchMedia(query)` answers whether a CSS media query fits the page now, such as
	 * `(prefers-color-scheme: dark)` while the laptop is set dark, and tells listeners when the answer changes.
	 * `matches` is a getter, so each read answers for the laptop's setting at that moment, as the browser's does.
	 */
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
	vi.useRealTimers();
	cleanup();
	localStorage.clear();
	isLaptopDark = false;
});

type User = ReturnType<typeof userEvent.setup>;

const showOrganizer = () => {
	showOrganizerWithStore();
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

// Every refusal line holding a refusal, wherever it is on the screen.
const listRefusalsShown = () =>
	screen.getAllByRole('alert').filter((line) => line.textContent !== '');

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

// The line saying how many House Rules the TV shows: "2 of 4 on the TV".
const readHouseRulesShown = () => screen.getByText(/^\d+ of \d+ on the TV$/).textContent;

// Each House Rule card's tag, in order: "ON THE TV" for those shown, "NEXT" for the next, '' for the rest.
const listHouseRuleTags = () => {
	const houseRulesList = within(screen.getByRole('list', { name: 'House Rules' }));
	return houseRulesList
		.getAllByRole('listitem')
		.map((card) => /(ON THE TV|NEXT)$/.exec(card.textContent)?.[1] ?? '');
};

// The House Rules step's main button, which shows the next House Rule on the TV.
const findShowRuleButton = () =>
	screen.getByRole('button', { name: /^Show rule \d on the TV$|^Every rule is on the TV$/ });

/*
 * The tiles of every Match on a Board, bracket by bracket. Each recorded result re-renders them, so they are
 * looked up afresh each time.
 */
const listMatchTiles = () =>
	within(screen.getByRole('region', { name: 'Matches' })).getAllByRole('listitem');

// The tiles of one bracket's Matches on a Board.
const listMatchTilesIn = (bracketTitle: string) =>
	within(screen.getByRole('list', { name: bracketTitle })).getAllByRole('listitem');

// The headings of the brackets with Matches on a Board, in the order shown.
const listBracketHeadings = () =>
	within(screen.getByRole('region', { name: 'Matches' }))
		.getAllByRole('heading')
		.map((heading) => heading.textContent);

/*
 * What a bracket's panel of Matches on a Board says in its header: its badge's letter, and its Rounds and
 * how many Boards it holds ("Round 2 · 3 Boards").
 */
const readBracketPanel = (bracketTitle: string) => {
	const bracketPanel = within(screen.getByRole('region', { name: bracketTitle }));
	return {
		badge: bracketPanel.getByTestId('bracket badge').textContent,
		summary: bracketPanel.getByText(/ Boards?$/).textContent,
	};
};

// A Round's name as a Match tile shows it, after its Board: "Round 2" or "Final".
const roundName = /Round \d+|Final/.source;

// The Round a Match tile names, after its Board, if it names one.
const readRoundName = (tile: HTMLElement) =>
	tile.textContent!.match(new RegExp(`^Board \\d+(${roundName})`))?.[1];

// The Board numbers of a list of Match tiles, in the order shown.
const listBoardNumbers = (tiles: HTMLElement[]) =>
	tiles.map((tile) => Number(tile.textContent!.match(/^Board (\d+)/)![1]));

// Whether a Match tile is a Bye Player waiting for a first-Round Match's winner.
const isWaitingForWinner = (tile: HTMLElement) => tile.textContent!.includes(' vs Winner of ');

// The tile of the Bye Player waiting for a winner.
const findTileAwaitingWinner = () => listMatchTiles().find(isWaitingForWinner)!;

// The tile of the one Match with both Players known, in a Draw of 3 Players.
const findPlayingTile = () => listMatchTiles().find((tile) => !isWaitingForWinner(tile))!;

// The name of the Bye Player waiting for a winner.
const readByePlayerName = () =>
	findTileAwaitingWinner().textContent!.match(
		new RegExp(`^Board \\d+(?:${roundName})(.+) vs Winner of`),
	)![1];

// The names on a Match tile's buttons: in Swap mode, its Players known.
const listButtonNames = (tile: HTMLElement) =>
	within(tile)
		.queryAllByRole('button')
		.map((b) => b.textContent!);

// The names on a Match tile's winner buttons: both its Players, once it is being played.
const listWinnerNames = (tile: HTMLElement) =>
	listButtonNames(tile).filter((name) => name !== 'Forfeit');

// What each Match tile reads, in the order shown.
const listMatchTileTexts = () => listMatchTiles().map((tile) => tile.textContent);

// The tile of the Match on a Board that a Player is in.
const findTileOf = (name: string) =>
	listMatchTiles().find((tile) => within(tile).queryByText(name) !== null)!;

// Taps a Player's name in Swap mode.
const tapPlayer = (user: User, name: string) => clickButton(user, name);

// The Players' buttons pressed in Swap mode: the Player picked, if any.
const listPickedButtons = () => screen.queryAllByRole('button', { pressed: true });

// The button of a Player in Swap mode, found by their name.
const findPlayerButton = (name: string) => screen.getByRole('button', { name });

// Swap mode's banner above the Matches, which says what the next tap does and holds Done.
const findSwapBanner = () => within(screen.getByRole('region', { name: 'Swap mode' }));

// Swap mode's banner, if it is showing.
const querySwapBanner = () => screen.queryByRole('region', { name: 'Swap mode' });

const recordWin = (user: User, tile: HTMLElement, winner: string) =>
	user.click(within(tile).getByRole('button', { name: winner }));

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
	for (const tile of listMatchTiles()) {
		const [winner, loser] = listWinnerNames(tile);
		losers.push(loser);
		await recordWin(user, tile, winner);
		await answerDialog(user, 'Staying');
	}
	return losers;
};

// Records the first-named Player as the winner of each of a bracket's Matches now on a Board.
const playEveryMatchIn = async (user: User, bracketTitle: string) => {
	for (const tile of listMatchTilesIn(bracketTitle)) {
		const [winner] = listWinnerNames(tile);
		await recordWin(user, tile, winner);
	}
};

const listResults = () =>
	within(screen.getByRole('list', { name: 'Results' }))
		.getAllByRole('listitem')
		.map((item) => item.textContent);

// What each champion's card reads, in the order shown: its bracket's badge, its title, the name and the Final.
const listChampionCards = () =>
	screen.queryAllByRole('region', { name: /champion$/ }).map((card) => card.textContent);

// The choices of what the TV shows, by their labels.
const listTvChoices = () => {
	const choices = within(screen.getByRole('group', { name: 'TV shows' }));
	return choices
		.getAllByRole('radio')
		.map((radio) => (radio as HTMLInputElement).labels![0].textContent);
};

// The running count of Players registered, in the Organizer's Players panel rather than the TV's thumbnail.
const readPlayerCount = () => {
	const playersPanel = within(screen.getByRole('region', { name: 'Players' }));
	return playersPanel.getByText(/ registered$/).textContent;
};

const listPlayerNames = () =>
	within(screen.getByRole('list', { name: 'Players' }))
		.queryAllByRole('listitem')
		.map((item) => item.querySelector('span')?.textContent);

// A Player's cell in the Players grid, the one holding the Rename button that names them.
const findPlayerCell = (name: string) => {
	const playersGrid = within(screen.getByRole('list', { name: 'Players' }));
	const cells = playersGrid.getAllByRole('listitem');
	return cells.find((cell) => within(cell).queryByRole('button', { name: `Rename ${name}` }))!;
};

// Replaces what the renaming Player's name box holds with the keys typed.
const typeNewName = async (user: User, name: string, keys: string) => {
	const newNameBox = screen.getByLabelText(`New name for ${name}`);
	await user.clear(newNameBox);
	await user.type(newNameBox, keys);
};

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

// The step bar: Register, House Rules, Draw, Now playing and Finished.
const getStepBar = () => screen.getByRole('list', { name: 'Tournament steps' });

// The step the step bar marks as the current one.
const readCurrentStep = () =>
	within(getStepBar()).getByRole('listitem', { current: 'step' }).textContent;

describe('the organizer route', () => {
	it('marks the phase’s step current in the step bar, from Register to Finished, offering no controls there', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');
		await setBoardCount(user, '1');
		// The step bar stays on screen through every phase, so it is found once.
		const stepBar = within(getStepBar());
		const steps = stepBar.getAllByRole('listitem').map((step) => step.textContent);
		expect(steps).toEqual(['Register', 'House Rules', 'Draw', 'Now playing', 'Finished']);
		expect(readCurrentStep()).toBe('Register');

		await showHouseRules(user);
		expect(readCurrentStep()).toBe('House Rules');

		await confirmDraw(user);
		expect(readCurrentStep()).toBe('Draw');

		await clickButton(user, 'Start');
		expect(readCurrentStep()).toBe('Now playing');

		await winTheFinal(user);
		expect(readCurrentStep()).toBe('Finished');

		expect(stepBar.queryAllByRole('button')).toEqual([]);
		expect(stepBar.queryAllByRole('link')).toEqual([]);
	});

	it('registers a Player, lists them with the running count, and clears the name box', async () => {
		const user = showOrganizer();

		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		expect(listPlayerNames()).toEqual(['Dave K.', 'Big Dave']);
		expect(readPlayerCount()).toBe('2 Players registered');
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

	it('renames a Player in their own cell, saving on Enter', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');
		await register(user, 'Sue');

		await clickButton(user, 'Rename Dave K');
		await typeNewName(user, 'Dave K', 'Dave K.{Enter}');

		expect(listPlayerNames()).toEqual(['Dave K.', 'Sue']);
		expect(screen.queryByLabelText(/^New name for /)).not.toBeInTheDocument();
	});

	it('saves a new name with the Player’s Save button', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');

		await clickButton(user, 'Rename Dave K');
		await typeNewName(user, 'Dave K', 'Dave K.');
		await clickButton(user, 'Save new name for Dave K');

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('cancels a rename on Escape or the Player’s Cancel button, keeping the name', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');

		await clickButton(user, 'Rename Dave K');
		await typeNewName(user, 'Dave K', 'Davey{Escape}');
		expect(screen.queryByLabelText('New name for Dave K')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Rename Dave K' })).toHaveFocus();

		await clickButton(user, 'Rename Dave K');
		await typeNewName(user, 'Dave K', 'Davey');
		await clickButton(user, 'Cancel renaming Dave K');

		expect(listPlayerNames()).toEqual(['Dave K']);
		expect(screen.queryByLabelText('New name for Dave K')).not.toBeInTheDocument();
	});

	it('shows why a rename is refused, keeping the new name to fix', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');
		await register(user, 'Sue');

		await clickButton(user, 'Rename Dave K');
		await typeNewName(user, 'Dave K', 'Sue{Enter}');

		expect(getRefusalIn('Players')).toHaveTextContent(
			'There is already a Player called "Sue".',
		);
		expect(screen.getByLabelText('New name for Dave K')).toHaveValue('Sue');
		await user.keyboard('{Escape}');
		expect(getRefusalIn('Players')).toBeEmptyDOMElement();
	});

	it('removes a Player with their own Remove button', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		await clickButton(user, 'Remove Dave K.');

		expect(listPlayerNames()).toEqual(['Big Dave']);
		expect(readPlayerCount()).toBe('1 Player registered');
	});

	it('tags the Player with a Home Board with its number', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');
		await setBoardCount(user, '4');

		await user.selectOptions(screen.getByLabelText('Board'), '3');
		await user.selectOptions(screen.getByLabelText('Home Board for'), 'Big Dave');

		expect(findPlayerCell('Big Dave')).toHaveTextContent('Home Board 3');
		expect(findPlayerCell('Dave K.')).not.toHaveTextContent('Home Board');
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
		expect(readPlayerCount()).toBe('0 Players registered');
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
		const sueTile = listMatchTiles().find((tile) => tile.textContent!.includes('Sue'))!;
		expect(sueTile).toHaveTextContent(/^Board 3/);
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

		expect(getRefusalIn('Make the Draw')).toHaveTextContent(
			'The Draw needs at least one Board.',
		);
	});

	it('offers Show House Rules in place of Make the Draw, starting with no House Rule shown', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		expect(screen.queryByRole('button', { name: 'Make the Draw' })).not.toBeInTheDocument();

		await showHouseRules(user);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('House Rules');
		expect(readHouseRulesShown()).toBe('0 of 4 on the TV');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Make the Draw' })).toBeInTheDocument();
	});

	it('shows the House Rules one at a time with Show rule N, hides the latest with Back, and shows every one with Show all', async () => {
		const user = showOrganizer();
		await showHouseRules(user);
		expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

		await clickButton(user, 'Show rule 1 on the TV');
		await clickButton(user, 'Show rule 2 on the TV');
		expect(readHouseRulesShown()).toBe('2 of 4 on the TV');
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('1 of 4 on the TV');
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('0 of 4 on the TV');
		expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

		await clickButton(user, 'Show all');
		expect(readHouseRulesShown()).toBe('4 of 4 on the TV');
		expect(findShowRuleButton()).toHaveAccessibleName('Every rule is on the TV');
		expect(findShowRuleButton()).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Show all' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
		await clickButton(user, 'Back');
		expect(readHouseRulesShown()).toBe('3 of 4 on the TV');
		expect(findShowRuleButton()).toHaveAccessibleName('Show rule 4 on the TV');
		expect(findShowRuleButton()).toBeEnabled();
	});

	it('tags the House Rules on the TV and the next one, and leaves the rest untagged', async () => {
		const user = showOrganizer();
		await showHouseRules(user);
		expect(listHouseRuleTags()).toEqual(['NEXT', '', '', '']);

		await clickButton(user, 'Show rule 1 on the TV');
		await clickButton(user, 'Show rule 2 on the TV');
		expect(listHouseRuleTags()).toEqual(['ON THE TV', 'ON THE TV', 'NEXT', '']);

		await clickButton(user, 'Show all');
		expect(listHouseRuleTags()).toEqual(['ON THE TV', 'ON THE TV', 'ON THE TV', 'ON THE TV']);
	});

	it('warns beside Make the Draw that registration closes once the Draw is made', async () => {
		const user = showOrganizer();
		await showHouseRules(user);

		expect(screen.getByRole('region', { name: 'Make the Draw' })).toHaveTextContent(
			'Registration closes: no Player can be added, renamed or removed afterwards.',
		);
	});

	it('goes back to registration for a late arrival, then returns with the same House Rules shown', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await showHouseRules(user);
		await clickButton(user, 'Show rule 1 on the TV');
		await clickButton(user, 'Show rule 2 on the TV');

		await clickButton(user, 'Back to registration for a late arrival');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		await register(user, 'Big Dave');
		expect(listPlayerNames()).toEqual(['Dave K.', 'Big Dave']);

		await showHouseRules(user);
		expect(readHouseRulesShown()).toBe('2 of 4 on the TV');
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
		await clickButton(user, 'Show rule 1 on the TV');
		cleanup();

		showOrganizer();

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('House Rules');
		expect(readHouseRulesShown()).toBe('1 of 4 on the TV');
	});

	it('makes the Draw with fewer Boards than Matches, listing the rest as waiting for a Board', async () => {
		const user = showOrganizer();
		// 3 Players on 1 Board: the first-Round Match takes it, and the Bye Player waits for one.
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '1');

		expect(listMatchTiles()).toHaveLength(1);
		// 3 Players in a 4-place bracket: the Bye Player waits for the first Round's winner in the Final.
		expect(listWaitingText()).toEqual([
			expect.stringMatching(/^Winners Bracket · Final.+ vs Winner of .+ \/ .+$/),
		]);
		expect(listWaitingBadges()).toEqual(['W']);
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
		expect(listMatchTiles()).toHaveLength(2);
		expect(findTileAwaitingWinner()).toHaveTextContent(/^Board \d+.+ vs Winner of .+ \/ .+$/);
		const byePlayerName = readByePlayerName();
		for (const name of ['Dave K.', 'Big Dave', 'Sue'].filter((n) => n !== byePlayerName)) {
			expect(findPlayingTile()).toHaveTextContent(name);
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

		expect(querySwapBanner()).not.toBeInTheDocument();

		await clickButton(user, 'Swap Players');

		expect(findSwapBanner().getByText('Tap two Players to swap them.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Start' })).toHaveAccessibleDescription(
			'Press Done to finish swapping first.',
		);
		expect(screen.queryByRole('button', { name: 'Swap Players' })).not.toBeInTheDocument();
		await user.click(findSwapBanner().getByRole('button', { name: 'Done' }));
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
		expect(screen.queryByText('Press Done to finish swapping first.')).not.toBeInTheDocument();
		expect(querySwapBanner()).not.toBeInTheDocument();
		await clickButton(user, 'Start');
		expect(screen.queryByRole('button', { name: 'Swap Players' })).not.toBeInTheDocument();
	});

	it('swaps two Players in different Matches with two taps, staying in Swap mode, and swaps them back', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		const drawnTiles = listMatchTileTexts();
		const [firstTile] = listMatchTiles();
		expect(listButtonNames(firstTile)).toEqual([]);
		await clickButton(user, 'Swap Players');
		const [, , thirdTile] = listMatchTiles();
		const [ann, bob] = listButtonNames(firstTile);
		const [cat, dan] = listButtonNames(thirdTile);

		await tapPlayer(user, ann);
		expect(listPickedButtons()).toEqual([findPlayerButton(ann)]);
		expect(within(findPlayerButton(ann)).getByText('PICKED')).toBeInTheDocument();
		expect(
			findSwapBanner().getByText(`${ann} is picked. Tap another Player to swap them.`),
		).toBeInTheDocument();
		await tapPlayer(user, dan);

		expect(findTileOf(dan)).toHaveTextContent(`${dan} vs ${bob}`);
		expect(findTileOf(ann)).toHaveTextContent(`${cat} vs ${ann}`);
		expect(listPickedButtons()).toEqual([]);
		expect(screen.queryByText('PICKED')).not.toBeInTheDocument();
		expect(findSwapBanner().getByText('Tap two Players to swap them.')).toBeInTheDocument();
		await tapPlayer(user, dan);
		await tapPlayer(user, ann);
		expect(listMatchTileTexts()).toEqual(drawnTiles);
	});

	it('clears the pick, swapping no one, when the picked Player or their opponent is tapped', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		const drawnTiles = listMatchTileTexts();
		await clickButton(user, 'Swap Players');
		const [firstTile] = listMatchTiles();
		const [ann, bob] = listButtonNames(firstTile);

		await tapPlayer(user, ann);
		await tapPlayer(user, ann);
		expect(listPickedButtons()).toEqual([]);
		await tapPlayer(user, ann);
		await tapPlayer(user, bob);
		expect(listPickedButtons()).toEqual([]);

		expect(listMatchTileTexts()).toEqual(drawnTiles);
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
		const [firstTile] = listMatchTiles();
		const [playerA, playerB] = listButtonNames(firstTile);

		await tapPlayer(user, byePlayer);
		await tapPlayer(user, playerA);
		await clickButton(user, 'Done');

		expect(findTileOf(byePlayer)).toHaveTextContent(`${byePlayer} vs ${playerB}`);
		expect(listWaitingText()).toEqual([
			`Winners Bracket · Final${playerA} vs Winner of ${byePlayer} / ${playerB}`,
		]);
	});

	it('keeps the Swaps when reopened, but not Swap mode', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		await clickButton(user, 'Swap Players');
		const [firstTile, secondTile] = listMatchTiles();
		const [ann] = listButtonNames(firstTile);
		const [, dan] = listButtonNames(secondTile);
		await tapPlayer(user, ann);
		await tapPlayer(user, dan);
		const swappedTiles = listMatchTileTexts();
		await tapPlayer(user, ann);
		cleanup();

		showOrganizer();

		expect(listMatchTileTexts()).toEqual(swappedTiles);
		expect(querySwapBanner()).not.toBeInTheDocument();
		expect(listPickedButtons()).toEqual([]);
		expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
	});

	it('records each Match’s winner with one tap, through to the champion', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		const byePlayerName = readByePlayerName();
		// Before Start, no winner can be recorded.
		const drawnTile = findPlayingTile();
		expect(within(drawnTile).queryAllByRole('button')).toEqual([]);
		await clickButton(user, 'Start');

		// Board 2's Bye Player waits for Board 1's winner, so only Board 1 can be won yet.
		const playingTile = findPlayingTile();
		const waitingTile = findTileAwaitingWinner();
		expect(within(waitingTile).queryAllByRole('button')).toEqual([]);
		const [winner, loser] = within(playingTile)
			.getAllByRole('button')
			.map((b) => b.textContent!);
		await recordWin(user, playingTile, winner);
		await answerDialog(user, 'Leaving');

		// The winner joins the Bye Player at Board 2, and Board 1 frees.
		const matches = listMatchTiles();
		expect(matches).toHaveLength(1);
		const [final] = matches;
		expect(final).toHaveTextContent(/^Board 2/);
		expect(final).toHaveTextContent(winner);
		expect(final).not.toHaveTextContent(loser);
		await recordWin(user, final, byePlayerName);

		expect(screen.queryByRole('region', { name: 'Matches' })).not.toBeInTheDocument();
		expect(listChampionCards()).toEqual([
			`WChampion${byePlayerName}beat ${winner} in the Final`,
		]);
	});

	it('shows the champion on a card naming whom they beat in the Final, gone again once the Final is undone', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		// 3 Players: two play on Board 1, and the Bye Player waits at Board 2 in the Final for its winner.
		const byePlayerName = readByePlayerName();
		const [winner] = listWinnerNames(findPlayingTile());
		await recordWin(user, findPlayingTile(), winner);
		await answerDialog(user, 'Leaving');
		expect(listChampionCards()).toEqual([]);

		// The first loser left, so no Losers Bracket can open: the Bye Player isn't asked whether they are staying.
		const [final] = listMatchTiles();
		await recordWin(user, final, winner);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tournament finished');
		expect(listChampionCards()).toEqual([
			`WChampion${winner}beat ${byePlayerName} in the Final`,
		]);

		await clickButton(user, 'Undo');

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
		expect(listChampionCards()).toEqual([]);
		expect(listWinnerNames(findPlayingTile()).sort()).toEqual([winner, byePlayerName].sort());
	});

	it('shows each bracket’s champion on a card, the Winners Bracket’s first, saying when the Final was a Forfeit', () => {
		const { tournament, finals } = playToTheEndForfeitingLosersBracket(playIntoLosersBracket());
		showOrganizerWithStore(tournament);

		const [winnersChampion, runnerUp] = finals.winners;
		const [losersChampion, leaver] = finals.losers;
		expect(listChampionCards()).toEqual([
			`WChampion${winnersChampion}beat ${runnerUp} in the Final`,
			`LLosers Bracket champion${losersChampion}won the Final when ${leaver} forfeited`,
		]);
	});

	it('shows the Losers Bracket champion’s card below the Matches while the Winners Bracket is still played', () => {
		const intoLosersBracket = playIntoLosersBracket();
		showOrganizerWithStore(playLosersBracketToItsChampion(intoLosersBracket));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
		expect(listChampionCards()).toEqual([
			expect.stringMatching(/^LLosers Bracket champion.+ in the Final$/),
		]);
		const matches = screen.getByRole('region', { name: 'Matches' });
		const losersCard = screen.getByRole('region', { name: 'Losers Bracket champion' });
		expect(listBracketHeadings()).toEqual(['Winners Bracket']);
		expect(isPlacedAfter(matches, losersCard)).toBe(true);
	});

	it('records a Forfeit once the Organizer says who is forfeiting, and their opponent wins', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		// 3 Players: two play on Board 1, and the Bye Player waits at Board 2 for its winner.
		const playing = findPlayingTile();
		const waiting = findTileAwaitingWinner();
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
		expect(listMatchTiles()).toHaveLength(2);

		await user.click(within(playing).getByRole('button', { name: 'Forfeit' }));
		await answerDialog(user, leaves);
		await answerDialog(user, 'Leaving');

		const [final] = listMatchTiles();
		expect(listMatchTiles()).toHaveLength(1);
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
		const playing = findPlayingTile();
		const [winner, loser] = listWinnerNames(playing);

		await recordWin(user, playing, winner);
		expect(screen.getByRole('dialog')).toHaveTextContent(
			`Is ${loser} staying for the Losers Bracket?`,
		);
		await answerDialog(user, 'Cancel');
		expect(listMatchTiles()).toHaveLength(2);
		expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();

		await recordWin(user, playing, winner);
		await answerDialog(user, 'Staying');
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${winner} beat ${loser}Undo`,
		]);

		// The Bye Player's first Match is the final, and a Forfeit asks too, about the Player leaving it.
		const [final] = listMatchTiles();
		const [, bye] = listWinnerNames(final);
		await user.click(within(final).getByRole('button', { name: 'Forfeit' }));
		await answerDialog(user, bye);
		expect(screen.getByRole('dialog')).toHaveTextContent(
			`Is ${bye} staying for the Losers Bracket?`,
		);
		await answerDialog(user, 'Leaving');
		expect(listChampionCards()).toEqual([
			`WChampion${winner}won the Final when ${bye} forfeited`,
		]);
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
		const winnersTiles = listMatchTilesIn('Winners Bracket');
		const losersTiles = listMatchTilesIn('Losers Bracket');
		expect(winnersTiles).toHaveLength(2);
		expect(losersTiles).toHaveLength(2);
		for (const tile of losersTiles) {
			expect(listWinnerNames(tile).every((name) => losers.includes(name))).toBe(true);
		}
		for (const tile of winnersTiles) {
			expect(listWinnerNames(tile).some((name) => losers.includes(name))).toBe(false);
		}
		for (const tiles of [winnersTiles, losersTiles]) {
			const boards = listBoardNumbers(tiles);
			expect(boards).toEqual([...boards].sort((a, b) => a - b));
		}
	});

	it('heads each bracket’s panel with its badge, its Round and how many Boards it holds', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		await clickButton(user, 'Start');
		// 8 Players on 4 Boards, the Draw played and its losers staying: 2 Boards in each bracket.
		await playTheDrawWithLosersStaying(user);

		expect(readBracketPanel('Winners Bracket')).toEqual({
			badge: 'W',
			summary: 'Round 2 · 2 Boards',
		});
		expect(readBracketPanel('Losers Bracket')).toEqual({
			badge: 'L',
			summary: 'Round 1 · 2 Boards',
		});
	});

	it('names every Round a bracket’s panel holds, and each Match’s Round only then', async () => {
		const user = showOrganizer();
		// 3 Players on 2 Boards: a first-Round Match, and the Bye Player waiting at the Final for its winner.
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');

		expect(readBracketPanel('Winners Bracket').summary).toBe('Round 1 and Final · 2 Boards');
		expect(listMatchTiles().map(readRoundName)).toEqual(['Round 1', 'Final']);

		await clickButton(user, 'Start');
		const [winner] = listWinnerNames(findPlayingTile());
		await recordWin(user, findPlayingTile(), winner);
		await answerDialog(user, 'Leaving');

		expect(readBracketPanel('Winners Bracket').summary).toBe('Final · 1 Board');
		expect(listMatchTiles().map(readRoundName)).toEqual([undefined]);
	});

	it('names each Match’s Round, calling each bracket’s last Round the Final', async () => {
		const user = showOrganizer();
		await drawEightPlayersOnFourBoards(user);
		expect(readBracketPanel('Winners Bracket').summary).toBe('Round 1 · 4 Boards');
		await clickButton(user, 'Start');
		await playTheDrawWithLosersStaying(user);

		/*
		 * 8 Players: the Winners Bracket's second of three Rounds. The 4 who stayed make a Losers Bracket of two
		 * Rounds, its first being played.
		 */
		expect(readBracketPanel('Winners Bracket').summary).toBe('Round 2 · 2 Boards');
		expect(readBracketPanel('Losers Bracket').summary).toBe('Round 1 · 2 Boards');

		// The Losers Bracket's second Round is its last: the Final, though the Winners Bracket has one more.
		await playEveryMatchIn(user, 'Losers Bracket');
		expect(readBracketPanel('Losers Bracket').summary).toBe('Final · 1 Board');
		await playEveryMatchIn(user, 'Winners Bracket');
		expect(readBracketPanel('Winners Bracket').summary).toBe('Final · 1 Board');
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
		expect(listWaitingBadges()).toEqual(['L']);
	});

	it('lists each bracket’s results apart, latest first, though their Rounds and places match', async () => {
		const user = showOrganizer();
		const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'];
		await makeTheDraw(user, names, '4');
		await clickButton(user, 'Start');
		const losers = await playTheDrawWithLosersStaying(user);
		const isLosersTile = (tile: HTMLElement) => {
			const [firstName] = listWinnerNames(tile);
			return losers.includes(firstName);
		};
		const findLosersTile = () => listMatchTiles().find(isLosersTile)!;
		const findWinnersTile = () =>
			listMatchTiles().find(
				(tile) => listWinnerNames(tile).length > 0 && !isLosersTile(tile),
			)!;
		const recordFirstNamedWinIn = (tile: HTMLElement) =>
			recordWin(user, tile, listWinnerNames(tile)[0]);

		// Round 2 of the Winners Bracket, then the Losers Bracket's first Round and its Round 2 final.
		await recordFirstNamedWinIn(findWinnersTile());
		await recordFirstNamedWinIn(findLosersTile());
		const [winnerOfFinal, loserOfFinal] = listWinnerNames(findLosersTile());
		await recordFirstNamedWinIn(findLosersTile());

		const results = listResults();
		expect(results[0]).toMatch(/^Losers Bracket · Final/);
		expect(results[0]).toContain(`${winnerOfFinal} beat ${loserOfFinal}`);
		expect(new Set(results).size).toBe(results.length);
		// The Winners final: its two Players' earlier result can no longer be undone, so its row goes.
		const [champion, runnerUp] = listWinnerNames(findWinnersTile());
		await recordFirstNamedWinIn(findWinnersTile());

		const afterFinal = listResults();
		expect(afterFinal[0]).toMatch(/^Winners Bracket · Final/);
		expect(afterFinal[0]).toContain(`${champion} beat ${runnerUp}`);
		expect(afterFinal).toHaveLength(2);
	});

	it('undoes a result, re-opening the Match so the other Player can be recorded as its winner', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await clickButton(user, 'Start');
		const playing = findPlayingTile();
		const [winner, loser] = listWinnerNames(playing);
		await recordWin(user, playing, winner);
		await answerDialog(user, 'Leaving');
		expect(listMatchTiles()).toHaveLength(1);
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${winner} beat ${loser}Undo`,
		]);

		await clickButton(user, 'Undo');

		expect(listMatchTiles()).toHaveLength(2);
		const reopened = findPlayingTile();
		expect(reopened).toHaveTextContent(/^Board 1/);
		expect(listWinnerNames(reopened)).toEqual([winner, loser]);
		expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
		await recordWin(user, reopened, loser);
		await answerDialog(user, 'Leaving');
		expect(listResults()).toEqual([
			`Winners Bracket · Round 1Board 1: ${loser} beat ${winner}Undo`,
		]);
	});

	it('sets how long the TV shows each screen, from 20 seconds, once it has screens to cycle', async () => {
		const user = showOrganizerCyclingScreens();
		const getSecondsBox = () => screen.getByLabelText('Seconds per TV screen');
		expect(getSecondsBox()).toHaveValue('20');

		await enterNumber(user, 'Seconds per TV screen', '45');
		cleanup();
		showOrganizer();
		expect(getSecondsBox()).toHaveValue('45');
	});

	it('saves a screen time only once the Organizer leaves the box or presses Enter', async () => {
		let user = showOrganizerCyclingScreens();
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
		const user = showOrganizerCyclingScreens();

		await typeNumber(user, 'Seconds per TV screen', '0');
		expect(getRefusalIn('TV Display')).toBeEmptyDOMElement();
		await user.keyboard('{Enter}');

		expect(getRefusalIn('TV Display')).toHaveTextContent(
			'The TV shows each screen for a whole number of seconds above zero, like 20.',
		);
		// Beside the box, and nowhere else.
		expect(listRefusalsShown()).toHaveLength(1);
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Seconds per TV screen')).toHaveValue('20');
	});

	it('offers the TV’s choice and seconds from Start, disabled until there are screens to cycle', async () => {
		const user = showOrganizer();
		expectTvControlsHidden();
		await makeTheDraw(user, ['Dave K.', 'Big Dave'], '1');
		expectTvControlsHidden();

		// Only the Winners Bracket to show: nothing to cycle yet.
		await clickButton(user, 'Start');
		expect(listTvChoices()).toEqual(['Winners Bracket']);
		expect(screen.getByRole('radio', { name: 'Winners Bracket' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Winners Bracket' })).toBeDisabled();
		expect(screen.getByLabelText('Seconds per TV screen')).toBeDisabled();

		// The champions' screen joins the Winners Bracket: two screens to cycle.
		await winTheFinal(user);
		expect(screen.getByRole('radio', { name: 'Auto' })).toBeEnabled();
		expect(screen.getByLabelText('Seconds per TV screen')).toBeEnabled();
	});

	it('offers the finished Tournament’s screens, the champions first, and saves the screen held', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave'], '1');
		await clickButton(user, 'Start');
		await winTheFinal(user);

		expect(listTvChoices()).toEqual(['Auto', 'Champion', 'Winners Bracket']);
		expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked();

		await user.click(screen.getByRole('radio', { name: 'Winners Bracket' }));
		cleanup();
		showOrganizer();
		expect(screen.getByRole('radio', { name: 'Winners Bracket' })).toBeChecked();
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('offers Same as laptop, Light and Dark in the theme menu, Same as laptop chosen at first, and draws the screen in the one picked', async () => {
		const user = showOrganizer();
		expect(readScreenTheme()).toBe('light');

		await openThemeMenu(user);
		expect(listThemeChoices()).toEqual([
			{ name: 'Same as laptop', isChosen: true },
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
		expect(screen.getByRole('menuitemradio', { name: 'Same as laptop' })).toHaveFocus();
		await user.keyboard('{ArrowDown}{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitemradio', { name: 'Same as laptop' })).toHaveFocus();
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

	it('follows the laptop on Same as laptop, even when it turns dark or light while the screen is open', async () => {
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
		expect(screen.getByRole('menuitemradio', { name: 'Same as laptop' })).toBeChecked();
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

describe('the TV Display panel', () => {
	it('shows a thumbnail of the screen the TV shows, named, on every phase', () => {
		vi.useFakeTimers();
		const store = showOrganizerWithStore();
		const registered = registerPlayers('Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev');
		saveTournament(store, registered);
		expect(readThumbnailName()).toBe('The TV showing Tonight’s Players');
		expect(listThumbnailPlayers()).toEqual(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev']);

		const withBoards = expectOk(setBoardCountOn(registered, '3'));
		const onHouseRules = expectOk(showHouseRulesOn(withBoards));
		saveTournament(store, onHouseRules);
		expect(readThumbnailName()).toBe('The TV showing House Rules');
		expect(readThumbnailHeading()).toBe('House Rules');

		const seededRandom = createSeededRandom(1);
		const drawn = expectOk(makeDraw(onHouseRules, seededRandom));
		saveTournament(store, drawn);
		expect(readThumbnailName()).toBe('The TV showing Tonight’s Draw');
		expect(readThumbnailHeading()).toBe('Tonight’s Draw');

		const started = expectOk(start(drawn));
		const intoLosersBracket = playDrawStaying(started);
		saveTournament(store, intoLosersBracket);
		expect(readThumbnailName()).toBe('The TV showing Winners Bracket');
		expect(readThumbnailHeading()).toBe('Winners Bracket');
		waitSeconds(19);
		expect(readThumbnailHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readThumbnailName()).toBe('The TV showing Losers Bracket');
		expect(readThumbnailHeading()).toBe('Losers Bracket');

		saveTournament(store, playToTheEnd(intoLosersBracket));
		expect(readThumbnailName()).toBe('The TV showing Champion');
		expect(readThumbnailHeading()).toBe('Tonight’s Champions');
	});

	it('shows a countdown strip that starts again with each screen, and none with nothing to count down to', () => {
		vi.useFakeTimers();
		const store = showOrganizerWithStore();
		expect(screen.queryByTestId('countdown strip')).not.toBeInTheDocument();
		const drawn = setUpDraw(['Dave K.', 'Big Dave'], { boards: 1 });
		saveTournament(store, drawn);
		expect(screen.queryByTestId('countdown strip')).not.toBeInTheDocument();
		// Only the Winners Bracket to show: one screen, so nothing to count down to.
		const startedWithOneScreen = expectOk(start(drawn));
		saveTournament(store, startedWithOneScreen);
		expect(screen.queryByTestId('countdown strip')).not.toBeInTheDocument();

		let tournament = playIntoLosersBracket();
		saveTournament(store, tournament);
		const firstCountdownStrip = screen.getByTestId('countdown strip');
		expect(firstCountdownStrip).toHaveAttribute('aria-hidden', 'true');
		expect(firstCountdownStrip).toHaveStyle({ '--countdown-duration': '20s' });
		waitSeconds(19);
		expect(screen.getByTestId('countdown strip')).toBe(firstCountdownStrip);
		waitSeconds(1);
		const secondCountdownStrip = screen.getByTestId('countdown strip');
		expect(secondCountdownStrip).not.toBe(firstCountdownStrip);
		expect(secondCountdownStrip).toHaveStyle({ '--countdown-elapsed': '0s' });

		tournament = expectOk(chooseTvScreen(tournament, 'losersBracket'));
		saveTournament(store, tournament);
		expect(screen.queryByTestId('countdown strip')).not.toBeInTheDocument();
	});

	it('chooses Auto or a Held screen with the arrow keys, as the TV’s radio buttons', async () => {
		const store = showOrganizerWithStore();
		saveTournament(store, playIntoLosersBracket());
		const user = userEvent.setup();

		await user.click(screen.getByRole('radio', { name: 'Auto' }));
		await user.keyboard('{ArrowRight}');

		expect(screen.getByRole('radio', { name: 'Winners Bracket' })).toBeChecked();
		expect(readThumbnailName()).toBe('The TV showing Winners Bracket');
		expect(store.load()?.tvChoice).toBe('winnersBracket');
	});
});

describe('whether the TV is open', () => {
	it('shows TV open while the TV’s heartbeat is recent, and TV closed a few seconds after it stops', () => {
		vi.useFakeTimers();
		showOrganizerWithStore();
		expect(readTvBadge()).toBe('TV closed');

		saveHeartbeatFromTv();
		expect(readTvBadge()).toBe('TV open');
		waitSeconds(4);
		expect(readTvBadge()).toBe('TV open');
		waitSeconds(1);
		expect(readTvBadge()).toBe('TV closed');

		saveHeartbeatFromTv();
		expect(readTvBadge()).toBe('TV open');
	});

	it('shows TV open as soon as the screen opens, when the TV is already running', () => {
		vi.useFakeTimers();
		saveHeartbeatFromTv();

		showOrganizerWithStore();

		expect(readTvBadge()).toBe('TV open');
	});

	it('leaves the TV open when the Organizer starts a new Tournament', async () => {
		const user = userEvent.setup();
		showOrganizerWithStore(registerPlayers('Dave K.', 'Big Dave'));
		saveHeartbeatFromTv();
		const savedHeartbeat = localStorage.getItem(heartbeatKey);

		await clickButton(user, 'Start a new Tournament');
		await answerDialog(user, 'Start a new Tournament');

		expect(listPlayerNames()).toEqual([]);
		expect(localStorage.getItem(heartbeatKey)).toBe(savedHeartbeat);
		expect(readTvBadge()).toBe('TV open');
	});
});

describe('looking at the brackets on the laptop', () => {
	it('opens on the bracket the TV shows, from the link, leaving the TV on Auto', async () => {
		const store = showOrganizerWithStore(playIntoLosersBracket());
		const user = userEvent.setup();

		await clickButton(user, 'Look at the brackets here');

		expect(readSelectedBracketTab()).toBe('Winners Bracket');
		expect(readPeekedBracketHeading()).toBe('Winners Bracket');
		expect(store.load()?.tvChoice).toBe('auto');
		expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked();
	});

	it('opens on the Losers Bracket from the thumbnail while the TV holds it, and switches with the tabs', async () => {
		const { user } = showOrganizerHoldingLosersBracket();

		await clickButton(user, 'Look at the Losers Bracket full size');
		expect(readSelectedBracketTab()).toBe('Losers Bracket');
		expect(readPeekedBracketHeading()).toBe('Losers Bracket');

		await chooseBracketTab(user, 'Winners Bracket');
		expect(readSelectedBracketTab()).toBe('Winners Bracket');
		expect(readPeekedBracketHeading()).toBe('Winners Bracket');
	});

	it('opens on the Winners Bracket while the TV shows the Draw, with no Losers Bracket tab yet', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue', 'Ann'], '2');

		await clickButton(user, 'Look at the Winners Bracket full size');

		const peek = within(getBracketPeek());
		const tabNames = peek.getAllByRole('tab').map((tab) => tab.textContent);
		expect(tabNames).toEqual(['Winners Bracket']);
		expect(readPeekedBracketHeading()).toBe('Winners Bracket');
	});

	it('offers nothing to look at before the Draw', () => {
		showOrganizerWithStore(registerPlayers('Dave K.', 'Big Dave'));

		expect(
			screen.queryByRole('button', { name: 'Look at the brackets here' }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /full size$/ })).not.toBeInTheDocument();
	});

	it('closes with its close button, leaving the TV’s choice as it was', async () => {
		const { store, user } = showOrganizerHoldingLosersBracket();

		await clickButton(user, 'Look at the brackets here');
		await chooseBracketTab(user, 'Winners Bracket');
		const peek = within(getBracketPeek());
		await user.click(peek.getByRole('button', { name: 'Close the brackets' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(store.load()?.tvChoice).toBe('losersBracket');
		expect(screen.getByRole('radio', { name: 'Losers Bracket' })).toBeChecked();
		expect(readThumbnailName()).toBe('The TV showing Losers Bracket');
	});
});

/*
 * The organizer route, opened on the Tournament given, if any, and the store it saves to, which a test saves
 * to as well, as the Organizer's own steps would.
 */
const showOrganizerWithStore = (saved?: Tournament): Store<Tournament> => {
	const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
	if (saved) {
		saveTournament(store, saved);
	}
	render(
		<Organizer
			store={store}
			themeStore={createLocalStorageStore<ThemeChoice>(themeKey, themeChoiceVersion)}
			heartbeatStore={createHeartbeatStore()}
		/>,
	);
	return store;
};

// A store of the TV's heartbeat, reading and saving what every other such store in the test does.
const createHeartbeatStore = () =>
	createLocalStorageStore<TvHeartbeat>(heartbeatKey, tvHeartbeatVersion);

/*
 * Saves the TV's heartbeat as the TV's own window does: through a store of its own, which the browser then
 * tells the Organizer's window about with a storage event.
 */
const saveHeartbeatFromTv = () => {
	const tvHeartbeatStore = createHeartbeatStore();
	act(() => {
		tvHeartbeatStore.save(Date.now());
		window.dispatchEvent(new StorageEvent('storage', { key: heartbeatKey }));
	});
};

// What the badge beside the heading says about the TV, as a screen reader reads it.
const readTvBadge = () => readTextAloud(screen.getByRole('status', { name: 'TV' }));

// The organizer route once the Losers Bracket is drawn, when the TV has two screens to cycle.
const showOrganizerCyclingScreens = () => {
	showOrganizerWithStore(playIntoLosersBracket());
	return userEvent.setup();
};

// Records the only Match left, the Final, for its first-named Player, the loser leaving: the Tournament finished.
const winTheFinal = async (user: User) => {
	const [champion] = listWinnerNames(findPlayingTile());
	await recordWin(user, findPlayingTile(), champion);
	await answerDialog(user, 'Leaving');
};

// Checks the choice of what the TV shows, and its seconds, are gone: before Start there is never a choice.
const expectTvControlsHidden = () => {
	expect(screen.queryByRole('group', { name: 'TV shows' })).not.toBeInTheDocument();
	expect(screen.queryByLabelText('Seconds per TV screen')).not.toBeInTheDocument();
};

// The thumbnail of the TV screen on show, in the TV Display panel.
const getThumbnail = () => screen.getByRole('img', { name: /^The TV showing / });

const readThumbnailName = () => getThumbnail().getAttribute('aria-label');

// The thumbnail is a picture, hidden from assistive technology, so its heading is found among hidden ones.
const readThumbnailHeading = () => {
	const thumbnail = within(getThumbnail());
	return thumbnail.getByRole('heading', { level: 1, hidden: true }).textContent;
};

const listThumbnailPlayers = () => {
	const thumbnail = within(getThumbnail());
	const playerList = within(thumbnail.getByRole('list', { name: 'Players', hidden: true }));
	return playerList.getAllByRole('listitem', { hidden: true }).map((item) => item.textContent);
};

/*
 * The organizer route once the Losers Bracket is drawn, with the TV held on it, and the store it saves to, so a
 * test can check the TV's choice is still saved.
 */
const showOrganizerHoldingLosersBracket = () => {
	const intoLosersBracket = playIntoLosersBracket();
	const holdingLosersBracket = expectOk(chooseTvScreen(intoLosersBracket, 'losersBracket'));
	const store = showOrganizerWithStore(holdingLosersBracket);
	return { store, user: userEvent.setup() };
};

// The dialog showing the TV's brackets on the laptop.
const getBracketPeek = () => screen.getByRole('dialog', { name: 'The brackets' });

// The name of the bracket tab chosen in the open dialog.
const readSelectedBracketTab = () => {
	const peek = within(getBracketPeek());
	return peek.getByRole('tab', { selected: true }).textContent;
};

const chooseBracketTab = async (user: User, bracketTitle: string) => {
	const peek = within(getBracketPeek());
	await user.click(peek.getByRole('tab', { name: bracketTitle }));
};

// The heading of the bracket the open dialog shows, drawn as the TV draws it.
const readPeekedBracketHeading = () => {
	const peek = within(getBracketPeek());
	const bracketPanel = within(peek.getByRole('tabpanel'));
	return bracketPanel.getByRole('heading', { level: 1 }).textContent;
};

// How playMatches plays: when it stops, which Matches it plays and how it records each.
interface PlayMatchesOptions {
	// Whether to stop: by default once the Tournament is finished.
	readonly isDone?: (tournament: Tournament) => boolean;
	// Whether a Match on a Board is one to play: by default any with both its Players known.
	readonly isToPlay?: (matchOnBoard: MatchOnBoard) => boolean;
	// Records a Match's result: by default its first-named Player wins and the loser leaves.
	readonly recordResult?: (tournament: Tournament, matchOnBoard: MatchOnBoard) => Tournament;
}

// Plays the Matches on a Board one at a time, as the options say, until it is told to stop.
const playMatches = (
	playing: Tournament,
	{
		isDone = (tournament) => tournament.phase === 'finished',
		isToPlay = hasBothPlayersKnown,
		recordResult = (tournament, matchOnBoard) =>
			recordWinOn(tournament, matchOnBoard, 'leaving'),
	}: PlayMatchesOptions = {},
): Tournament => {
	let tournament = playing;
	while (!isDone(tournament)) {
		const nextMatch = getMatchesOnBoards(tournament).find(isToPlay)!;
		tournament = recordResult(tournament, nextMatch);
	}
	return tournament;
};

/*
 * Plays every Match left, as playToTheEnd does, except that each Losers Bracket Match is won by Forfeit: its
 * second-named Player leaves. Returns the finished Tournament and each bracket's Final, its winner's name first.
 */
const playToTheEndForfeitingLosersBracket = (playing: Tournament) => {
	const finals: Partial<Record<BracketName, [string, string]>> = {};
	const tournament = playMatches(playing, {
		recordResult: (before, nextMatch) => {
			const [winner, loser] = nextMatch.players as [Player, Player];
			const bracketName = nextMatch.match.bracket;
			// Each bracket's last Match recorded is its Final.
			finals[bracketName] = [winner.name, loser.name];
			return bracketName === 'losers'
				? expectOk(recordForfeit(before, nextMatch.match, loser.id))
				: recordWinOn(before, nextMatch, 'leaving');
		},
	});
	return { tournament, finals: finals as Record<BracketName, [string, string]> };
};

/*
 * Plays every Match left, the first-named Player winning each and every loser leaving, until both brackets
 * have their champion: the Tournament finished.
 */
const playToTheEnd = (playing: Tournament): Tournament => playMatches(playing);

// Plays only the Losers Bracket's Matches, as playToTheEnd does, until it has its champion.
const playLosersBracketToItsChampion = (playing: Tournament): Tournament =>
	playMatches(playing, {
		isDone: (tournament) => getChampions(tournament).length > 0,
		isToPlay: (m) => m.match.bracket === 'losers' && hasBothPlayersKnown(m),
	});

// Whether one element comes after another in the page, and so below it in a column.
const isPlacedAfter = (earlier: HTMLElement, later: HTMLElement) =>
	(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

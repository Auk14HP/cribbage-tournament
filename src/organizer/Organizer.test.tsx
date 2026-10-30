// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';
import { listWaitingText } from '../screenTestHelpers';
import { createLocalStorageStore } from '../storage';
import { tournamentVersion, type Tournament } from '../tournament';

const key = 'organizer-test';

/*
 * jsdom has no modal dialogs, so these stand in for the browser's, opening and closing only. Escape and
 * moving focus are the browser's, covered in e2e/.
 */
beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function () {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function () {
		this.open = false;
	};
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
});

type User = ReturnType<typeof userEvent.setup>;

const showOrganizer = () => {
	render(<Organizer store={createLocalStorageStore<Tournament>(key, tournamentVersion)} />);
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

// Registers the named Players, sets out the Boards and makes the Draw, confirming it.
const makeTheDraw = async (user: User, names: string[], boards: string) => {
	for (const name of names) {
		await register(user, name);
	}
	await setBoardCount(user, boards);
	await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
	await answerDialog(user, 'Make the Draw');
};

// The rows of the Matches list. Each recorded result re-renders it, so it is looked up afresh each time.
const listMatchRows = () =>
	within(screen.getByRole('list', { name: 'Matches' })).getAllByRole('listitem');

// Whether a Match row is a Bye Player waiting for a first-Round Match's winner.
const isWaitingForWinner = (row: HTMLElement) => row.textContent!.includes(' vs Winner of ');

// The row of the Bye Player waiting for a winner.
const findRowAwaitingWinner = () => listMatchRows().find(isWaitingForWinner)!;

// The row of the one Match with both Players known, in a Draw of 3 Players.
const findPlayingRow = () => listMatchRows().find((row) => !isWaitingForWinner(row))!;

// The name of the Bye Player waiting for a winner.
const readByePlayerName = () =>
	findRowAwaitingWinner().textContent!.match(/^Board \d+(.+) vs Winner of/)![1];

// The names on a Match row's winner buttons: both its Players, once it is being played.
const listWinnerNames = (row: HTMLElement) =>
	within(row)
		.queryAllByRole('button')
		.map((b) => b.textContent!)
		.filter((name) => name !== 'Forfeit');

const recordWin = (user: User, row: HTMLElement, winner: string) =>
	user.click(within(row).getByRole('button', { name: winner }));

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

const listResults = () =>
	within(screen.getByRole('list', { name: 'Results' }))
		.getAllByRole('listitem')
		.map((item) => item.textContent);

const listPlayerNames = () =>
	within(screen.getByRole('list', { name: 'Players' }))
		.queryAllByRole('listitem')
		.map((item) => item.querySelector('span')?.textContent);

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

		await user.click(screen.getByRole('button', { name: 'Rename' }));
		await user.clear(screen.getByLabelText('New name for Dave K'));
		await user.type(screen.getByLabelText('New name for Dave K'), 'Dave K.{Enter}');

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('removes a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		const daveK = screen.getByText('Dave K.').closest('li')!;
		await user.click(within(daveK).getByRole('button', { name: 'Remove' }));

		expect(listPlayerNames()).toEqual(['Big Dave']);
		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
	});

	it('starts a new Tournament only once the Organizer confirms', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Start a new Tournament? Every Player, Board and the Draw will be cleared.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(listPlayerNames()).toEqual(['Dave K.']);

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
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
		expect(getRefusalIn('Boards and the Draw')).toBeEmptyDOMElement();
		await user.tab();

		expect(getRefusalIn('Boards and the Draw')).toHaveTextContent(
			'The number of Boards is a whole number above zero, like 12.',
		);
		expect(getRefusalIn('Players')).toBeEmptyDOMElement();
		cleanup();
		showOrganizer();
		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();
	});

	it('shows why the Draw is refused', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		await answerDialog(user, 'Make the Draw');

		expect(getRefusalIn('Boards and the Draw')).toHaveTextContent(
			'The Draw needs at least one Board.',
		);
	});

	it('makes the Draw with fewer Boards than Matches, listing the rest as waiting for a Board', async () => {
		const user = showOrganizer();
		// 3 Players on 1 Board: the first-Round Match takes it, and the Bye Player waits for one.
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '1');

		expect(listMatchRows()).toHaveLength(1);
		expect(listWaitingText()).toEqual([expect.stringMatching(/^.+ vs Winner of .+ \/ .+$/)]);
	});

	it('makes the Draw once confirmed, closing registration and showing the Matches it seats, then Starts', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await setBoardCount(user, '2');

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.getByLabelText('Player name')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		await answerDialog(user, 'Make the Draw');

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		// 3 Players: one first-Round Match, and the Bye Player sits at a Board of their own to wait for its winner.
		expect(listMatchRows()).toHaveLength(2);
		expect(findRowAwaitingWinner()).toHaveTextContent(/^Board \d+.+ vs Winner of .+ \/ .+$/);
		const byePlayerName = readByePlayerName();
		for (const name of ['Dave K.', 'Big Dave', 'Sue'].filter((n) => n !== byePlayerName)) {
			expect(findPlayingRow()).toHaveTextContent(name);
		}

		await user.click(screen.getByRole('button', { name: 'Start' }));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
		expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		await answerDialog(user, 'Start a new Tournament');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		expect(listPlayerNames()).toEqual([]);
		expect(screen.getByLabelText('Number of Boards')).toHaveValue('');
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('records each Match’s winner with one tap, through to the champion', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		const byePlayerName = readByePlayerName();
		// Before Start, no winner can be recorded.
		const drawnRow = findPlayingRow();
		expect(within(drawnRow).queryAllByRole('button')).toEqual([]);
		await user.click(screen.getByRole('button', { name: 'Start' }));

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

		expect(screen.queryByRole('list', { name: 'Matches' })).not.toBeInTheDocument();
		expect(screen.getByText(`Champion: ${byePlayerName}`)).toBeInTheDocument();
	});

	it('records a Forfeit once the Organizer says who is forfeiting, and their opponent wins', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await user.click(screen.getByRole('button', { name: 'Start' }));
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
		expect(listResults()).toEqual([`Board 1: ${leaves} forfeited to ${stays}Undo`]);
	});

	it('asks whether a Player losing their first Match is staying for the Losers Bracket, recording nothing on Cancel', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await user.click(screen.getByRole('button', { name: 'Start' }));
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
		expect(listResults()).toEqual([`Board 1: ${winner} beat ${loser}Undo`]);

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

	it('lists the Matches waiting for a Board, in turn', async () => {
		const user = showOrganizer();
		const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'];
		await makeTheDraw(user, names, '3');
		await user.click(screen.getByRole('button', { name: 'Start' }));
		expect(screen.queryByRole('list', { name: 'Waiting for a Board' })).not.toBeInTheDocument();

		/*
		 * 6 Players on 3 Boards: once the Draw's three Matches are played and their losers stay, the
		 * Losers Bracket is one Match on a Board and a Bye Player waiting for one.
		 */
		await playTheDrawWithLosersStaying(user);

		expect(listWaitingText()).toEqual([expect.stringMatching(/^.+ vs Winner of .+ \/ .+$/)]);
	});

	it('lists each bracket’s results apart, latest first, though their Rounds and places match', async () => {
		const user = showOrganizer();
		const consoleError = vi.spyOn(console, 'error');
		const names = ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'];
		await makeTheDraw(user, names, '4');
		await user.click(screen.getByRole('button', { name: 'Start' }));
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
		expect(results[0]).toContain(`${winnerOfFinal} beat ${loserOfFinal}`);
		expect(new Set(results).size).toBe(results.length);
		// The Winners final: its two Players' earlier result can no longer be undone, so its row goes.
		const [champion, runnerUp] = listWinnerNames(findWinnersRow());
		await recordFirstNamedWinIn(findWinnersRow());

		const afterFinal = listResults();
		expect(afterFinal[0]).toContain(`${champion} beat ${runnerUp}`);
		expect(afterFinal).toHaveLength(2);
		const warnings = consoleError.mock.calls.map(([message]) => String(message));
		expect(warnings.filter((message) => message.includes('same key'))).toEqual([]);
	});

	it('undoes a result, re-opening the Match so the other Player can be recorded as its winner', async () => {
		const user = showOrganizer();
		await makeTheDraw(user, ['Dave K.', 'Big Dave', 'Sue'], '2');
		await user.click(screen.getByRole('button', { name: 'Start' }));
		const playing = findPlayingRow();
		const [winner, loser] = listWinnerNames(playing);
		await recordWin(user, playing, winner);
		await answerDialog(user, 'Leaving');
		expect(listMatchRows()).toHaveLength(1);
		expect(listResults()).toEqual([`Board 1: ${winner} beat ${loser}Undo`]);

		await user.click(screen.getByRole('button', { name: 'Undo' }));

		expect(listMatchRows()).toHaveLength(2);
		const reopened = findPlayingRow();
		expect(reopened).toHaveTextContent(/^Board 1/);
		expect(listWinnerNames(reopened)).toEqual([winner, loser]);
		expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
		await recordWin(user, reopened, loser);
		await answerDialog(user, 'Leaving');
		expect(listResults()).toEqual([`Board 1: ${loser} beat ${winner}Undo`]);
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
		await user.click(screen.getByRole('button', { name: 'Start' }));
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
		expect(getRefusalIn('Boards and the Draw')).toBeEmptyDOMElement();
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Seconds per TV screen')).toHaveValue('20');
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});
});

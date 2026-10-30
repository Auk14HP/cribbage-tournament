// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Display } from './Display';
import { createLocalStorageStore, type Store } from '../storage';
import type { Result } from '../result';
import { listWaitingText } from '../screenTestHelpers';
import { isReadyToPlay } from '../testHelpers';
import { getPlayerName } from '../wording';
import {
	makeDraw,
	getMatchesOnBoards,
	getWaitingForBoard,
	createTournament,
	recordWinner,
	registerPlayer,
	setBoardCount,
	setScreenSeconds,
	start,
	tournamentVersion,
	type BracketName,
	type Player,
	type Tournament,
} from '../tournament';

const key = 'display-test';

afterEach(() => {
	vi.useRealTimers();
	cleanup();
	localStorage.clear();
});

describe('the display route', () => {
	it('shows registered Players and the count, updating when the Tournament is saved', () => {
		const store = showDisplay();
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();

		const registered = registerPlayer(createTournament(), 'Big Dave');
		if (!registered.ok) {
			throw new Error(registered.reason);
		}
		act(() => store.save(registered.value));

		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			'Big Dave',
		]);
	});
});

describe('Tonight’s Draw screen', () => {
	it('shows every Match with its Board, including a Bye Player waiting for a winner, until Start', () => {
		const store = showDisplay();
		const tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], 3);

		act(() => store.save(tournament));

		/*
		 * 5 Players: a first-Round Match on Board 1, a Bye Player at Board 2 waiting for its winner, and a
		 * Match between the other two Bye Players on Board 3.
		 */
		const draw = getMatchesOnBoards(tournament);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
		const cards = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(cards.map((card) => card.textContent)).toEqual(
			draw.map(({ board, players: [a, b] }) => `Board ${board}${a.name}${getPlayerName(b)}`),
		);
		const [byePlayer] = draw.find((m) => !('name' in m.players[1]))!.players;
		const byeCard = cards.find((card) => card.textContent!.includes(byePlayer.name))!;
		const firstMatch = draw.find((m) => m.match.round === 1)!;
		const [a, b] = firstMatch.players as [Player, Player];
		expect(byeCard).toHaveTextContent(`Winner of ${a.name} / ${b.name}`);

		const started = expectOk(start(tournament));
		act(() => store.save(started));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
	});

	it('lists the Matches waiting for a Board beneath, when the Draw opens more Matches than there are Boards', () => {
		const store = showDisplay();
		/*
		 * 5 Players on 2 Boards: the first-Round Match and the Bye Players' Match take the Boards, and the
		 * Bye Player waiting for a winner waits for a Board too.
		 */
		const tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], 2);

		act(() => store.save(tournament));

		const [waiting] = getWaitingForBoard(tournament);
		expect(listWaitingText()).toEqual([
			`${waiting.players[0].name} vs ${getPlayerName(waiting.players[1])}`,
		]);
	});
});

describe('the Winners Bracket screen', () => {
	it('shows the bracket after Start, with Bye Players in Round 2, updating live', () => {
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue'], 2);
		let tournament = expectOk(start(drawn));
		const seated = getMatchesOnBoards(tournament);
		const firstMatch = seated.find(isReadyToPlay)!;
		const [a, b] = firstMatch.players as [Player, Player];
		const [bye] = seated.find((m) => m !== firstMatch)!.players;
		const recordWinnerOf = (match: typeof firstMatch.match, winner: Player) => {
			tournament = expectOk(recordWinner(tournament, match, winner.id, 'leaving'));
			act(() => store.save(tournament));
		};
		// What a Round's column shows, a Match per item.
		const listRound = (name: string) =>
			screen
				.getAllByRole('list', { name })
				.flatMap((list) => within(list).queryAllByRole('listitem'))
				.map((item) => item.textContent);

		act(() => store.save(tournament));

		// 3 Players in a 4-place bracket: one first-Round Match, and a Bye Player waiting in the final.
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
		expect(listRound('Round 1')).toEqual([`Board 1${a.name}${b.name}`]);
		expect(listRound('Final')).toEqual([`Board 2—${bye.name}`]);
		expect(screen.queryByText(/Champion/)).not.toBeInTheDocument();

		recordWinnerOf(firstMatch.match, a);
		expect(listRound('Final')).toEqual([`Board 2${a.name}${bye.name}`]);
	});
});

describe('the TV cycle', () => {
	it('holds Tonight’s Draw until Start, then cycles the Winners Bracket and Now playing, each for the set time', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		let tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], 3);
		act(() => store.save(tournament));

		waitSeconds(60);
		expect(readHeading()).toBe('Tonight’s Draw');

		tournament = expectOk(start(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(19);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readHeading()).toBe('Now playing');

		/*
		 * 5 Players: a first-Round Match on Board 1, a Bye Player at Board 2 waiting for its winner, and a
		 * Match between the other two Bye Players on Board 3. The waiting Player isn't playing yet.
		 */
		const playing = getMatchesOnBoards(tournament).filter(isReadyToPlay);
		const firstMatch = playing.find((m) => m.match.round === 1)!;
		const byes = playing.find((m) => m !== firstMatch)!;
		const describeCard = ({ board, players: [a, b] }: typeof firstMatch) =>
			`Board ${board}${a.name}${(b as Player).name}`;
		const cards = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(cards.map((card) => card.textContent)).toEqual([
			describeCard(firstMatch),
			describeCard(byes),
		]);

		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');

		// A new time takes effect without a refresh, restarting the screen on show.
		tournament = expectOk(setScreenSeconds(tournament, '5'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(4);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readHeading()).toBe('Now playing');
	});

	it('shows a countdown ring that fills over each screen’s time and starts again with each screen and each new time', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		expect(readHeading()).toBe('Tonight’s Players');
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();
		let tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], 3);
		act(() => store.save(tournament));
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();

		tournament = expectOk(start(tournament));
		act(() => store.save(tournament));
		const firstCountdownRing = screen.getByTestId('countdown ring');
		expect(firstCountdownRing).toHaveAttribute('aria-hidden', 'true');
		expect(firstCountdownRing).toHaveStyle({ '--countdown-duration': '20s' });
		waitSeconds(19);
		expect(screen.getByTestId('countdown ring')).toBe(firstCountdownRing);
		waitSeconds(1);
		const secondCountdownRing = screen.getByTestId('countdown ring');
		expect(secondCountdownRing).not.toBe(firstCountdownRing);
		expect(secondCountdownRing).toHaveStyle({ '--countdown-duration': '20s' });

		// A new time restarts the screen on show, and the ring with it.
		waitSeconds(10);
		tournament = expectOk(setScreenSeconds(tournament, '5'));
		act(() => store.save(tournament));
		const restartedCountdownRing = screen.getByTestId('countdown ring');
		expect(restartedCountdownRing).not.toBe(secondCountdownRing);
		expect(restartedCountdownRing).toHaveStyle({ '--countdown-duration': '5s' });
	});
});

describe('the champion screen', () => {
	it('shows the champion once the final has a winner, then cycles it with the finished bracket', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave'], 1);
		let tournament = expectOk(start(drawn));
		const [final] = getMatchesOnBoards(tournament);
		const champion = final.players[0];

		tournament = expectOk(recordWinner(tournament, final.match, champion.id, 'leaving'));
		act(() => store.save(tournament));

		// With no Losers Bracket played, the night has one champion.
		expect(readHeading()).toBe('Tonight’s Champion');
		expect(screen.getByText(champion.name)).toBeInTheDocument();
		expect(screen.getByTestId('countdown ring')).toBeInTheDocument();

		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
		expect(screen.getByText(`Champion: ${champion.name}`)).toBeInTheDocument();
		expect(screen.getByTestId('countdown ring')).toBeInTheDocument();

		waitSeconds(20);
		expect(readHeading()).toBe('Tonight’s Champion');
	});
});

describe('the Losers Bracket', () => {
	it('joins the TV cycle once drawn, after the Winners Bracket, with Matches waiting for a Board beneath Now playing', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		/*
		 * 6 Players on 3 Boards: once the Draw's three Matches are played and their losers stay, the
		 * Losers Bracket is one Match on a Board and a Bye Player waiting for one.
		 */
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'], 3);
		const started = expectOk(start(drawn));
		const tournament = playDrawStaying(started);
		const [waiting] = getWaitingForBoard(tournament);
		act(() => store.save(tournament));

		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		// One Round 1 Match, in the bracket's left half, and a Bye in its right.
		const [leftRoundOne] = screen.getAllByRole('list', { name: 'Round 1' });
		const losersMatch = getMatchesOnBoards(tournament).find(
			(m) => m.match.bracket === 'losers',
		)!;
		expect(leftRoundOne).toHaveTextContent(`Board ${losersMatch.board}`);
		waitSeconds(20);
		expect(readHeading()).toBe('Now playing');
		expect(listWaitingText()).toEqual([
			`${waiting.players[0].name} vs ${getPlayerName(waiting.players[1])}`,
		]);
		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
	});

	it('shows a finished bracket’s champion while the other plays on, then names both champions', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		// 4 Players: both first-Round losers stay, and meet in the Losers Bracket.
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann'], 2);
		const started = expectOk(start(drawn));
		let tournament = playDrawStaying(started);
		const findFinal = (bracket: BracketName) =>
			getMatchesOnBoards(tournament).find((m) => m.match.bracket === bracket)!;
		const winnersFinal = findFinal('winners');
		const losersFinal = findFinal('losers');
		const [winnersChampion] = winnersFinal.players as [Player, Player];
		const [losersChampion] = losersFinal.players as [Player, Player];

		tournament = expectOk(recordWinner(tournament, winnersFinal.match, winnersChampion.id));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		expect(screen.getByText(`Champion: ${winnersChampion.name}`)).toBeInTheDocument();
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		expect(screen.queryByText(/Champion/)).not.toBeInTheDocument();

		tournament = expectOk(recordWinner(tournament, losersFinal.match, losersChampion.id));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Tonight’s Champions');
		const winnersLine = screen.getByText('Winners Bracket').parentElement;
		const losersLine = screen.getByText('Losers Bracket').parentElement;
		expect(winnersLine).toHaveTextContent(winnersChampion.name);
		expect(losersLine).toHaveTextContent(losersChampion.name);
		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		expect(screen.getByText(`Champion: ${losersChampion.name}`)).toBeInTheDocument();
		waitSeconds(20);
		expect(readHeading()).toBe('Tonight’s Champions');
	});
});

/*
 * Records every Match the Draw started, its first-named Player winning and the loser staying for the
 * Losers Bracket.
 */
const playDrawStaying = (started: Tournament): Tournament => {
	let tournament = started;
	const opening = getMatchesOnBoards(tournament).filter(isReadyToPlay);
	for (const { match, players } of opening) {
		tournament = expectOk(recordWinner(tournament, match, players[0].id, 'staying'));
	}
	return tournament;
};

// The display route, against the real storage adapter. Saving to the store stands in for the Organizer.
const showDisplay = (): Store<Tournament> => {
	const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
	render(<Display store={store} />);
	return store;
};

// A Tournament with the named Players registered, that many Boards set out, and the Draw made.
const setUpDraw = (names: readonly string[], boards: number): Tournament => {
	let tournament = createTournament();
	for (const name of names) {
		tournament = expectOk(registerPlayer(tournament, name));
	}
	const typed = String(boards);
	tournament = expectOk(setBoardCount(tournament, typed));
	return expectOk(makeDraw(tournament, Math.random));
};

const readHeading = () => screen.getByRole('heading', { level: 1 }).textContent;

// Moves the fake clock on, as the TV waits between screens.
const waitSeconds = (seconds: number) => {
	act(() => {
		vi.advanceTimersByTime(seconds * 1000);
	});
};

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome.value;
};

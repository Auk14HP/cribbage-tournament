// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Display } from './Display';
import { createLocalStorageStore, type Store } from './storage';
import type { Result } from './result';
import {
	makeDraw,
	getMatchesOnBoards,
	createTournament,
	recordWinner,
	registerPlayer,
	setBoardCount,
	setScreenSeconds,
	start,
	tournamentVersion,
	type Player,
	type Tournament,
} from './tournament';

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
			draw.map(
				({ board, players: [a, b] }) =>
					`Board ${board}${a.name}${'name' in b ? b.name : 'Winner of Board 1'}`,
			),
		);
		expect(cards[1]).toHaveTextContent(/Winner of Board 1$/);

		const started = expectOk(start(tournament));
		act(() => store.save(started));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
	});
});

describe('the Winners Bracket screen', () => {
	it('shows the bracket after Start, with Bye Players in Round 2, updating live', () => {
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue'], 2);
		let tournament = expectOk(start(drawn));
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [a, b] = firstMatch.players as [Player, Player];
		const bye = waiting.players[0];
		const recordWinnerOf = (match: typeof firstMatch.match, winner: Player) => {
			tournament = expectOk(recordWinner(tournament, match, winner.id));
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
		const [firstMatch, , byes] = getMatchesOnBoards(tournament);
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

		tournament = expectOk(recordWinner(tournament, final.match, champion.id));
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

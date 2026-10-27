// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Display } from './Display';
import { createLocalStorageStore } from './storage';
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
		const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
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
		const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = createTournament();
		for (const name of ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '3'));
		tournament = expectOk(makeDraw(tournament, Math.random));

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
		const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = createTournament();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '2'));
		tournament = expectOk(makeDraw(tournament, Math.random));
		tournament = expectOk(start(tournament));
		const [first, waiting] = getMatchesOnBoards(tournament);
		const [a, b] = first.players as [Player, Player];
		const bye = waiting.players[0];
		const recordWinnerOf = (match: typeof first.match, winner: Player) => {
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

		recordWinnerOf(first.match, a);
		expect(listRound('Final')).toEqual([`Board 2${a.name}${bye.name}`]);
	});
});

describe('the TV cycle', () => {
	it('holds Tonight’s Draw until Start, then cycles the Winners Bracket and Now playing, each for the set time', () => {
		vi.useFakeTimers();
		const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = createTournament();
		for (const name of ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '3'));
		tournament = expectOk(makeDraw(tournament, Math.random));
		act(() => store.save(tournament));
		const readHeading = () => screen.getByRole('heading', { level: 1 }).textContent;
		const wait = (seconds: number) => {
			act(() => {
				vi.advanceTimersByTime(seconds * 1000);
			});
		};

		wait(60);
		expect(readHeading()).toBe('Tonight’s Draw');

		tournament = expectOk(start(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		wait(19);
		expect(readHeading()).toBe('Winners Bracket');
		wait(1);
		expect(readHeading()).toBe('Now playing');

		/*
		 * 5 Players: a first-Round Match on Board 1, a Bye Player at Board 2 waiting for its winner, and a
		 * Match between the other two Bye Players on Board 3. The waiting Player isn't playing yet.
		 */
		const [first, , byes] = getMatchesOnBoards(tournament);
		const describeCard = ({ board, players: [a, b] }: typeof first) =>
			`Board ${board}${a.name}${(b as Player).name}`;
		const cards = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(cards.map((card) => card.textContent)).toEqual([
			describeCard(first),
			describeCard(byes),
		]);

		wait(20);
		expect(readHeading()).toBe('Winners Bracket');

		// A new time takes effect without a refresh.
		tournament = expectOk(setScreenSeconds(tournament, '5'));
		act(() => store.save(tournament));
		wait(5);
		expect(readHeading()).toBe('Now playing');
	});
});

describe('the champion screen', () => {
	it('shows the champion once the final has a winner, then cycles it with the finished bracket', () => {
		vi.useFakeTimers();
		const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = createTournament();
		for (const name of ['Dave K.', 'Big Dave']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '1'));
		tournament = expectOk(makeDraw(tournament, Math.random));
		tournament = expectOk(start(tournament));
		const [final] = getMatchesOnBoards(tournament);
		const champion = final.players[0];
		const readHeading = () => screen.getByRole('heading', { level: 1 }).textContent;
		const wait = (seconds: number) => {
			act(() => {
				vi.advanceTimersByTime(seconds * 1000);
			});
		};

		tournament = expectOk(recordWinner(tournament, final.match, champion.id));
		act(() => store.save(tournament));

		// With no Losers Bracket played, the night has one champion.
		expect(readHeading()).toBe('Tonight’s Champion');
		expect(screen.getByText(champion.name)).toBeInTheDocument();

		wait(20);
		expect(readHeading()).toBe('Winners Bracket');
		expect(screen.getByText(`Champion: ${champion.name}`)).toBeInTheDocument();

		wait(20);
		expect(readHeading()).toBe('Tonight’s Champion');
	});
});

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome.value;
};

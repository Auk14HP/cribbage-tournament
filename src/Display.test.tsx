// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Display } from './Display';
import { localStorageStore } from './storage';
import type { Result } from './result';
import {
	makeDraw,
	matchesOnBoards,
	newTournament,
	recordWinner,
	registerPlayer,
	setBoardCount,
	start,
	tournamentVersion,
	type Player,
	type Tournament,
} from './tournament';

const key = 'display-test';

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe('the display route', () => {
	it('shows registered Players and the count, updating when the Tournament is saved', () => {
		const store = localStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();

		const registered = registerPlayer(newTournament(), 'Big Dave');
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
		const store = localStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = newTournament();
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
		const draw = matchesOnBoards(tournament);
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

		act(() => store.save(expectOk(start(tournament))));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
	});
});

describe('the Winners Bracket screen', () => {
	it('shows the bracket after Start, with Bye Players in Round 2, updating live and highlighting the champion', () => {
		const store = localStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = newTournament();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '2'));
		tournament = expectOk(start(expectOk(makeDraw(tournament, Math.random))));
		const [first, waiting] = matchesOnBoards(tournament);
		const [a, b] = first.players as [Player, Player];
		const bye = waiting.players[0];
		const record = (match: typeof first.match, winner: Player) => {
			tournament = expectOk(recordWinner(tournament, match, winner.id));
			act(() => store.save(tournament));
		};
		// What a Round's column shows, a Match per item.
		const round = (name: string) =>
			screen
				.getAllByRole('list', { name })
				.flatMap((list) => within(list).queryAllByRole('listitem'))
				.map((item) => item.textContent);

		act(() => store.save(tournament));

		// 3 Players in a 4-place bracket: one first-Round Match, and a Bye Player waiting in the final.
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
		expect(round('Round 1')).toEqual([`Board 1${a.name}${b.name}`]);
		expect(round('Final')).toEqual([`Board 2—${bye.name}`]);
		expect(screen.queryByText(/Champion/)).not.toBeInTheDocument();

		record(first.match, a);
		expect(round('Final')).toEqual([`Board 2${a.name}${bye.name}`]);

		record(waiting.match, bye);
		expect(round('Final')).toEqual([`${a.name}${bye.name}`]);
		expect(screen.getByText(`Champion: ${bye.name}`)).toBeInTheDocument();
	});
});

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome.value;
};

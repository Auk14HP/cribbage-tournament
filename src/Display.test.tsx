// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Display } from './Display';
import { localStorageStore } from './storage';
import type { Result } from './result';
import {
	makeDraw,
	newTournament,
	registerPlayer,
	setBoardCount,
	start,
	tonightsDraw,
	tournamentVersion,
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
		const draw = tonightsDraw(tournament)!;
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

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
	});
});

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome.value;
};

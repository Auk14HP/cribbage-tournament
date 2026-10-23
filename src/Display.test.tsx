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
	roundOneDraw,
	setBoardCount,
	start,
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

describe('the Round 1 draw screen', () => {
	it('shows every first-Round Match with its Board, and who has a Bye, until Start', () => {
		const store = localStorageStore<Tournament>(key, tournamentVersion);
		render(<Display store={store} />);
		let tournament = newTournament();
		for (const name of ['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe']) {
			tournament = expectOk(registerPlayer(tournament, name));
		}
		tournament = expectOk(setBoardCount(tournament, '2'));
		tournament = expectOk(makeDraw(tournament, Math.random));

		act(() => store.save(tournament));

		// 5 Players: one first-Round Match, on the lowest-numbered Board, and three Byes.
		const draw = roundOneDraw(tournament)!;
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Round 1 draw');
		const match = within(screen.getByRole('list', { name: 'Matches' })).getByRole('listitem');
		expect(within(match).getByText('Board 1')).toBeInTheDocument();
		expect(within(match).getByText(draw.matches[0].players[0].name)).toBeInTheDocument();
		expect(within(match).getByText(draw.matches[0].players[1].name)).toBeInTheDocument();
		expect(
			within(screen.getByRole('list', { name: 'Byes' }))
				.getAllByRole('listitem')
				.map((item) => item.textContent),
		).toEqual(draw.byes.map((p) => p.name));

		act(() => store.save(expectOk(start(tournament))));

		expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Round 1 draw');
	});
});

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome.value;
};

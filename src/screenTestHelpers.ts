// Helpers shared by the routes' tests.
import { act, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import type { Store } from './storage';
import {
	createTournament,
	makeDraw,
	restartTvCycleIfDue,
	setBoardCount,
	showHouseRules,
	start,
	type Tournament,
} from './tournament';
import {
	createSeededRandom,
	expectOk,
	playDrawStaying,
	registerPlayers,
} from './tournament/testSetup';

// Each Match in the Waiting for a Board list, as the screen reads.
export const listWaitingText = () => {
	const list = within(screen.getByRole('list', { name: 'Waiting for a Board' }));
	return list.getAllByRole('listitem').map((item) => item.textContent);
};

/*
 * A Tournament with the named Players registered, that many Boards set out, and the Draw made, shuffled by
 * a seeded random source.
 */
export const setUpDraw = (names: readonly string[], { boards }: { boards: number }): Tournament => {
	const registered = registerPlayers(...names);
	const typed = String(boards);
	const withBoards = expectOk(setBoardCount(registered, typed));
	const onHouseRules = expectOk(showHouseRules(withBoards));
	const random = createSeededRandom(1);
	return expectOk(makeDraw(onHouseRules, random));
};

/*
 * 6 Players on 3 Boards, Started, the Draw's three Matches played and their losers staying: the Losers
 * Bracket is one Match on a Board and a Bye Player waiting for one.
 */
export const playIntoLosersBracket = (): Tournament => {
	const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'], { boards: 3 });
	const started = expectOk(start(drawn));
	return playDrawStaying(started);
};

/*
 * Saves the Tournament as the Organizer's window does: Auto's cycle starts again now if the change from the
 * Tournament saved before calls for it.
 */
export const saveTournament = (store: Store<Tournament>, tournament: Tournament) => {
	const before = store.load() ?? createTournament();
	const restarted = restartTvCycleIfDue({ before, after: tournament, now: Date.now() });
	act(() => store.save(restarted));
};

// Moves the fake clock on, as the TV waits between screens.
export const waitSeconds = (seconds: number) => {
	act(() => {
		vi.advanceTimersByTime(seconds * 1000);
	});
};

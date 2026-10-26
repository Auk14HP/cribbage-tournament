/*
 * Dev only: `/?players=26&boards=12` replaces the saved Tournament with one that has that many Players
 * registered and Boards set out, so a Tournament can be tried without typing every name. It asks first if a
 * Tournament is already under way. main.tsx calls it only under `npm run dev`; a build leaves it out.
 */
import type { Store } from './storage';
import { createTournament, registerPlayer, setBoardCount, type Tournament } from './tournament';

// Names like the room's, a few long, so the TV is tried with realistic widths.
const names = [
	'Dave K.',
	'Big Dave',
	'Margaret',
	'Sue',
	'Ann-Marie',
	'Joe',
	'Bartholomew',
	'Lou',
	'Rosemary',
	'Hank',
	'Little Pete',
	'Doris',
	'Gus',
	'Evelyn T.',
	'Walt',
	'Bev',
	'Maximilian',
	'Carol',
	'Frank the Tank',
	'Irene',
	'Sal',
	'Dottie',
	'Ray B.',
	'Jo',
	'Christopher',
	'Peg',
	'Earl',
	'Wilhelmina',
	'Stan',
	'Gloria',
	'Tiny',
	'Mo',
];

// A unique name for each Player: the list once, then numbered rounds of it.
const makeTestName = (index: number): string => {
	const round = Math.floor(index / names.length);
	const name = names[index % names.length];
	return round === 0 ? name : `${name} ${round + 1}`;
};

export const setUpTestTournament = (store: Store<Tournament>) => {
	const params = new URLSearchParams(location.search);
	const players = Number(params.get('players') ?? 0);
	const boards = params.get('boards');
	if (!params.has('players') && boards === null) {
		return;
	}
	// So a reload carries on with the test Tournament instead of starting it again.
	history.replaceState(null, '', location.pathname);

	const saved = store.load();
	const underWay = saved && (saved.players.length > 0 || saved.phase !== 'registration');
	if (underWay && !confirm('Replace the saved Tournament with test Players?')) {
		return;
	}
	let tournament = createTournament();
	for (let i = 0; i < players; i++) {
		const registered = registerPlayer(tournament, makeTestName(i));
		if (registered.ok) {
			tournament = registered.value;
		}
	}
	if (boards !== null) {
		const set = setBoardCount(tournament, boards);
		if (set.ok) {
			tournament = set.value;
		}
	}
	store.save(tournament);
};

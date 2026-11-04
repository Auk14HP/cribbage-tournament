// Making the Draw for each bracket, and Starting the Tournament once Tonight’s Draw is shown.
import type { Result } from '../result';
import { findOpponent, findWinner, isBye, listIndexes, type Entrant } from './bracket';
import { reseat } from './seating';
import type {
	Bracket,
	Bye,
	FirstRoundMatch,
	MatchPlace,
	PlayerId,
	Random,
	Tournament,
} from './types';

export const makeDraw = (tournament: Tournament, random: Random): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return { ok: false, reason: 'The Draw has already been made.' };
	}
	if (tournament.players.length < 2) {
		return { ok: false, reason: 'The Draw needs at least two Players.' };
	}
	if (tournament.boards.length === 0) {
		return { ok: false, reason: 'The Draw needs at least one Board.' };
	}
	const drawn = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const winnersBracket = arrangeBracket(drawn);
	const losersDrawOrder = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const drawnTournament: Tournament = {
		...tournament,
		phase: 'drawShown',
		winnersBracket,
		losersDrawOrder,
	};
	// Every Board is free at the Draw, so Matches take them lowest-numbered first; the rest wait for one.
	return { ok: true, value: reseat(drawnTournament) };
};

/*
 * Arranges drawn Players into a bracket. Its size is the next power of two at or above the field, and Byes
 * fill the gap. Each Bye takes a whole first-Round place, so no place is a Bye against a Bye. The
 * first-Round Matches take neighbouring places at the top of the bracket, so Bye Players meet each other in
 * Round 2 and play from the Start too. Only with an odd number of first-Round Matches does one Bye Player
 * wait, for the last first-Round Match's winner.
 */
const arrangeBracket = (drawn: readonly Entrant[]): Bracket => {
	let bracketSize = 2;
	while (bracketSize < drawn.length) {
		bracketSize *= 2;
	}
	const places = bracketSize / 2;
	const firstRoundMatches = drawn.length - places;
	let next = 0;
	const firstRound = listIndexes(places).map((place): FirstRoundMatch | Bye =>
		place < firstRoundMatches
			? { players: [drawn[next++], drawn[next++]] }
			: // A Held Place is drawn first, so it is always in a Match.
				{ bye: drawn[next++] as PlayerId },
	);
	return { firstRound };
};

export const start = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase === 'registration') {
		return { ok: false, reason: 'Make the Draw before starting.' };
	}
	if (tournament.phase !== 'drawShown') {
		return { ok: false, reason: 'The Tournament has already started.' };
	}
	return { ok: true, value: { ...tournament, phase: 'inProgress' } };
};

/*
 * Makes the Losers Draw once every Match the Winners Draw started has a result, from the Players staying
 * for it: with fewer than two there is no Losers Bracket. It has its own random Byes, by the same rules.
 * The Bye Player whose first Match is still to come gets a place held open, in a first-Round Match, at the
 * top of the bracket. With one Player staying, the Draw waits for that Match: there may yet be two.
 */
export const drawLosersBracketIfDue = (tournament: Tournament): Tournament => {
	if (tournament.losersBracket !== undefined) {
		return tournament;
	}
	const started = listStartedMatches(tournament);
	if (started.some((match) => findWinner(tournament, match) === undefined)) {
		return tournament;
	}
	const staying = tournament.losersDrawOrder!.filter((player) =>
		tournament.results.some(
			(r) =>
				r.loserAnswer === 'staying' &&
				findOpponent(tournament, r.match, r.winner) === player,
		),
	);
	const held = findByePlayerStillToPlay(tournament);
	const mayStay = staying.length + (held === undefined ? 0 : 1);
	if (mayStay < 2) {
		return { ...tournament, losersBracket: null };
	}
	if (staying.length < 2) {
		return tournament;
	}
	const entrants = held === undefined ? staying : [{ heldFor: held }, ...staying];
	return { ...tournament, losersBracket: arrangeBracket(entrants) };
};

/*
 * The Bye Player waiting for a first-Round Match's winner, while their own first Match has no result:
 * only with an odd number of first-Round Matches.
 */
const findByePlayerStillToPlay = (tournament: Tournament): PlayerId | undefined => {
	const { firstRound } = tournament.winnersBracket!;
	const place = listIndexes(Math.floor(firstRound.length / 2)).find(
		(p) => isBye(firstRound[2 * p]) !== isBye(firstRound[2 * p + 1]),
	);
	if (place === undefined) {
		return undefined;
	}
	const match: MatchPlace = { bracket: 'winners', round: 2, place };
	if (findWinner(tournament, match) !== undefined) {
		return undefined;
	}
	return (firstRound[2 * place + 1] as Bye).bye;
};

/*
 * The Matches the Winners Draw started: every first-Round Match, and every Round 2 Match between two Bye
 * Players.
 */
const listStartedMatches = (tournament: Tournament): MatchPlace[] => {
	const { firstRound } = tournament.winnersBracket!;
	return [
		...listIndexes(firstRound.length)
			.filter((place) => !isBye(firstRound[place]))
			.map((place): MatchPlace => ({ bracket: 'winners', round: 1, place })),
		...listIndexes(Math.floor(firstRound.length / 2))
			.filter((place) => isBye(firstRound[2 * place]) && isBye(firstRound[2 * place + 1]))
			.map((place): MatchPlace => ({ bracket: 'winners', round: 2, place })),
	];
};

export const isHeldFor = (entrant: Entrant, player: PlayerId): boolean =>
	typeof entrant !== 'number' && entrant.heldFor === player;

// Fisher–Yates: every order equally likely.
const shuffle = <T>(items: readonly T[], random: Random): T[] => {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

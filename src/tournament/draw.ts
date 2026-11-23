/*
 * Making the Draw for each bracket, from the House Rules step, Swapping Players in the Winners Bracket's Draw
 * while Tonight’s Draw is shown, and Starting the Tournament.
 */
import type { Result } from '../result';
import { findOpponent, findWinner, isBye, listIndexes, type Entrant } from './bracket';
import { reseat } from './seating';
import type { Bye, Draw, FirstRoundMatch, MatchPlace, PlayerId, Random, Tournament } from './types';

export const makeDraw = (tournament: Tournament, random: Random): Result<Tournament> => {
	if (tournament.phase === 'registration') {
		return { ok: false, reason: 'Show the House Rules before making the Draw.' };
	}
	if (tournament.phase !== 'houseRules') {
		return { ok: false, reason: 'The Draw has already been made.' };
	}
	if (tournament.players.length < 2) {
		return { ok: false, reason: 'The Draw needs at least two Players.' };
	}
	if (tournament.boards.length === 0) {
		return { ok: false, reason: 'The Draw needs at least one Board.' };
	}
	const shuffled = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const winnersDraw = createDraw(shuffled);
	const losersDrawOrder = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const drawnTournament: Tournament = {
		...tournament,
		phase: 'drawShown',
		winnersDraw,
		losersDrawOrder,
	};
	// Every Board is free at the Draw, so Matches take them lowest-numbered first; the rest wait for one.
	return { ok: true, value: reseat(drawnTournament) };
};

/*
 * Pairs Players, already in a random order, into a bracket's first-Round places. The bracket's size is the
 * next power of two at or above the field, and Byes fill the gap. Each Bye takes a whole first-Round place,
 * so no place is a Bye against a Bye. The first-Round Matches take neighbouring places at the top of the
 * bracket, so Bye Players meet each other in Round 2 and play from the Start too. Only with an odd number
 * of first-Round Matches does one Bye Player wait, for the last first-Round Match's winner.
 */
const createDraw = (shuffled: readonly Entrant[]): Draw => {
	let bracketSize = 2;
	while (bracketSize < shuffled.length) {
		bracketSize *= 2;
	}
	const places = bracketSize / 2;
	const firstRoundMatches = shuffled.length - places;
	let next = 0;
	return listIndexes(places).map((place): FirstRoundMatch | Bye =>
		place < firstRoundMatches
			? { players: [shuffled[next++], shuffled[next++]] }
			: // A Held Place is drawn first, so it is always in a Match.
				{ bye: shuffled[next++] as PlayerId },
	);
};

/*
 * Trades two Players' places in the Winners Draw, a Bye place included, before Start.
 * Which places hold Matches and which hold Byes stays as drawn, so each Match keeps its Board; seating then
 * brings a Match with a Home Board Player in it to their Home Board.
 */
export const swapPlayers = (
	tournament: Tournament,
	playerA: PlayerId,
	playerB: PlayerId,
): Result<Tournament> => {
	if (tournament.phase === 'registration' || tournament.phase === 'houseRules') {
		return { ok: false, reason: 'Make the Draw before swapping Players.' };
	}
	if (tournament.phase !== 'drawShown') {
		return { ok: false, reason: 'Players can’t be swapped once the Tournament has started.' };
	}
	const draw = tournament.winnersDraw!;
	const placeA = findDrawPlace(draw, playerA);
	const placeB = findDrawPlace(draw, playerB);
	if (placeA === -1 || placeB === -1) {
		return { ok: false, reason: 'That Player isn’t in the Draw.' };
	}
	// Two Bye Players in neighbouring places meet each other in Round 2.
	const isByePair =
		isBye(draw[placeA]) &&
		isBye(draw[placeB]) &&
		Math.floor(placeA / 2) === Math.floor(placeB / 2);
	if (placeA === placeB || isByePair) {
		return { ok: false, reason: 'Swapping two Players in the same Match changes nothing.' };
	}
	const swapEntrant = (entrant: Entrant): Entrant => {
		if (entrant === playerA) {
			return playerB;
		}
		return entrant === playerB ? playerA : entrant;
	};
	const swappedDraw = draw.map((entry): FirstRoundMatch | Bye =>
		isBye(entry)
			? { bye: swapEntrant(entry.bye) as PlayerId }
			: { players: [swapEntrant(entry.players[0]), swapEntrant(entry.players[1])] },
	);
	const swapped: Tournament = {
		...tournament,
		winnersDraw: swappedDraw,
	};
	return { ok: true, value: reseat(swapped) };
};

// The place in a Draw holding a Player, in a Match or as a Bye, or -1 if none does.
const findDrawPlace = (draw: Draw, player: PlayerId): number =>
	draw.findIndex((entry) =>
		isBye(entry) ? entry.bye === player : entry.players.includes(player),
	);

export const start = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase === 'registration' || tournament.phase === 'houseRules') {
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
export const makeLosersDrawIfDue = (tournament: Tournament): Tournament => {
	if (tournament.losersDraw !== undefined) {
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
		return { ...tournament, losersDraw: null };
	}
	if (staying.length < 2) {
		return tournament;
	}
	const entrants = held === undefined ? staying : [{ heldFor: held }, ...staying];
	return { ...tournament, losersDraw: createDraw(entrants) };
};

/*
 * The Bye Player waiting for a first-Round Match's winner, while their own first Match has no result:
 * only with an odd number of first-Round Matches.
 */
const findByePlayerStillToPlay = (tournament: Tournament): PlayerId | undefined => {
	const draw = tournament.winnersDraw!;
	const place = listIndexes(Math.floor(draw.length / 2)).find(
		(p) => isBye(draw[2 * p]) !== isBye(draw[2 * p + 1]),
	);
	if (place === undefined) {
		return undefined;
	}
	const match: MatchPlace = { bracket: 'winners', round: 2, place };
	if (findWinner(tournament, match) !== undefined) {
		return undefined;
	}
	return (draw[2 * place + 1] as Bye).bye;
};

/*
 * The Matches the Winners Draw started: every first-Round Match, and every Round 2 Match between two Bye
 * Players.
 */
const listStartedMatches = (tournament: Tournament): MatchPlace[] => {
	const draw = tournament.winnersDraw!;
	return [
		...listIndexes(draw.length)
			.filter((place) => !isBye(draw[place]))
			.map((place): MatchPlace => ({ bracket: 'winners', round: 1, place })),
		...listIndexes(Math.floor(draw.length / 2))
			.filter((place) => isBye(draw[2 * place]) && isBye(draw[2 * place + 1]))
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

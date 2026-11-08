/*
 * Lookups on the brackets as they stand: a Match's Players, winner and Board, the Matches still to finish,
 * and the Match a winner goes on to. Every other part of the core reads the brackets through these.
 */
import type {
	Bracket,
	BracketName,
	BoardNumber,
	Bye,
	FirstRoundMatch,
	HeldPlace,
	MatchPlace,
	MatchResult,
	Player,
	PlayerId,
	Tournament,
} from './types';

// Who the Draw puts in a first-Round Match: a Player, or a place held for one.
export type Entrant = FirstRoundMatch['players'][number];

// One side of a Match: a Player known, the earlier Match that sends them, or a place held for them.
export type Seat = PlayerId | MatchPlace | HeldPlace;

export const isBye = (entry: FirstRoundMatch | Bye): entry is Bye => 'bye' in entry;

export const listIndexes = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

export const findPlayer = (tournament: Tournament, id: PlayerId): Player =>
	tournament.players.find((p) => p.id === id)!;

// A bracket once drawn, or undefined: the Losers Bracket before its Draw, or with none played.
export const getBracket = (tournament: Tournament, bracket: BracketName): Bracket | undefined =>
	bracket === 'winners' ? tournament.winnersBracket : (tournament.losersBracket ?? undefined);

// The bracket holds twice as many Players as its first Round has places, halving each Round to the final.
export const countRounds = (bracket: Bracket): number => Math.log2(2 * bracket.firstRound.length);

export const isSameMatch = (a: MatchPlace, b: MatchPlace): boolean =>
	a.bracket === b.bracket && a.round === b.round && a.place === b.place;

// Tells a Match from every other, in either bracket: Rounds and places repeat between the two.
export const getMatchKey = ({ bracket, round, place }: MatchPlace): string =>
	`${bracket} ${round} ${place}`;

export const findBoard = (tournament: Tournament, match: MatchPlace): BoardNumber | undefined =>
	tournament.onBoards.find((on) => isSameMatch(on.match, match))?.board;

export const findWinner = (tournament: Tournament, match: MatchPlace): PlayerId | undefined =>
	tournament.results.find((r) => isSameMatch(r.match, match))?.winner;

// The Match a Match's winner goes on to, or undefined for the final.
export const findFollowing = (tournament: Tournament, match: MatchPlace): MatchPlace | undefined =>
	match.round === countRounds(getBracket(tournament, match.bracket)!)
		? undefined
		: { bracket: match.bracket, round: match.round + 1, place: Math.floor(match.place / 2) };

/*
 * A Match's two Players, each known or still to come from the earlier Match that sends them. A Bye Player
 * comes into Round 2 straight from the first Round.
 */
export const findPlayers = (tournament: Tournament, match: MatchPlace): readonly [Seat, Seat] => {
	const { bracket, round, place } = match;
	if (round === 1) {
		return (findSettledEntry(tournament, match) as FirstRoundMatch).players;
	}
	const findPlayerFrom = ({ side }: { side: number }): Seat => {
		const earlier = { bracket, round: round - 1, place: 2 * place + side };
		if (round === 2) {
			const entry = findSettledEntry(tournament, earlier);
			if (isBye(entry)) {
				return entry.bye;
			}
		}
		return findWinner(tournament, earlier) ?? earlier;
	};
	return [findPlayerFrom({ side: 0 }), findPlayerFrom({ side: 1 })];
};

/*
 * A first-Round entry as it stands. A Held Place is settled once its Player's first Match has a result:
 * to them if they lost it and stayed, and otherwise their opponent has a Bye.
 */
export const findSettledEntry = (
	tournament: Tournament,
	match: MatchPlace,
): FirstRoundMatch | Bye => {
	const entry = getBracket(tournament, match.bracket)!.firstRound[match.place];
	if (isBye(entry)) {
		return entry;
	}
	const [a, b] = entry.players.map((e) => settleEntrant(tournament, e));
	if (a === 'bye' || b === 'bye') {
		return { bye: (a === 'bye' ? b : a) as PlayerId };
	}
	return { players: [a, b] };
};

// A Held Place's Player, a Bye if they aren't coming, or the place still held.
const settleEntrant = (tournament: Tournament, entrant: Entrant): Entrant | 'bye' => {
	if (typeof entrant === 'number') {
		return entrant;
	}
	const [firstMatch] = listResultsOf(tournament, 'winners', entrant.heldFor);
	if (!firstMatch) {
		return entrant;
	}
	const isStaying = firstMatch.winner !== entrant.heldFor && firstMatch.loserAnswer === 'staying';
	return isStaying ? entrant.heldFor : 'bye';
};

/*
 * Every result of a Match a Player played in a bracket, in the order recorded. Results are filtered by
 * bracket before their Players are read. Working out who takes a Losers Bracket Held Place reads this list
 * for the Winners Bracket, so reading a Losers Match's Players here would call back into it without end.
 */
export const listResultsOf = (
	tournament: Tournament,
	bracket: BracketName,
	player: PlayerId,
): MatchResult[] =>
	tournament.results.filter(
		(r) => r.match.bracket === bracket && findPlayers(tournament, r.match).includes(player),
	);

// A Match's two Players once both are known, ready to play, or undefined while one is still to come.
export const findBothPlayers = (
	tournament: Tournament,
	match: MatchPlace,
): readonly [PlayerId, PlayerId] | undefined => {
	const players = findPlayers(tournament, match);
	return players.every((p) => typeof p === 'number')
		? (players as readonly [PlayerId, PlayerId])
		: undefined;
};

export const isReadyToPlay = (tournament: Tournament, match: MatchPlace): boolean =>
	findBothPlayers(tournament, match) !== undefined;

// The other Player in a Match whose two Players are known.
export const findOpponent = (
	tournament: Tournament,
	match: MatchPlace,
	player: PlayerId,
): PlayerId => {
	const players = findPlayers(tournament, match) as readonly PlayerId[];
	return players.find((p) => p !== player)!;
};

/*
 * Every Match with a Player known and no winner yet, in bracket order: the Winners Bracket, then the Losers
 * Bracket, each from the first Round on and down each Round.
 */
export const listLiveMatches = (tournament: Tournament): MatchPlace[] =>
	(['winners', 'losers'] as const).flatMap((name) => {
		const bracket = getBracket(tournament, name);
		if (!bracket) {
			return [];
		}
		return listIndexes(countRounds(bracket)).flatMap((r) =>
			listIndexes(bracket.firstRound.length / 2 ** r)
				.map((place): MatchPlace => ({ bracket: name, round: r + 1, place }))
				.filter(
					(match) =>
						!(match.round === 1 && isBye(findSettledEntry(tournament, match))) &&
						findWinner(tournament, match) === undefined &&
						findPlayers(tournament, match).some((p) => typeof p === 'number'),
				),
		);
	});

// Whether a bracket's final has a winner: false while the bracket is still to be drawn.
export const hasChampion = (tournament: Tournament, bracket: BracketName): boolean => {
	const drawn = getBracket(tournament, bracket);
	if (!drawn) {
		return false;
	}
	const final: MatchPlace = { bracket, round: countRounds(drawn), place: 0 };
	return findWinner(tournament, final) !== undefined;
};

/*
 * Whether a Player has lost a Match in a bracket, and so left it. A Bye is not a loss, and a Player who has
 * lost in the Winners Bracket may still be playing in the Losers Bracket.
 */
export const hasLostIn = (
	tournament: Tournament,
	bracket: BracketName,
	player: PlayerId,
): boolean => listResultsOf(tournament, bracket, player).some((r) => r.winner !== player);

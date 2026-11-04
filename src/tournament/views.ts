/*
 * What the screens show, worked out from the Tournament: who sits at each Board, who waits for one, who is
 * playing, each bracket's picture, and the results the Organizer can still undo.
 */
import {
	countRounds,
	findBoard,
	findBothPlayers,
	findOpponent,
	findPlayer,
	findPlayers,
	findSettledEntry,
	findWinner,
	getBracket,
	isBye,
	listIndexes,
	type Seat,
} from './bracket';
import { findUndoRefusal } from './results';
import type { BoardNumber, BracketName, MatchPlace, Player, Tournament } from './types';

// A Player still to come: the winner of a Match between those two Players, or of one not yet set.
export interface WinnerOf {
	readonly winnerOf?: readonly [Player, Player];
}

// A Player who may yet come: the Bye Player a Losers Bracket place is held for.
export interface PlaceHeld {
	readonly placeHeldFor: Player;
}

// A Match's second Player as they are seated: known, or still to come.
export type Opponent = Player | WinnerOf | PlaceHeld;

export interface MatchOnBoard {
	readonly board: BoardNumber;
	readonly match: MatchPlace;
	// The second may still be to come, while the first sits at the Board waiting.
	readonly players: readonly [Player, Opponent];
}

/*
 * Every Match holding a Board, in Board order, so each Player can find their seat: on Tonight’s Draw
 * screen, and as the Matches being played once Started. None before the Draw.
 */
export const getMatchesOnBoards = (tournament: Tournament): readonly MatchOnBoard[] =>
	tournament.onBoards
		.map(({ match, board }) => ({
			board,
			match,
			players: findSeatedPlayers(tournament, match),
		}))
		.sort((a, b) => a.board - b.board);

/*
 * A Match's Players as they are seated: one known, named first while they wait, and the other known too
 * or still to come.
 */
const findSeatedPlayers = (
	tournament: Tournament,
	match: MatchPlace,
): readonly [Player, Opponent] => {
	const findSeated = (from: Seat): Opponent => {
		if (typeof from === 'number') {
			return findPlayer(tournament, from);
		}
		if ('heldFor' in from) {
			return { placeHeldFor: findPlayer(tournament, from.heldFor) };
		}
		const players = findBothPlayers(tournament, from);
		return {
			winnerOf:
				players && (players.map((p) => findPlayer(tournament, p)) as [Player, Player]),
		};
	};
	const [a, b] = findPlayers(tournament, match).map(findSeated);
	return 'name' in a ? [a, b] : [b as Player, a];
};

export interface MatchWaitingForBoard {
	readonly match: MatchPlace;
	// The second may still be to come.
	readonly players: readonly [Player, Opponent];
}

// Every Match waiting for a Board, in turn: the next Board to free goes to the first.
export const getWaitingForBoard = (tournament: Tournament): readonly MatchWaitingForBoard[] =>
	tournament.waitingForBoard.map((match) => ({
		match,
		players: findSeatedPlayers(tournament, match),
	}));

export interface MatchBeingPlayed {
	readonly board: BoardNumber;
	readonly players: readonly [Player, Player];
}

/*
 * Every Match being played, in Board order: both its Players are known and sit at its Board. A Player
 * waiting for their opponent is not playing yet. None before Start.
 */
export const getNowPlaying = (tournament: Tournament): readonly MatchBeingPlayed[] => {
	if (tournament.phase !== 'inProgress') {
		return [];
	}
	return getMatchesOnBoards(tournament).flatMap(({ board, players: [a, b] }) =>
		'name' in b ? [{ board, players: [a, b] as const }] : [],
	);
};

// A Match in a bracket's picture.
export interface BracketMatch {
	// Undefined while that Player is still to come.
	readonly players: readonly [Player | undefined, Player | undefined];
	// While the Match is being played, or held for a Bye Player waiting there.
	readonly board?: BoardNumber;
	readonly winner?: Player;
}

export interface BracketPicture {
	/*
	 * Each Round's Matches, in bracket order, from the first Round to the final. A Bye's place in the first
	 * Round is undefined: its Player is in Round 2. A first Round of nothing but Byes is left out.
	 */
	readonly rounds: readonly (readonly (BracketMatch | undefined)[])[];
	// The final's winner, once it is recorded.
	readonly champion?: Player;
}

/*
 * A whole bracket as it stands: who has advanced, who is still playing. Undefined while that bracket has no
 * Draw: before it is made, and when fewer than two Players stay for a Losers Bracket.
 */
export const getBracketPicture = (
	tournament: Tournament,
	name: BracketName,
): BracketPicture | undefined => {
	const bracket = getBracket(tournament, name);
	if (!bracket) {
		return undefined;
	}
	const findKnown = (from: Seat): Player | undefined =>
		typeof from === 'number' ? findPlayer(tournament, from) : undefined;
	const pictureMatch = (match: MatchPlace): BracketMatch => {
		const [a, b] = findPlayers(tournament, match);
		const winner = findWinner(tournament, match);
		return {
			players: [findKnown(a), findKnown(b)],
			board: findBoard(tournament, match),
			winner: winner === undefined ? undefined : findPlayer(tournament, winner),
		};
	};
	const rounds = listIndexes(countRounds(bracket)).map((r) =>
		listIndexes(bracket.firstRound.length / 2 ** r).map((place) =>
			r === 0 && isBye(findSettledEntry(tournament, { bracket: name, round: 1, place }))
				? undefined
				: pictureMatch({ bracket: name, round: r + 1, place }),
		),
	);
	/*
	 * A Held Place that became a Bye can leave a first Round of nothing but Byes: the bracket was drawn for
	 * one more Player than came. It is left out, so the bracket looks the size of its field.
	 */
	const isFirstRoundEmpty = rounds.length > 1 && rounds[0].every((m) => m === undefined);
	const shownRounds = isFirstRoundEmpty ? rounds.slice(1) : rounds;
	return { rounds: shownRounds, champion: shownRounds.at(-1)![0]!.winner };
};

export interface RecordedResult {
	readonly match: MatchPlace;
	// Where it was played.
	readonly board: BoardNumber;
	readonly winner: Player;
	readonly loser: Player;
	readonly isForfeit: boolean;
}

// The results the Organizer can still undo, latest first.
export const getUndoableResults = (tournament: Tournament): readonly RecordedResult[] =>
	tournament.results
		.filter((r) => findUndoRefusal(tournament, r.match) === undefined)
		.map(({ match, board, winner, isForfeit }) => {
			const loser = findOpponent(tournament, match, winner);
			return {
				match,
				board,
				winner: findPlayer(tournament, winner),
				loser: findPlayer(tournament, loser),
				isForfeit,
			};
		})
		.reverse();

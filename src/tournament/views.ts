/*
 * What the screens show, worked out from the Tournament: who sits at each Board, who waits for
 * one, who is playing, each bracket's picture, and the results the Organizer can still undo.
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
	getDraw,
	hasChampion,
	isBye,
	isSameMatch,
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
 * Every Match holding a Board, in Board order, so the Organizer can find each Match's seat:
 * on Tonight’s Draw, and as the Matches being played once Started. None before the Draw.
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
 * A Match's Players as they are seated: one known, named first
 * while they wait, and the other known too or still to come.
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

/*
 * One side of a Match in a bracket's picture: a Player known, the place held for
 * a Bye Player, or undefined while they are still to come from an earlier Match.
 */
export type BracketPlayer = Player | PlaceHeld | undefined;

// A Match in a bracket's picture.
export interface BracketMatch {
	readonly players: readonly [BracketPlayer, BracketPlayer];
	// While the Match is being played, or held for a Bye Player waiting there.
	readonly board?: BoardNumber;
	readonly winner?: Player;
}

export interface BracketPicture {
	/*
	 * Each Round's Matches, in bracket order, from the first Round to the
	 * final. A Bye's place in the first Round is undefined: its Player is
	 * in Round 2. A first Round of nothing but Byes is left out.
	 */
	readonly rounds: readonly (readonly (BracketMatch | undefined)[])[];
	// The final's winner, once it is recorded.
	readonly champion?: Player;
}

/*
 * A whole bracket as it stands: who has advanced, who is still
 * playing. Undefined while that bracket has no Draw: before it is
 * made, and when fewer than two Players stay for a Losers Bracket.
 */
export const getBracketPicture = (
	tournament: Tournament,
	name: BracketName,
): BracketPicture | undefined => {
	const draw = getDraw(tournament, name);
	if (!draw) {
		return undefined;
	}
	const findBracketPlayer = (from: Seat): BracketPlayer => {
		if (typeof from === 'number') {
			return findPlayer(tournament, from);
		}
		return 'heldFor' in from
			? { placeHeldFor: findPlayer(tournament, from.heldFor) }
			: undefined;
	};
	const pictureMatch = (match: MatchPlace): BracketMatch => {
		const [a, b] = findPlayers(tournament, match);
		const winner = findWinner(tournament, match);
		return {
			players: [findBracketPlayer(a), findBracketPlayer(b)],
			board: findBoard(tournament, match),
			winner: winner === undefined ? undefined : findPlayer(tournament, winner),
		};
	};
	const allRounds = listIndexes(countRounds(tournament, name)).map((r) =>
		listIndexes(draw.length / 2 ** r).map((place) =>
			r === 0 && isBye(findSettledEntry(tournament, { bracket: name, round: 1, place }))
				? undefined
				: pictureMatch({ bracket: name, round: r + 1, place }),
		),
	);
	const rounds = isFirstRoundLeftOut(tournament, name) ? allRounds.slice(1) : allRounds;
	return { rounds, champion: rounds.at(-1)![0]!.winner };
};

/*
 * Whether a bracket's picture leaves out its first Round. A Held Place that became a
 * Bye can leave a first Round of nothing but Byes: the bracket was drawn for one
 * more Player than came. It is left out, so the bracket looks the size of its field.
 */
const isFirstRoundLeftOut = (tournament: Tournament, name: BracketName): boolean => {
	return (
		countRounds(tournament, name) > 1 &&
		listIndexes(getDraw(tournament, name)!.length).every((place) =>
			isBye(findSettledEntry(tournament, { bracket: name, round: 1, place })),
		)
	);
};

/*
 * A Round as its bracket's picture numbers it: counted
 * from the first Round shown, out of the Rounds shown.
 */
export interface ShownRound {
	readonly round: number;
	readonly roundCount: number;
}

/*
 * A Match's Round as its bracket's picture shows it,
 * so every screen numbers it as the TV bracket does.
 */
export const getShownRound = (
	tournament: Tournament,
	{ bracket, round }: MatchPlace,
): ShownRound => {
	const leftOut = isFirstRoundLeftOut(tournament, bracket) ? 1 : 0;
	const roundCount = countRounds(tournament, bracket);
	return { round: round - leftOut, roundCount: roundCount - leftOut };
};

// A bracket's champion: the winner of its Final.
export interface ChampionOfBracket {
	readonly bracketName: BracketName;
	readonly player: Player;
	// The Player they beat in the Final.
	readonly finalOpponent: Player;
	// The Final's opponent forfeited it.
	readonly isForfeit: boolean;
}

/*
 * Each bracket that has a champion, the Winners Bracket
 * first, with whom its champion beat in the Final.
 */
export const getChampions = (tournament: Tournament): readonly ChampionOfBracket[] =>
	(['winners', 'losers'] as const)
		.filter((bracketName) => hasChampion(tournament, bracketName))
		.map((bracketName) => {
			const final: MatchPlace = {
				bracket: bracketName,
				round: countRounds(tournament, bracketName),
				place: 0,
			};
			const result = tournament.results.find((r) => isSameMatch(r.match, final))!;
			const finalOpponent = findOpponent(tournament, final, result.winner);
			return {
				bracketName,
				player: findPlayer(tournament, result.winner),
				finalOpponent: findPlayer(tournament, finalOpponent),
				isForfeit: result.isForfeit,
			};
		});

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

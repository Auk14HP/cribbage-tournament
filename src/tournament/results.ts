/*
 * Recording each Match's result, a win or a Forfeit, with a first-Match loser's answer to whether they are
 * staying for the Losers Bracket; and undoing a result.
 */
import type { Result } from '../result';
import {
	findBoard,
	findFollowing,
	findOpponent,
	findPlayer,
	findPlayers,
	findWinner,
	hasChampion,
	isBye,
	isSameMatch,
	listResultsOf,
} from './bracket';
import { drawLosersBracketIfDue, isHeldFor } from './draw';
import { reseat } from './seating';
import type { MatchPlace, PlayerId, StayingAnswer, Tournament } from './types';

/*
 * Records a Match's winner, who advances to the next Round. The Match's Board frees. The winner goes to
 * their next Match's Board, where their opponent already waits; or, if it has none yet, the next Match
 * takes the lowest-numbered free Board and the winner waits there for their opponent. That is often the
 * Board they just won at. A loser the Losers Bracket is open to must say whether they are staying for it.
 */
export const recordWinner = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
	loserAnswer?: StayingAnswer,
): Result<Tournament> => {
	const refusal = findResultRefusal(tournament, match, winner);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const loser = findOpponent(tournament, match, winner);
	const answerRefusal = findAnswerRefusal(tournament, loser, loserAnswer);
	if (answerRefusal) {
		return { ok: false, reason: answerRefusal };
	}
	return { ok: true, value: settleMatch(tournament, match, winner, false, loserAnswer) };
};

/*
 * Records a Forfeit: the Player leaves before finishing the Match, and their opponent wins it. The Losers
 * Bracket is open to them as to any loser.
 */
export const recordForfeit = (
	tournament: Tournament,
	match: MatchPlace,
	leaver: PlayerId,
	leaverAnswer?: StayingAnswer,
): Result<Tournament> => {
	const refusal =
		findResultRefusal(tournament, match, leaver) ??
		findAnswerRefusal(tournament, leaver, leaverAnswer);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const opponent = findOpponent(tournament, match, leaver);
	return { ok: true, value: settleMatch(tournament, match, opponent, true, leaverAnswer) };
};

// A loser the Losers Bracket is open to must say whether they are staying for it.
const findAnswerRefusal = (
	tournament: Tournament,
	loser: PlayerId,
	answer: StayingAnswer | undefined,
): string | undefined =>
	answer === undefined && isLosersBracketOpenTo(tournament, loser)
		? `Say whether ${findPlayer(tournament, loser).name} is staying for the Losers Bracket.`
		: undefined;

/*
 * Whether a Player who loses their Match now is asked if they are staying for the Losers Bracket: it is
 * their first Match, and the Losers Draw is still to come or holds a place for them. A Bye is not a Match,
 * so a Bye Player's first Match is in Round 2.
 */
export const isLosersBracketOpenTo = (tournament: Tournament, player: PlayerId): boolean => {
	// A Player who has played no Winners Bracket Match has played none.
	if (listResultsOf(tournament, 'winners', player).length > 0) {
		return false;
	}
	const { losersBracket } = tournament;
	if (losersBracket === undefined) {
		return true;
	}
	return (
		losersBracket !== null &&
		losersBracket.firstRound.some(
			(entry) => !isBye(entry) && entry.players.some((e) => isHeldFor(e, player)),
		)
	);
};

// Why a result can't be recorded for that Player in that Match, or undefined if it can.
const findResultRefusal = (
	tournament: Tournament,
	match: MatchPlace,
	player: PlayerId,
): string | undefined => {
	if (tournament.phase === 'finished') {
		return 'The Tournament is finished.';
	}
	if (tournament.phase !== 'inProgress') {
		return 'Press Start before recording a winner.';
	}
	if (findWinner(tournament, match) !== undefined) {
		return 'That Match already has a winner.';
	}
	const players = findPlayers(tournament, match);
	if (players.some((p) => typeof p !== 'number')) {
		return 'That Match is still waiting for a Player.';
	}
	if (!players.includes(player)) {
		return 'That Player isn’t in that Match.';
	}
	if (findBoard(tournament, match) === undefined) {
		const [a, b] = players.map((p) => findPlayer(tournament, p as PlayerId).name);
		return `${a} and ${b} are still waiting for a Board.`;
	}
	return undefined;
};

// Records the winner of a Match whose result can be recorded, moving them on to their next Match.
const settleMatch = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
	isForfeit: boolean,
	loserAnswer: StayingAnswer | undefined,
): Tournament => {
	const board = findBoard(tournament, match)!;
	const loser = findOpponent(tournament, match, winner);
	// Kept only from a loser who was asked.
	const asked = isLosersBracketOpenTo(tournament, loser) ? { loserAnswer } : {};
	const recorded = drawLosersBracketIfDue({
		...tournament,
		results: [...tournament.results, { match, winner, board, isForfeit, ...asked }],
	});
	const settled = reseat(recorded);
	return isFinished(settled) ? { ...settled, phase: 'finished' } : settled;
};

// The Tournament is finished once every bracket played has a champion.
const isFinished = (tournament: Tournament): boolean => {
	if (!hasChampion(tournament, 'winners')) {
		return false;
	}
	return tournament.losersBracket === null || hasChampion(tournament, 'losers');
};

/*
 * Undoes a Match's recorded result, so it can be played again or its winner corrected. The winner leaves
 * their next Match, which frees its Board unless their opponent already waits there, and the Match takes a
 * Board again: its own if it is still free. Undoing a first Match when no Losers Bracket was drawn leaves
 * the Losers Draw to be made again, once that Match has a result.
 */
export const undoResult = (tournament: Tournament, match: MatchPlace): Result<Tournament> => {
	const result = tournament.results.find((r) => isSameMatch(r.match, match));
	if (!result) {
		return { ok: false, reason: 'That Match has no result to undo.' };
	}
	const refusal = findUndoRefusal(tournament, match);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const isLosersDrawUndone = isFirstMatch(tournament, match) && tournament.losersBracket === null;
	const undone: Tournament = {
		...tournament,
		results: tournament.results.filter((r) => !isSameMatch(r.match, match)),
		losersBracket: isLosersDrawUndone ? undefined : tournament.losersBracket,
	};
	// Undoing the final takes the champion back out, so the Tournament is in progress again.
	return {
		ok: true,
		value: { ...reseat(undone, { match, board: result.board }), phase: 'inProgress' },
	};
};

/*
 * Why a Match's result can't be undone, or undefined if it can: its winner has played their next Match,
 * or it decided who could stay for a Losers Bracket now drawn.
 */
export const findUndoRefusal = (tournament: Tournament, match: MatchPlace): string | undefined => {
	if (hasPlayedOn(tournament, match)) {
		return 'That result can’t be undone: its winner has already played their next Match.';
	}
	if (isFirstMatch(tournament, match) && tournament.losersBracket) {
		return 'That result can’t be undone: the Losers Bracket has been drawn.';
	}
	return undefined;
};

// Whether a Winners Bracket Match is the first Match either of its Players played.
const isFirstMatch = (tournament: Tournament, match: MatchPlace): boolean =>
	match.bracket === 'winners' &&
	// A Match with a result has both its Players known.
	(findPlayers(tournament, match) as readonly PlayerId[]).some(
		(player) =>
			!listResultsOf(tournament, 'winners', player).some((r) => r.match.round < match.round),
	);

// Whether a Match's winner has played their next Match, so its result can no longer be undone.
const hasPlayedOn = (tournament: Tournament, match: MatchPlace): boolean => {
	const following = findFollowing(tournament, match);
	return following !== undefined && findWinner(tournament, following) !== undefined;
};

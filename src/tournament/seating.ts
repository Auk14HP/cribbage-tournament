// Seating Matches at Boards: which Match holds which Board, and which wait for one, after every command.
import {
	findPlayers,
	hasChampion,
	hasLostIn,
	isReadyToPlay,
	isSameMatch,
	listLiveMatches,
	listResultsOf,
} from './bracket';
import type {
	BoardNumber,
	BoardTaken,
	BracketName,
	MatchPlace,
	PlayerId,
	Tournament,
} from './types';

/*
 * Brings the Boards in line with the Matches: each Match with a Player known and no winner yet holds a
 * Board, or waits for one. A Match with a Home Board Player in it is at their Home Board, and no other Match
 * takes that Board while they are in the Tournament. A Match that no longer needs a Board gives it up. A
 * Match newly needing one joins the end of the queue, in bracket order, and each free Board goes to the
 * first, lowest-numbered first. A Match moved off a Home Board its Player has taken back goes ahead of the
 * queue. When there are too few free Boards for the queue, Matches ready to play, both Players known, go
 * ahead of those still waiting on a Player, and a Player waiting alone at a Board other than their Home Board
 * gives it up to one, latest seated first, so a Board never sits idle while two Players are ready. A Match
 * being re-opened may ask for its own Board back, and gets it if it is free.
 */
export const reseat = (tournament: Tournament, returning?: BoardTaken): Tournament => {
	const live = listLiveMatches(tournament);
	const isLive = (match: MatchPlace) => live.some((m) => isSameMatch(m, match));
	const homeBoards = tournament.homeBoards.filter((homeBoard) =>
		isInTournament(tournament, homeBoard.player),
	);
	const atHome = homeBoards.flatMap(({ player, board }): BoardTaken[] => {
		const match = live.find((m) => findPlayers(tournament, m).includes(player));
		return match ? [{ match, board }] : [];
	});
	const isAtHome = (match: MatchPlace) => atHome.some((on) => isSameMatch(on.match, match));
	const isHomeBoard = (board: BoardNumber) =>
		homeBoards.some((homeBoard) => homeBoard.board === board);
	// The Boards every other Match shares.
	const boards = tournament.boards.filter((board) => !isHomeBoard(board));
	const isStillSeated = (on: BoardTaken) => isLive(on.match) && !isAtHome(on.match);
	const movedOff = tournament.onBoards
		.filter((on) => isStillSeated(on) && isHomeBoard(on.board))
		.map((on) => on.match);
	const onBoards = tournament.onBoards.filter(
		(on) => isStillSeated(on) && !isHomeBoard(on.board),
	);
	const isFree = (board: BoardNumber) => !onBoards.some((on) => on.board === board);
	if (
		returning &&
		boards.includes(returning.board) &&
		isFree(returning.board) &&
		!isAtHome(returning.match)
	) {
		onBoards.push(returning);
	}
	const isSeated = (match: MatchPlace) =>
		isAtHome(match) ||
		movedOff.some((m) => isSameMatch(m, match)) ||
		onBoards.some((on) => isSameMatch(on.match, match));
	const isAlreadyWaiting = (match: MatchPlace) =>
		tournament.waitingForBoard.some((m) => isSameMatch(m, match));
	const inTurn = [
		...movedOff,
		...tournament.waitingForBoard.filter((match) => isLive(match) && !isSeated(match)),
		...live.filter((match) => !isSeated(match) && !isAlreadyWaiting(match)),
	];
	const isReady = (match: MatchPlace) => isReadyToPlay(tournament, match);
	const readyWithoutBoard = inTurn.filter(isReady).length - boards.filter(isFree).length;
	const seatedAlone = onBoards.filter((on) => !isReady(on.match));
	const givingUp = seatedAlone.slice(Math.max(0, seatedAlone.length - readyWithoutBoard));
	const keepingBoards = onBoards.filter((on) => !givingUp.includes(on));
	const freeBoards = boards.filter((board) => !keepingBoards.some((on) => on.board === board));
	const needing = [...inTurn, ...givingUp.map((on) => on.match)];
	const queue =
		needing.length <= freeBoards.length ? needing : orderReadyFirst(tournament, needing);
	const seated = queue
		.slice(0, freeBoards.length)
		.map((match, index) => ({ match, board: freeBoards[index] }));
	/*
	 * Matches at their Home Boards are worked out afresh each time and listed first. Only the order of the
	 * Matches at the other Boards matters: it decides which Player waiting alone gives up their Board to a
	 * Match ready to play.
	 */
	return {
		...tournament,
		onBoards: [...atHome, ...keepingBoards, ...seated],
		waitingForBoard: queue.slice(freeBoards.length),
	};
};

/*
 * Whether a Player is still in the Tournament: in the Winners Bracket until they lose there or win it, and
 * then, if they stay for the Losers Bracket, until no Losers Bracket is played, or they lose there or win it.
 */
export const isInTournament = (tournament: Tournament, player: PlayerId): boolean => {
	const isStillIn = (bracket: BracketName) =>
		!hasLostIn(tournament, bracket, player) && !hasChampion(tournament, bracket);
	if (!hasLostIn(tournament, 'winners', player)) {
		return isStillIn('winners');
	}
	// Only a Player losing their first Match is asked whether they are staying.
	const loss = listResultsOf(tournament, 'winners', player).find((r) => r.winner !== player)!;
	return (
		loss.loserAnswer === 'staying' && tournament.losersBracket !== null && isStillIn('losers')
	);
};

// Matches ready to play first, both Players known, then those still waiting on a Player, each in turn.
export const orderReadyFirst = (
	tournament: Tournament,
	matches: readonly MatchPlace[],
): MatchPlace[] => {
	const ready = matches.filter((match) => isReadyToPlay(tournament, match));
	return [...ready, ...matches.filter((match) => !ready.includes(match))];
};

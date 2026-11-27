/*
 * Set-up shared by the core's tests and the routes' tests: Tournaments
 * registered, drawn and Started, the commands' outcomes checked, and
 * lookups on who sits where. No browser here: the core's tests run in Node.
 */
import { expect } from 'vitest';
import type { Result } from '../result';
import { getPlayerName } from '../wording';
import {
	createTournament,
	getBracketPicture,
	getMatchKey,
	getMatchesOnBoards,
	getWaitingForBoard,
	listTvScreens,
	makeDraw,
	recordWinner,
	registerPlayer,
	setBoardCount,
	showHouseRules,
	start,
	type BracketMatch,
	type BracketPlayer,
	type MatchOnBoard,
	type Opponent,
	type Player,
	type Random,
	type StayingAnswer,
	type Tournament,
} from './index';

// A repeatable stand-in for Math.random (mulberry32): the same seed gives the same numbers.
export const createSeededRandom = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/*
 * Returns the Tournament a command made, failing the test if the command was
 * refused or left the Boards or the TV in a state no Tournament should reach.
 * Every command a test runs goes through here, so each one is checked.
 */
export const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(`Expected command to succeed, was rejected: ${outcome.reason}`);
	}
	expectSeatingHolds(outcome.value);
	expectTvChoiceOffered(outcome.value);
	return outcome.value;
};

/*
 * Checks the Boards: each Match holding a Board is at a Board set out, no Board
 * holds two Matches, no Match holds two Boards, and no Match both holds a Board
 * and waits for one. Whether every Match that needs a Board holds one or waits for
 * one can't be read through the Tournament's queries, so it isn't checked here.
 */
export const expectSeatingHolds = (tournament: Tournament) => {
	const matchesOnBoards = getMatchesOnBoards(tournament);
	const matchesAtBoardsNotSetOut = matchesOnBoards.filter(
		(m) => !tournament.boards.includes(m.board),
	);
	expect(matchesAtBoardsNotSetOut).toEqual([]);
	expect(isEachBoardHeldOnce(matchesOnBoards)).toBe(true);
	const seatedKeys = matchesOnBoards.map((m) => getMatchKey(m.match));
	expect(new Set(seatedKeys).size).toBe(seatedKeys.length);
	const waitingKeys = getWaitingForBoard(tournament).map((m) => getMatchKey(m.match));
	expect(waitingKeys.filter((key) => seatedKeys.includes(key))).toEqual([]);
};

/*
 * Checks the TV's choice is Auto or a Held screen the
 * current phase has, so one left from another phase fails.
 */
const expectTvChoiceOffered = (tournament: Tournament) => {
	const offered = ['auto', ...listTvScreens(tournament)];
	expect(offered).toContain(tournament.tvChoice);
};

// Whether no two Matches hold the same Board.
const isEachBoardHeldOnce = (matches: readonly MatchOnBoard[]): boolean => {
	const boardsHeld = matches.map((m) => m.board);
	return new Set(boardsHeld).size === boardsHeld.length;
};

// How many Players to register and Boards to set out.
type TournamentSize = { players: number; boards: number };

// A Tournament's size, and the seed that makes its Draw random.
export type TournamentSetup = TournamentSize & { seed?: number };

// A Tournament with the given number of Players registered and Boards set out.
export const setUpTournament = ({ players, boards }: TournamentSize): Tournament => {
	let tournament = createTournament();
	for (let i = 1; i <= players; i++) {
		tournament = expectOk(registerPlayer(tournament, `Player ${i}`));
	}
	const typed = String(boards);
	return boards === 0 ? tournament : expectOk(setBoardCount(tournament, typed));
};

// A Tournament with the named Players registered, in order.
export const registerPlayers = (...names: string[]): Tournament => {
	let tournament = createTournament();
	for (const name of names) {
		tournament = expectOk(registerPlayer(tournament, name));
	}
	return tournament;
};

/*
 * Goes on from registration to the House Rules step
 * and makes the Draw there, as the Organizer does.
 */
export const makeDrawAfterHouseRules = (
	registered: Tournament,
	random: Random,
): Result<Tournament> => {
	const onHouseRules = expectOk(showHouseRules(registered));
	return makeDraw(onHouseRules, random);
};

// The Draw for a Tournament set up as setUpTournament does, shuffled by a seeded random source.
export const makeSeededDraw = ({
	players,
	boards,
	seed = 1,
}: TournamentSetup): Result<Tournament> => {
	const registered = setUpTournament({ players, boards });
	return makeDrawAfterHouseRules(registered, createSeededRandom(seed));
};

// A Tournament that has made its Draw and Started.
export const startTournament = (setup: TournamentSetup): Tournament => {
	const drawn = expectOk(makeSeededDraw(setup));
	return expectOk(start(drawn));
};

/*
 * Records a win in a Match holding a Board, both its Players known:
 * by the Player given, or else by its first-named Player. The loser's
 * answer counts only if they are asked whether they are staying.
 */
export const recordWin = (
	tournament: Tournament,
	matchOnBoard: MatchOnBoard,
	loserAnswer: StayingAnswer,
	winner = matchOnBoard.players[0],
): Tournament => expectOk(recordWinner(tournament, matchOnBoard.match, winner.id, loserAnswer));

/*
 * Records every Match the Draw started, its first-named Player
 * winning and the loser staying for the Losers Bracket.
 */
export const playDrawStaying = (started: Tournament): Tournament => {
	let tournament = started;
	const opening = getMatchesOnBoards(tournament).filter(hasBothPlayersKnown);
	for (const matchOnBoard of opening) {
		tournament = recordWin(tournament, matchOnBoard, 'staying');
	}
	return tournament;
};

// Whether both a Match's Players are known.
export const hasBothPlayersKnown = (matchOnBoard: MatchOnBoard): boolean =>
	matchOnBoard.players.every((p) => 'name' in p);

// Whether all the given Players are seated in a Match, wherever the Draw put it.
export const isPlaying = (match: MatchOnBoard, ...players: Player[]): boolean =>
	players.every((p) => match.players.some((seated) => 'id' in seated && seated.id === p.id));

// The Match holding a Board that a Player is seated in.
export const findMatchOf = (tournament: Tournament, player: Player): MatchOnBoard =>
	getMatchesOnBoards(tournament).find((m) => isPlaying(m, player))!;

// The Players known in one Round's Matches holding a Board, a Match's two side by side.
export const listPlayersInRound = (tournament: Tournament, round: number): Player[] =>
	getMatchesOnBoards(tournament)
		.filter((m) => m.match.round === round)
		.flatMap((m) => m.players.filter((p): p is Player => 'name' in p));

// Each Match holding a Board, in Board order, by its Board and its Players' names.
export const listSeats = (tournament: Tournament) =>
	getMatchesOnBoards(tournament).map(({ board, players: [a, b] }) => [
		board,
		a.name,
		getPlayerName(b),
	]);

// Each Match waiting for a Board, in turn, by its Players' names.
export const listWaiting = (tournament: Tournament) =>
	getWaitingForBoard(tournament).map(({ players: [a, b] }) => [a.name, getPlayerName(b)]);

// The other Player in a Match holding a Board, both its Players known.
export const findOpponentIn = (match: MatchOnBoard, player: Player): Player =>
	match.players.find((p) => 'id' in p && p.id !== player.id) as Player;

/*
 * 5 Players on 4 Boards, Started, up to the Losers Draw: Ann beats Bob in the one first-Round
 * Match, Cat has a Bye and waits for Ann, and Dan beats Eve in Round 2, where they met as Byes.
 * Bob and Eve answer whether they are staying; Cat's first Match is still to come. losersMatch
 * lists the Players of the Losers Bracket's first-Round Match in the order its Draw put them.
 */
export const setUpHeldPlace = (answers: readonly [StayingAnswer, StayingAnswer]) => {
	let tournament = startTournament({ players: 5, boards: 4 });
	const [ann, bob] = listPlayersInRound(tournament, 1);
	const annAndBob = findMatchOf(tournament, ann);
	const onBoards = getMatchesOnBoards(tournament).filter((m) => !isPlaying(m, ann));
	const danAndEve = onBoards.find(hasBothPlayersKnown)!;
	const waiting = onBoards.find((m) => !hasBothPlayersKnown(m))!;
	const cat = waiting.players[0];
	const [dan, eve] = danAndEve.players as [Player, Player];
	tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, answers[0]));
	tournament = expectOk(recordWinner(tournament, danAndEve.match, dan.id, answers[1]));
	const [[firstMatch]] = getBracketPicture(tournament, 'losers')?.rounds ?? [[]];
	const [inFirstMatch] = listKnownPlayers(firstMatch);
	const losersMatch = inFirstMatch?.id === eve.id ? [eve, bob] : [bob, eve];
	return { tournament, ann, bob, cat, dan, eve, losersMatch };
};

/*
 * The Players known in a Match of a bracket's picture:
 * none still to come, nor a place held for one.
 */
export const listKnownPlayers = (match: BracketMatch | undefined): Player[] => {
	const players: readonly BracketPlayer[] = match?.players ?? [];
	return players.filter((p): p is Player => p !== undefined && 'id' in p);
};

// Whether a Player had a Bye: they aren't in any first-Round Match of the Winners Bracket.
export const isByePlayerIn = (tournament: Tournament, player: Opponent): boolean => {
	const [firstRound] = getBracketPicture(tournament, 'winners')!.rounds;
	return (
		'name' in player &&
		!firstRound.some((m) => listKnownPlayers(m).some((p) => p.id === player.id))
	);
};

// Whether exactly one of a Match's Players had a Bye.
export const hasOneByePlayer = (tournament: Tournament, match: MatchOnBoard): boolean =>
	match.players.filter((p) => isByePlayerIn(tournament, p)).length === 1;

/*
 * The one Bye Player still to play their first Match, waiting for the first-Round Match's winner,
 * and that Match of theirs: in a Tournament whose Draw has an odd number of first-Round Matches.
 */
export const findByePlayerStillToPlay = (tournament: Tournament) => {
	const firstMatch = getMatchesOnBoards(tournament).find(
		(m) =>
			m.match.bracket === 'winners' &&
			hasBothPlayersKnown(m) &&
			hasOneByePlayer(tournament, m),
	)!;
	const byePlayer = firstMatch.players.find((p) => isByePlayerIn(tournament, p)) as Player;
	return { byePlayer, firstMatch };
};

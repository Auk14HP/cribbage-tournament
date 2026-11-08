import { describe, expect, it } from 'vitest';
import {
	clearHomeBoard,
	getBracketPicture,
	getMatchKey,
	getMatchesOnBoards,
	getWaitingForBoard,
	hasLostIn,
	isLosersBracketOpenTo,
	makeDraw,
	recordWinner,
	removePlayer,
	setBoardCount,
	setHomeBoard,
	start,
	undoResult,
	type BoardNumber,
	type MatchOnBoard,
	type Player,
	type Tournament,
} from './index';
import {
	createSeededRandom,
	expectOk,
	findMatchOf,
	isPlaying,
	hasBothPlayersKnown,
	listPlayersInRound,
	listSeats,
	listWaiting,
	setUpTournament,
	startTournament,
} from './testSetup';

// The other Player in a Match holding a Board, both its Players known.
const findOpponentIn = (match: MatchOnBoard, player: Player): Player =>
	match.players.find((p) => 'id' in p && p.id !== player.id) as Player;

/*
 * 5 Players on 2 Boards, Started, the Home Board 2 for the Bye Player waiting for the first-Round Match's
 * winner, up to that Bye Player's first Match: the first-Round Match is won, its loser leaving, and the winner
 * comes to the Home Board. The two other Bye Players play at Board 1.
 */
const playToHomePlayersFirstMatch = () => {
	const started = startWithByePlayerHome();
	const { homePlayer } = started;
	const firstMatch = getMatchesOnBoards(started.tournament).find(hasBothPlayersKnown)!;
	const [winner] = firstMatch.players as [Player, Player];
	const tournament = expectOk(
		recordWinner(started.tournament, firstMatch.match, winner.id, 'leaving'),
	);
	return { tournament, homePlayer, homeMatch: findMatchOf(tournament, homePlayer) };
};

/*
 * After an undo: if the Home Board Player's Match came back to their Home Board while another Match held it,
 * that other Match holds a Board or is first in line for one.
 */
const expectMovedOffFirst = (
	tournament: Tournament,
	homePlayer: Player,
	homeBoard: BoardNumber,
	before: MatchOnBoard | undefined,
) => {
	const homeMatch = getMatchesOnBoards(tournament).find((m) => isPlaying(m, homePlayer));
	if (!before || isPlaying(before, homePlayer) || homeMatch?.board !== homeBoard) {
		return;
	}
	const movedOff = getMatchKey(before.match);
	const isSeated = getMatchesOnBoards(tournament).some((m) => getMatchKey(m.match) === movedOff);
	const [firstWaiting] = getWaitingForBoard(tournament);
	const isFirstInLine =
		firstWaiting !== undefined && getMatchKey(firstWaiting.match) === movedOff;
	expect(isSeated || isFirstInLine).toBe(true);
};

/*
 * 5 Players on 2 Boards, Started, the Home Board 2 for the Bye Player waiting for the first-Round Match's
 * winner. That Match takes Board 1, and the two other Bye Players, ready to play, wait for a Board.
 */
const startWithByePlayerHome = () =>
	startWithHomeBoard({ players: 5, boards: 2, homeBoard: 2 }, (drawn) => {
		// Without a Home Board, the Bye Player waiting for a winner waits for a Board too.
		const waitingForWinner = getWaitingForBoard(drawn).find((m) => !('name' in m.players[1]))!;
		return waitingForWinner.players[0];
	});

/*
 * A Tournament Started with one Player given a Home Board. The Draw doesn't depend on Home Boards, so the
 * Player is picked from the Draw made the same way without one: choosePlayer receives that Draw, Started.
 */
const startWithHomeBoard = (
	{
		players,
		boards,
		homeBoard,
		seed = 1,
	}: { players: number; boards: number; homeBoard: number; seed?: number },
	choosePlayer: (drawn: Tournament) => Player,
) => {
	const homePlayer = choosePlayer(startTournament({ players, boards, seed }));
	const registered = setUpTournament({ players, boards });
	const withHomeBoard = expectOk(setHomeBoard(registered, homePlayer.id, homeBoard));
	const random = createSeededRandom(seed);
	const drawn = expectOk(makeDraw(withHomeBoard, random));
	return { tournament: expectOk(start(drawn)), homePlayer };
};

describe('giving a Player a Home Board', () => {
	it('keeps the Board picked for that Player, any of them, and moves it when another is picked', () => {
		let tournament = setUpTournament({ players: 4, boards: 6 });
		const [ann] = tournament.players;

		tournament = expectOk(setHomeBoard(tournament, ann.id, 3));
		expect(tournament.homeBoards).toEqual([{ player: ann.id, board: 3 }]);

		tournament = expectOk(setHomeBoard(tournament, ann.id, 1));
		expect(tournament.homeBoards).toEqual([{ player: ann.id, board: 1 }]);

		tournament = expectOk(clearHomeBoard(tournament, ann.id));
		expect(tournament.homeBoards).toEqual([]);
	});

	it('refuses a Home Board before the Boards are set out, with only one Board, or for a Board not set out', () => {
		const noBoards = setUpTournament({ players: 4, boards: 0 });
		const [ann] = noBoards.players;
		expect(setHomeBoard(noBoards, ann.id, 1)).toEqual({
			ok: false,
			reason: 'Type how many Boards there are before giving a Player a Home Board.',
		});
		const oneBoard = setUpTournament({ players: 4, boards: 1 });
		expect(setHomeBoard(oneBoard, ann.id, 1)).toEqual({
			ok: false,
			reason: 'A Player can’t have a Home Board when there is only one Board.',
		});
		const sixBoards = setUpTournament({ players: 4, boards: 6 });
		expect(setHomeBoard(sixBoards, ann.id, 7)).toEqual({
			ok: false,
			reason: 'There is no Board 7.',
		});
	});

	it('refuses a second Player a Home Board while one Player has one', () => {
		let tournament = setUpTournament({ players: 4, boards: 6 });
		const [ann, bob] = tournament.players;
		tournament = expectOk(setHomeBoard(tournament, ann.id, 2));

		expect(setHomeBoard(tournament, bob.id, 4)).toEqual({
			ok: false,
			reason: 'Only one Player can have a Home Board: Player 1 has Board 2.',
		});
	});

	it('refuses to give or clear a Home Board once the Draw is made', () => {
		const registered = setUpTournament({ players: 4, boards: 6 });
		const [ann] = registered.players;
		const withHomeBoard = expectOk(setHomeBoard(registered, ann.id, 2));
		const drawn = expectOk(makeDraw(withHomeBoard, Math.random));
		const drawMadeRefusal = {
			ok: false,
			reason: 'A Home Board can’t change once the Draw is made.',
		};

		expect(setHomeBoard(drawn, ann.id, 3)).toEqual(drawMadeRefusal);
		expect(clearHomeBoard(drawn, ann.id)).toEqual(drawMadeRefusal);
	});

	it('refuses to give or clear a Home Board for a Player no longer registered', () => {
		const registered = setUpTournament({ players: 4, boards: 6 });
		const [, bob] = registered.players;
		const removed = expectOk(removePlayer(registered, bob.id));
		const notRegisteredRefusal = {
			ok: false,
			reason: 'That Player is no longer registered.',
		};

		expect(setHomeBoard(removed, bob.id, 3)).toEqual(notRegisteredRefusal);
		expect(clearHomeBoard(removed, bob.id)).toEqual(notRegisteredRefusal);
	});

	it('clears the Home Board when its Player is removed, or its Board is no longer set out', () => {
		const registered = setUpTournament({ players: 4, boards: 6 });
		const [ann, bob] = registered.players;
		const withHomeBoard = expectOk(setHomeBoard(registered, ann.id, 4));

		const otherRemoved = expectOk(removePlayer(withHomeBoard, bob.id));
		const homePlayerRemoved = expectOk(removePlayer(withHomeBoard, ann.id));
		const boardStillSetOut = expectOk(setBoardCount(withHomeBoard, '4'));
		const boardNoLongerSetOut = expectOk(setBoardCount(withHomeBoard, '3'));

		expect(otherRemoved.homeBoards).toHaveLength(1);
		expect(homePlayerRemoved.homeBoards).toEqual([]);
		expect(boardStillSetOut.homeBoards).toHaveLength(1);
		expect(boardNoLongerSetOut.homeBoards).toEqual([]);
		/*
		 * With one Board left, keeping it for one Player could leave their opponent's earlier Match with no
		 * Board to be played at.
		 */
		const onBoardOne = expectOk(setHomeBoard(registered, ann.id, 1));
		const oneBoardLeft = expectOk(setBoardCount(onBoardOne, '1'));
		expect(oneBoardLeft.homeBoards).toEqual([]);
	});
});

describe('a Home Board through the night', () => {
	it('seats its Player’s first Match there, and every other Match at the lowest-numbered other free Board', () => {
		// 8 Players on 4 Boards: four first-Round Matches.
		const { tournament, homePlayer } = startWithHomeBoard(
			{ players: 8, boards: 4, homeBoard: 2 },
			(drawn) => {
				const [, , , , playerInFourthMatch] = listPlayersInRound(drawn, 1);
				return playerInFourthMatch;
			},
		);

		expect(findMatchOf(tournament, homePlayer).board).toBe(2);
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1, 2, 3, 4]);
	});

	it('keeps it for a Bye Player waiting alone, their opponent coming to them', () => {
		// 5 Players on 4 Boards: one first-Round Match, whose winner the Bye Player waits for.
		const started = startWithHomeBoard({ players: 5, boards: 4, homeBoard: 4 }, (drawn) => {
			const waitingAlone = getMatchesOnBoards(drawn).find((m) => !hasBothPlayersKnown(m))!;
			return waitingAlone.players[0];
		});
		const { homePlayer } = started;
		let { tournament } = started;
		expect(listSeats(tournament)).toContainEqual([4, homePlayer.name, expect.any(String)]);
		const firstMatch = getMatchesOnBoards(tournament).find(
			(m) => m.match.round === 1 && hasBothPlayersKnown(m),
		)!;
		expect(firstMatch.board).not.toBe(4);
		const [winner] = firstMatch.players as [Player, Player];

		tournament = expectOk(recordWinner(tournament, firstMatch.match, winner.id, 'leaving'));

		expect(findMatchOf(tournament, homePlayer)).toMatchObject({
			board: 4,
			players: [winner, homePlayer],
		});
	});

	it('brings an opponent already waiting alone at another Board to the Home Board, freeing theirs', () => {
		/*
		 * 8 Players on 4 Boards, the Home Board 4: the first Match in the bracket takes it, and the second
		 * Match, whose winner meets the first's, takes Board 1.
		 */
		const started = startWithHomeBoard({ players: 8, boards: 4, homeBoard: 4 }, (drawn) => {
			const firstInBracket = getMatchesOnBoards(drawn).find((m) => m.match.place === 0)!;
			return firstInBracket.players[0];
		});
		const { homePlayer } = started;
		let { tournament } = started;
		const homeMatch = findMatchOf(tournament, homePlayer);
		const neighbour = getMatchesOnBoards(tournament).find((m) => m.match.place === 1)!;
		expect(neighbour.board).toBe(1);
		const opponent = neighbour.players[0];
		tournament = expectOk(recordWinner(tournament, neighbour.match, opponent.id, 'leaving'));
		expect(findMatchOf(tournament, opponent).board).toBe(1);

		tournament = expectOk(recordWinner(tournament, homeMatch.match, homePlayer.id, 'leaving'));

		expect(findMatchOf(tournament, homePlayer)).toMatchObject({
			board: 4,
			players: [homePlayer, opponent],
		});
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([2, 3, 4]);
	});

	it('lists its Player’s Match there once, however many results are recorded around it', () => {
		const started = startWithByePlayerHome();
		let { tournament } = started;
		const firstMatch = getMatchesOnBoards(tournament).find(hasBothPlayersKnown)!;
		const [winner] = firstMatch.players as [Player, Player];

		tournament = expectOk(recordWinner(tournament, firstMatch.match, winner.id, 'leaving'));

		const onHomeBoard = getMatchesOnBoards(tournament).filter((m) => m.board === 2);
		expect(onHomeBoard).toHaveLength(1);
	});

	it('keeps it while its Player waits alone, though a Match ready to play waits for a Board', () => {
		const started = startWithByePlayerHome();
		const { homePlayer } = started;
		let { tournament } = started;
		const firstMatch = getMatchesOnBoards(tournament).find(hasBothPlayersKnown)!;
		const [winner, loser] = firstMatch.players as [Player, Player];
		expect(listSeats(tournament)).toEqual([
			[1, winner.name, loser.name],
			[2, homePlayer.name, `Winner of ${winner.name} / ${loser.name}`],
		]);
		const byePair = getWaitingForBoard(tournament).find((m) =>
			m.players.every((p) => 'name' in p),
		)!;
		const [byePlayer] = byePair.players as [Player, Player];

		tournament = expectOk(recordWinner(tournament, firstMatch.match, winner.id, 'leaving'));

		expect(findMatchOf(tournament, homePlayer)).toMatchObject({
			board: 2,
			players: [winner, homePlayer],
		});
		expect(findMatchOf(tournament, byePlayer).board).toBe(1);
	});

	it('goes back to ordinary use once its Player is out, and comes back to them on undo', () => {
		const { tournament, homePlayer, homeMatch } = playToHomePlayersFirstMatch();
		const opponent = findOpponentIn(homeMatch, homePlayer);

		const knockedOut = expectOk(
			recordWinner(tournament, homeMatch.match, opponent.id, 'leaving'),
		);

		// Board 2 is free for anyone now: the winner waits there for their opponent in the final.
		expect(findMatchOf(knockedOut, opponent).board).toBe(2);
		const undone = expectOk(undoResult(knockedOut, homeMatch.match));
		expect(findMatchOf(undone, homePlayer).board).toBe(2);
		// Kept for its Player again, so the winner waits for a Board instead of taking it.
		const lostAgain = expectOk(recordWinner(undone, homeMatch.match, opponent.id, 'staying'));
		expect(listWaiting(lostAgain)).toEqual([
			[opponent.name, expect.stringMatching(/^Winner of /)],
		]);
	});

	it.each([
		{ field: 3, boards: 2 },
		{ field: 7, boards: 2 },
		{ field: 12, boards: 2 },
		{ field: 21, boards: 3 },
		{ field: 26, boards: 12 },
		{ field: 32, boards: 5 },
	])(
		'keeps its Player there through $field Players on $boards Boards, always with a Match to play, undoing every third result',
		({ field, boards }) => {
			// The Home Board is the highest-numbered, for the first Player registered.
			const started = startWithHomeBoard(
				{ players: field, boards, homeBoard: boards, seed: field },
				(drawn) => drawn.players[0],
			);
			const { homePlayer } = started;
			let { tournament } = started;
			for (let recorded = 1; tournament.phase !== 'finished'; recorded++) {
				const matchesOnBoards = getMatchesOnBoards(tournament);
				const homeMatch = matchesOnBoards.find((m) => isPlaying(m, homePlayer));
				if (homeMatch) {
					expect(homeMatch.board).toBe(boards);
				}
				const isHomeWaiting = getWaitingForBoard(tournament).some((m) =>
					m.players.some((p) => 'id' in p && p.id === homePlayer.id),
				);
				expect(isHomeWaiting).toBe(false);
				const onHomeBoard = matchesOnBoards.find((m) => m.board === boards);
				if (onHomeBoard && !isPlaying(onHomeBoard, homePlayer)) {
					expect(hasLostIn(tournament, 'winners', homePlayer.id)).toBe(true);
				}
				const ready = matchesOnBoards.find(hasBothPlayersKnown);
				expect(ready).toBeDefined();
				const [winner, loser] = ready!.players as [Player, Player];
				const isOpen = isLosersBracketOpenTo(tournament, loser.id);
				const answer = isOpen ? (recorded % 2 === 0 ? 'staying' : 'leaving') : undefined;
				tournament = expectOk(recordWinner(tournament, ready!.match, winner.id, answer));
				const undone = undoResult(tournament, ready!.match);
				if (recorded % 3 === 0 && undone.ok) {
					const before = getMatchesOnBoards(tournament).find((m) => m.board === boards);
					tournament = expectOk(undone);
					expectMovedOffFirst(tournament, homePlayer, boards, before);
				}
			}
			expect(getBracketPicture(tournament, 'winners')!.champion).toBeDefined();
		},
	);

	it('goes back to ordinary use once its Player loses a later Match, though their first opponent stayed', () => {
		/*
		 * 5 Players on 2 Boards, the Home Board 2 for a Player in the first-Round Match. The two other Bye
		 * Players take Board 1, and the Bye Player waiting for the first-Round Match's winner waits for a Board.
		 */
		const started = startWithHomeBoard({ players: 5, boards: 2, homeBoard: 2 }, (drawn) => {
			const [firstMatch] = getMatchesOnBoards(drawn).filter(
				(m) => m.match.round === 1 && hasBothPlayersKnown(m),
			);
			return firstMatch.players[0];
		});
		const { homePlayer } = started;
		let { tournament } = started;
		const firstMatch = findMatchOf(tournament, homePlayer);
		expect(firstMatch.board).toBe(2);
		const firstOpponent = findOpponentIn(firstMatch, homePlayer);
		tournament = expectOk(recordWinner(tournament, firstMatch.match, homePlayer.id, 'staying'));
		const secondMatch = findMatchOf(tournament, homePlayer);
		const byePlayer = findOpponentIn(secondMatch, homePlayer);
		expect(byePlayer).not.toEqual(firstOpponent);

		tournament = expectOk(recordWinner(tournament, secondMatch.match, byePlayer.id, 'leaving'));

		// Board 2 is free for anyone now: the winner waits there for their opponent in the final.
		expect(findMatchOf(tournament, byePlayer).board).toBe(2);
	});

	it('holds through the Losers Bracket for a Player staying for it, sitting empty until the Losers Draw', () => {
		const homeFirstMatch = playToHomePlayersFirstMatch();
		const { homePlayer, homeMatch } = homeFirstMatch;
		const opponent = findOpponentIn(homeMatch, homePlayer);
		let tournament = expectOk(
			recordWinner(homeFirstMatch.tournament, homeMatch.match, opponent.id, 'staying'),
		);
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1]);
		const byePair = getMatchesOnBoards(tournament).find(hasBothPlayersKnown)!;
		const [byeWinner] = byePair.players as [Player, Player];

		// The Bye pair's loser stays too, so the Losers Draw is made: a final against the Home Board Player.
		tournament = expectOk(recordWinner(tournament, byePair.match, byeWinner.id, 'staying'));

		const losersFinal = findMatchOf(tournament, homePlayer);
		expect(losersFinal.match.bracket).toBe('losers');
		expect(losersFinal.board).toBe(2);
	});
});

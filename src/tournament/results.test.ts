import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getMatchesOnBoards,
	getUndoableResults,
	hasLostIn,
	recordForfeit,
	recordWinner,
	start,
	undoResult,
	type Player,
} from './index';
import {
	expectOk,
	isPlaying,
	isReadyToPlay,
	makeSeededDraw,
	recordWin,
	startTournament,
} from './testSetup';
import { getPlayerName } from '../wording';

describe('recording winners', () => {
	it('crowns the winner of a two-Player final as champion, freeing their Board', () => {
		const tournament = startTournament(2, 1);
		const [final] = getMatchesOnBoards(tournament);
		const [a] = final.players as [Player, Player];

		const after = expectOk(recordWinner(tournament, final.match, a.id, 'leaving'));

		expect(getBracketPicture(after, 'winners')!.champion).toEqual(a);
		expect(getMatchesOnBoards(after)).toEqual([]);
	});

	it('finishes the Tournament once the final has a winner, and refuses any more winners or a Start', () => {
		const tournament = startTournament(3, 2);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [a] = firstMatch.players as [Player, Player];
		const afterFirst = expectOk(recordWinner(tournament, firstMatch.match, a.id, 'leaving'));
		expect(afterFirst.phase).toBe('inProgress');

		const finished = expectOk(recordWinner(afterFirst, waiting.match, a.id, 'leaving'));

		expect(finished.phase).toBe('finished');
		expect(getBracketPicture(finished, 'winners')!.champion).toEqual(a);
		expect(recordWinner(finished, waiting.match, a.id)).toEqual({
			ok: false,
			reason: 'The Tournament is finished.',
		});
		expect(start(finished)).toEqual({
			ok: false,
			reason: 'The Tournament has already started.',
		});
	});

	it('plays a Tournament with Byes through to a champion, seating each winner at a Board as soon as they win', () => {
		/*
		 * 5 Players: Ann and Bob play the one first-Round Match on Board 1. Cat has a Bye and waits at
		 * Board 2 for its winner; Dan and Eve, the other Bye Players, meet in Round 2 on Board 3.
		 */
		let tournament = startTournament(5, 4);
		const listSeats = () =>
			getMatchesOnBoards(tournament).map(({ board, players: [a, b] }) => [
				board,
				a.name,
				getPlayerName(b),
			]);
		const findMatchOn = (board: number) =>
			getMatchesOnBoards(tournament).find((m) => m.board === board)!;
		const [ann, bob] = findMatchOn(1).players as [Player, Player];
		const cat = findMatchOn(2).players[0];
		const dan = findMatchOn(3).players[0];

		tournament = recordWin(tournament, findMatchOn(3), 'leaving', dan);
		/*
		 * Board 3 frees and is the lowest free, so Dan waits there in the final for Board 2's winner, whose
		 * Match is still waiting on a Player.
		 */
		expect(listSeats()).toEqual([
			[1, ann.name, bob.name],
			[2, cat.name, `Winner of ${ann.name} / ${bob.name}`],
			[3, dan.name, 'Opponent to come'],
		]);

		tournament = recordWin(tournament, findMatchOn(1), 'leaving', ann);
		// Ann joins Cat at Board 2, and Board 1 frees. Once both are known, they're named in bracket order.
		expect(listSeats()).toEqual([
			[2, ann.name, cat.name],
			[3, dan.name, `Winner of ${ann.name} / ${cat.name}`],
		]);

		tournament = recordWin(tournament, findMatchOn(2), 'leaving', ann);
		// Ann joins Dan at Board 3 for the final, and Board 2 frees.
		expect(listSeats()).toEqual([[3, ann.name, dan.name]]);
		expect(getBracketPicture(tournament, 'winners')!.champion).toBeUndefined();

		tournament = recordWin(tournament, findMatchOn(3), 'leaving', dan);
		expect(listSeats()).toEqual([]);
		expect(getBracketPicture(tournament, 'winners')!.champion).toEqual(dan);
	});

	it('seats a winner at the lowest-numbered free Board to wait for their opponent, who comes to them', () => {
		// 8 Players: four first-Round Matches on Boards 1 to 4.
		let tournament = startTournament(8, 4);
		const listSeats = () =>
			getMatchesOnBoards(tournament).map(({ board, players: [a, b] }) => [
				board,
				a.name,
				getPlayerName(b),
			]);
		const findMatchOn = (board: number) =>
			getMatchesOnBoards(tournament).find((m) => m.board === board)!;
		const getNameAt = (board: number, side: number) =>
			(findMatchOn(board).players[side] as Player).name;
		const [a1, a2, a3, a4] = [1, 2, 3, 4].map((board) => getNameAt(board, 0));

		tournament = recordWin(tournament, findMatchOn(4), 'leaving');
		// Board 4 frees, and is the lowest free, so its winner waits there for Board 3's winner.
		expect(listSeats()).toEqual([
			[1, a1, getNameAt(1, 1)],
			[2, a2, getNameAt(2, 1)],
			[3, a3, getNameAt(3, 1)],
			[4, a4, `Winner of ${a3} / ${getNameAt(3, 1)}`],
		]);

		tournament = recordWin(tournament, findMatchOn(3), 'leaving');
		// Board 3's winner goes to Board 4, and Board 3 frees.
		expect(listSeats().map(([board]) => board)).toEqual([1, 2, 4]);
		expect(findMatchOn(4).players.map((p) => getPlayerName(p))).toEqual([a3, a4]);

		tournament = recordWin(tournament, findMatchOn(4), 'leaving');
		/*
		 * The winner waits in the final at Board 3, the lowest free: their opponent will be the winner of
		 * a Match that hasn't started yet.
		 */
		expect(listSeats()).toEqual([
			[1, a1, getNameAt(1, 1)],
			[2, a2, getNameAt(2, 1)],
			[3, a3, 'Opponent to come'],
		]);

		tournament = recordWin(tournament, findMatchOn(1), 'leaving');
		expect(listSeats()).toEqual([
			[1, a1, `Winner of ${a2} / ${getNameAt(2, 1)}`],
			[2, a2, getNameAt(2, 1)],
			[3, a3, 'Opponent to come'],
		]);
	});

	it.each([2, 3, 7, 12, 21, 26, 32])(
		'plays %i Players to a champion, never seating two Matches at one Board',
		(field) => {
			const boards = Math.ceil(field / 2);
			let tournament = startTournament(field, boards, field);
			let played = 0;
			for (;;) {
				const matches = getMatchesOnBoards(tournament);
				const seats = matches.map((m) => m.board);
				expect(new Set(seats).size).toBe(seats.length);
				expect(seats.every((b) => b >= 1 && b <= boards)).toBe(true);
				const ready = matches.find(isReadyToPlay);
				if (!ready) {
					break;
				}
				// The second-named Player wins, so a Player who waited isn't always the one who goes through.
				const winner = ready.players[1] as Player;
				tournament = expectOk(recordWinner(tournament, ready.match, winner.id, 'leaving'));
				played++;
			}
			// Every Match knocks one Player out, until one is left: the champion.
			expect(played).toBe(field - 1);
			expect(getBracketPicture(tournament, 'winners')!.champion).toBeDefined();
		},
	);

	it('refuses a winner before Start, twice for one Match, from outside the Match, or before both Players are known', () => {
		const drawn = expectOk(makeSeededDraw(3, 2));
		const [firstMatch, waiting] = getMatchesOnBoards(drawn);
		const [a, b] = firstMatch.players as [Player, Player];
		expect(recordWinner(drawn, firstMatch.match, a.id)).toEqual({
			ok: false,
			reason: 'Press Start before recording a winner.',
		});

		const tournament = expectOk(start(drawn));
		expect(recordWinner(tournament, waiting.match, waiting.players[0].id)).toEqual({
			ok: false,
			reason: 'That Match is still waiting for a Player.',
		});
		expect(recordWinner(tournament, firstMatch.match, waiting.players[0].id)).toEqual({
			ok: false,
			reason: 'That Player isn’t in that Match.',
		});
		const recorded = expectOk(recordWinner(tournament, firstMatch.match, a.id, 'leaving'));
		expect(recordWinner(recorded, firstMatch.match, b.id)).toEqual({
			ok: false,
			reason: 'That Match already has a winner.',
		});
	});
});

describe('Forfeits', () => {
	it('lets the opponent of a Player who leaves win, advancing them as any winner does', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];

		tournament = expectOk(recordForfeit(tournament, firstMatch.match, bob.id, 'leaving'));

		expect(getBracketPicture(tournament, 'winners')!.rounds[0][0]).toMatchObject({
			winner: ann,
		});
		expect(getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann))).toMatchObject({
			board: 2,
			players: [ann, cat],
		});
		expect(hasLostIn(tournament, 'winners', bob.id)).toBe(true);
	});

	it('refuses a Forfeit by a Player outside the Match, or in a Match still waiting for a Player', () => {
		const tournament = startTournament(3, 2);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const bye = waiting.players[0];

		expect(recordForfeit(tournament, firstMatch.match, bye.id)).toEqual({
			ok: false,
			reason: 'That Player isn’t in that Match.',
		});
		expect(recordForfeit(tournament, waiting.match, bye.id)).toEqual({
			ok: false,
			reason: 'That Match is still waiting for a Player.',
		});
	});
});

describe('undoing a result', () => {
	it('re-opens the Match at its own Board, freeing the Board its winner waited at alone', () => {
		// 8 Players: four first-Round Matches on Boards 1 to 4.
		let tournament = startTournament(8, 4);
		const drawn = getMatchesOnBoards(tournament);
		const two = drawn.find((m) => m.board === 2)!;
		const [winner] = two.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, two.match, winner.id, 'leaving'));
		// Board 2 frees, and Board 2 is the lowest free, so its winner waits there for Board 1's winner.
		expect(getMatchesOnBoards(tournament).find((m) => m.board === 2)!.players).toEqual([
			winner,
			{ winnerOf: drawn.find((m) => m.board === 1)!.players },
		]);

		tournament = expectOk(undoResult(tournament, two.match));

		expect(getMatchesOnBoards(tournament)).toEqual(drawn);
		expect(getBracketPicture(tournament, 'winners')!.rounds[0][1]!.winner).toBeUndefined();
	});

	it('keeps the next Match’s Board for an opponent already waiting there, and lets the other Player be recorded instead', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner.
		let tournament = startTournament(5, 4);
		const drawn = getMatchesOnBoards(tournament);
		const [firstMatch, waiting] = drawn;
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];
		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'leaving'));

		tournament = expectOk(undoResult(tournament, firstMatch.match));

		expect(getMatchesOnBoards(tournament)).toEqual(drawn);
		tournament = expectOk(recordWinner(tournament, firstMatch.match, bob.id, 'leaving'));
		expect(getMatchesOnBoards(tournament).find((m) => isPlaying(m, cat))).toMatchObject({
			board: 2,
			players: [bob, cat],
		});
		expect(getBracketPicture(tournament, 'winners')!.rounds[0][0]).toMatchObject({
			winner: bob,
		});
		expect(hasLostIn(tournament, 'winners', ann.id)).toBe(true);
		expect(hasLostIn(tournament, 'winners', bob.id)).toBe(false);
	});

	it('returns the Match to its own Board when it is free, even if a lower-numbered one is too', () => {
		// 8 Players: four first-Round Matches on Boards 1 to 4.
		let tournament = startTournament(8, 4);
		const findMatchOn = (board: number) =>
			getMatchesOnBoards(tournament).find((m) => m.board === board)!;
		const three = findMatchOn(3);
		// Boards 1 and 4's winners wait at their own Boards, and Boards 2 and 3's winners join them.
		for (const board of [1, 4, 2, 3]) {
			tournament = recordWin(tournament, findMatchOn(board), 'leaving');
		}
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1, 4]);

		tournament = expectOk(undoResult(tournament, three.match));

		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1, 3, 4]);
		expect(findMatchOn(3).players).toEqual(three.players);
	});

	it('gives the Match the lowest-numbered free Board once its own Board is taken', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner, Dan and Eve play on Board 3.
		let tournament = startTournament(5, 4);
		const [firstMatch, , byes] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const [dan] = byes.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'leaving'));
		// Boards 1 and 3 are free, so Dan waits in the final at Board 1.
		tournament = expectOk(recordWinner(tournament, byes.match, dan.id, 'leaving'));
		expect(getMatchesOnBoards(tournament).find((m) => isPlaying(m, dan))!.board).toBe(1);

		tournament = expectOk(undoResult(tournament, firstMatch.match));

		expect(getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, bob))!.board).toBe(3);
	});

	it('refuses to undo a result once its winner has played their next Match, or a Match with no result', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [ann] = firstMatch.players as [Player, Player];
		expect(undoResult(tournament, firstMatch.match)).toEqual({
			ok: false,
			reason: 'That Match has no result to undo.',
		});
		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'leaving'));
		tournament = expectOk(recordWinner(tournament, waiting.match, ann.id, 'leaving'));

		expect(undoResult(tournament, firstMatch.match)).toEqual({
			ok: false,
			reason: 'That result can’t be undone: its winner has already played their next Match.',
		});
		expect(undoResult(tournament, waiting.match).ok).toBe(true);
	});

	it('takes the champion back out when the final’s result is undone, so the final can be won again', () => {
		const started = startTournament(2, 1);
		const [final] = getMatchesOnBoards(started);
		const [a, b] = final.players as [Player, Player];
		let tournament = expectOk(recordWinner(started, final.match, a.id, 'leaving'));
		expect(tournament.phase).toBe('finished');

		tournament = expectOk(undoResult(tournament, final.match));

		expect(tournament.phase).toBe('inProgress');
		expect(getBracketPicture(tournament, 'winners')!.champion).toBeUndefined();
		expect(getMatchesOnBoards(tournament)).toEqual([final]);
		tournament = expectOk(recordWinner(tournament, final.match, b.id, 'leaving'));
		expect(getBracketPicture(tournament, 'winners')!.champion).toEqual(b);
	});

	it('lists the results that can still be undone, latest first, with how each was decided', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner, Dan and Eve play on Board 3.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting, byes] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];
		const [dan, eve] = byes.players as [Player, Player];
		expect(getUndoableResults(tournament)).toEqual([]);

		tournament = expectOk(recordForfeit(tournament, firstMatch.match, bob.id, 'leaving'));
		tournament = expectOk(recordWinner(tournament, byes.match, eve.id, 'leaving'));

		expect(getUndoableResults(tournament)).toEqual([
			{ match: byes.match, board: 3, winner: eve, loser: dan, isForfeit: false },
			{ match: firstMatch.match, board: 1, winner: ann, loser: bob, isForfeit: true },
		]);

		tournament = expectOk(recordWinner(tournament, waiting.match, cat.id, 'leaving'));

		// Ann has played her next Match, so her Forfeit win can no longer be undone.
		expect(getUndoableResults(tournament)).toEqual([
			{ match: waiting.match, board: 2, winner: cat, loser: ann, isForfeit: false },
			{ match: byes.match, board: 3, winner: eve, loser: dan, isForfeit: false },
		]);
	});
});

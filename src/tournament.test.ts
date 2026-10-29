import { describe, expect, it } from 'vitest';
import {
	makeDraw,
	getMatchesOnBoards,
	createTournament,
	recordForfeit,
	recordWinner,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	start,
	getBracketPicture,
	hasLostIn,
	getNowPlaying,
	setScreenSeconds,
	undoResult,
	getUndoableResults,
	isLosersBracketOpenTo,
	getWaitingForBoard,
	type MatchOnBoard,
	type Player,
	type StayingAnswer,
	type Tournament,
	type WinnerOf,
} from './tournament';
import type { Result } from './result';
import { getPlayerName } from './wording';

describe('registering Players', () => {
	it('lists registered Players by the name the room knows them by, with a running count', () => {
		let tournament = createTournament();
		tournament = expectOk(registerPlayer(tournament, 'Dave K.'));
		tournament = expectOk(registerPlayer(tournament, 'Big Dave'));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.', 'Big Dave']);
		expect(tournament.players.length).toBe(2);
	});

	it('rejects a name identical to an existing Player, with a reason, and leaves the list unchanged', () => {
		const tournament = registerPlayers('Big Dave');

		const outcome = registerPlayer(tournament, 'Big Dave');

		expect(outcome).toEqual({
			ok: false,
			reason: 'There is already a Player called "Big Dave".',
		});
		expect(tournament.players.length).toBe(1);
	});

	it('ignores stray spaces around a name, so a padded duplicate is still rejected', () => {
		let tournament = createTournament();
		tournament = expectOk(registerPlayer(tournament, '  Dave K. '));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.']);
		expect(registerPlayer(tournament, 'Dave K.  ').ok).toBe(false);
	});

	it('rejects a blank name', () => {
		const tournament = createTournament();

		expect(registerPlayer(tournament, '   ')).toEqual({
			ok: false,
			reason: 'Type the Player’s name.',
		});
	});
});

describe('correcting Players before the Draw', () => {
	it('renames a Player, keeping their place in the list', () => {
		let tournament = registerPlayers('Dave K', 'Big Dave');
		const daveK = tournament.players[0];

		tournament = expectOk(renamePlayer(tournament, daveK.id, 'Dave K.'));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.', 'Big Dave']);
	});

	it('refuses to rename a Player to another Player’s name', () => {
		const tournament = registerPlayers('Dave K.', 'Big Dave');
		const daveK = tournament.players[0];

		expect(renamePlayer(tournament, daveK.id, ' Big Dave')).toEqual({
			ok: false,
			reason: 'There is already a Player called "Big Dave".',
		});
		expect(renamePlayer(tournament, daveK.id, '')).toEqual({
			ok: false,
			reason: 'Type the Player’s name.',
		});
	});

	it('lets a Player keep their own name when renamed', () => {
		const tournament = registerPlayers('Dave K.');
		const daveK = tournament.players[0];

		expect(renamePlayer(tournament, daveK.id, 'Dave K. ').ok).toBe(true);
	});

	it('removes a Player who changed their mind, freeing their name', () => {
		let tournament = registerPlayers('Dave K.', 'Big Dave');
		const daveK = tournament.players[0];

		tournament = expectOk(removePlayer(tournament, daveK.id));

		expect(tournament.players.map((p) => p.name)).toEqual(['Big Dave']);
		expect(tournament.players.length).toBe(1);
		expect(registerPlayer(tournament, 'Dave K.').ok).toBe(true);
	});

	it('refuses to rename or remove a Player who is no longer registered', () => {
		let tournament = registerPlayers('Dave K.');
		const daveK = tournament.players[0];
		tournament = expectOk(removePlayer(tournament, daveK.id));

		const refused = {
			ok: false,
			reason: 'That Player is no longer registered.',
		};
		expect(removePlayer(tournament, daveK.id)).toEqual(refused);
		expect(renamePlayer(tournament, daveK.id, 'Dave K.')).toEqual(refused);
	});
});

describe('setting out Boards', () => {
	it('numbers tonight’s Boards from 1 up to how many there are, as their placards are', () => {
		let tournament = createTournament();
		tournament = expectOk(setBoardCount(tournament, ' 12 '));
		expect(tournament.boards).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

		tournament = expectOk(setBoardCount(tournament, '3'));
		expect(tournament.boards).toEqual([1, 2, 3]);
	});

	it('refuses a blank, or anything but a whole number above zero', () => {
		const tournament = createTournament();

		expect(setBoardCount(tournament, '  ')).toEqual({
			ok: false,
			reason: 'Type how many Boards there are.',
		});
		for (const typed of ['seven', '2.5', '0', '-3']) {
			expect(setBoardCount(tournament, typed)).toEqual({
				ok: false,
				reason: 'The number of Boards is a whole number above zero, like 12.',
			});
		}
	});
});

describe('timing the TV screens', () => {
	it('shows each TV screen for 20 seconds unless the Organizer changes it, even once Started', () => {
		expect(createTournament().screenSeconds).toBe(20);

		const started = startTournament(5, 4);
		const changed = expectOk(setScreenSeconds(started, ' 45 '));

		expect(changed.screenSeconds).toBe(45);
	});

	it('refuses a blank, or anything but a whole number above zero', () => {
		const tournament = createTournament();

		expect(setScreenSeconds(tournament, ' ')).toEqual({
			ok: false,
			reason: 'Type how many seconds the TV shows each screen.',
		});
		for (const typed of ['0', '-5', '2.5', 'ten']) {
			expect(setScreenSeconds(tournament, typed)).toEqual({
				ok: false,
				reason: 'The TV shows each screen for a whole number of seconds above zero, like 20.',
			});
		}
	});
});

describe('making the Draw', () => {
	/*
	 * The bracket is the next power of two at or above the field, so 20 Players make 4 first-Round
	 * Matches and 12 Byes. The Bye Players meet each other in Round 2, so all 20 play from the Start; with
	 * an odd field one Player sits at a Board of their own, waiting for a first-Round Match's winner.
	 */
	it.each([
		{ field: 2, boards: 1, waiting: 0 },
		{ field: 3, boards: 2, waiting: 1 },
		{ field: 5, boards: 3, waiting: 1 },
		{ field: 8, boards: 4, waiting: 0 },
		{ field: 20, boards: 10, waiting: 0 },
		{ field: 21, boards: 11, waiting: 1 },
		{ field: 26, boards: 13, waiting: 0 },
		{ field: 30, boards: 15, waiting: 0 },
	])(
		'seats $field Players at $boards Boards, $waiting waiting for a winner, each Player once',
		({ field, boards, waiting }) => {
			const tournament = expectOk(makeSeededDraw(field, 16, field));

			const matches = getMatchesOnBoards(tournament);
			expect(matches.length).toBe(boards);
			const seated = matches.flatMap((m) => m.players);
			const [players, winners] = [
				seated.filter((p): p is Player => 'name' in p),
				seated.filter((p): p is WinnerOf => !('name' in p)),
			];
			expect(winners.length).toBe(waiting);
			expect(players.map((p) => p.name).sort()).toEqual(
				tournament.players.map((p) => p.name).sort(),
			);
			for (const { winnerOfBoard } of winners) {
				const awaited = matches.find((m) => m.board === winnerOfBoard)!;
				expect(awaited.players.every((p) => 'name' in p)).toBe(true);
			}
		},
	);

	it('seats a Bye Player at their own Board, waiting for the winner of a first-Round Match', () => {
		const tournament = expectOk(makeSeededDraw(3, 4));

		const [match, waiting] = getMatchesOnBoards(tournament);
		const [a, b] = match.players as [Player, Player];
		const [bye] = tournament.players.filter((p) => p !== a && p !== b);
		expect(match.board).toBe(1);
		expect(waiting).toMatchObject({ board: 2, players: [bye, { winnerOfBoard: 1 }] });
	});

	it('makes the same Draw every time from the same seeded random source, and a different one from another', () => {
		const drawWith = (seed: number) => {
			const drawn = expectOk(makeSeededDraw(26, 16, seed));
			return getMatchesOnBoards(drawn);
		};

		expect(drawWith(42)).toEqual(drawWith(42));
		expect(drawWith(42)).not.toEqual(drawWith(43));
	});

	it('puts each Match it seats on the lowest-numbered free Board', () => {
		// 6 Players: two first-Round Matches, and the two Bye Players meet in Round 2.
		const drawn = expectOk(makeSeededDraw(6, 5));
		const matches = getMatchesOnBoards(drawn);

		expect(matches.map((m) => m.board)).toEqual([1, 2, 3]);
	});

	it('refuses the Draw with fewer than two Players', () => {
		expect(makeSeededDraw(1, 4)).toEqual({
			ok: false,
			reason: 'The Draw needs at least two Players.',
		});
	});

	it('refuses the Draw until there is a Board for every Player to sit at', () => {
		// 26 Players: 13 Matches, 10 in the first Round and 3 between Bye Players in Round 2.
		expect(makeSeededDraw(26, 12)).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 13 Boards, and there are only 12.',
		});
		// 21 Players: 10 Matches, and a Board for the Bye Player waiting for a winner.
		expect(makeSeededDraw(21, 10)).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 11 Boards, and there are only 10.',
		});
		expect(makeSeededDraw(2, 0)).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 1 Board, and there are none.',
		});
		expect(makeSeededDraw(26, 13).ok).toBe(true);
		expect(makeSeededDraw(21, 11).ok).toBe(true);
	});

	it('closes registration: a late arrival is refused, and the drawn Players can’t be renamed or removed', () => {
		const tournament = expectOk(makeSeededDraw(5, 4));
		const player1 = tournament.players[0];

		expect(registerPlayer(tournament, 'Late Larry')).toEqual({
			ok: false,
			reason: 'Registration closed when the Draw was made.',
		});
		const drawn = {
			ok: false,
			reason: 'Players can’t be renamed or removed once the Draw is made.',
		};
		expect(renamePlayer(tournament, player1.id, 'Player One')).toEqual(drawn);
		expect(removePlayer(tournament, player1.id)).toEqual(drawn);
	});

	it('refuses to change the number of Boards once the Draw is made', () => {
		const tournament = expectOk(makeSeededDraw(5, 4));

		expect(setBoardCount(tournament, '6')).toEqual({
			ok: false,
			reason: 'The number of Boards can’t change once the Draw is made.',
		});
	});

	it('refuses a second Draw', () => {
		const tournament = expectOk(makeSeededDraw(5, 4));

		const random = createSeededRandom(2);

		expect(makeDraw(tournament, random)).toEqual({
			ok: false,
			reason: 'The Draw has already been made.',
		});
	});
});

describe('starting the Tournament', () => {
	it('moves the Tournament from Tonight’s Draw screen to in progress', () => {
		let tournament = expectOk(makeSeededDraw(5, 4));
		expect(tournament.phase).toBe('drawShown');

		tournament = expectOk(start(tournament));

		expect(tournament.phase).toBe('inProgress');
	});

	it('refuses to Start before the Draw, or a second time', () => {
		const registered = setUpTournament(5, 4);
		expect(start(registered)).toEqual({
			ok: false,
			reason: 'Make the Draw before starting.',
		});
		const drawn = expectOk(makeSeededDraw(5, 4));
		const started = expectOk(start(drawn));
		expect(start(started)).toEqual({
			ok: false,
			reason: 'The Tournament has already started.',
		});
	});
});

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
		const recordWin = (board: number, winner: Player) => {
			const { match } = findMatchOn(board);
			tournament = expectOk(recordWinner(tournament, match, winner.id, 'leaving'));
		};

		recordWin(3, dan);
		// Board 3 frees and is the lowest free, so Dan waits there in the final for Board 2's winner.
		expect(listSeats()).toEqual([
			[1, ann.name, bob.name],
			[2, cat.name, 'Winner of Board 1'],
			[3, dan.name, 'Winner of Board 2'],
		]);

		recordWin(1, ann);
		// Ann joins Cat at Board 2, and Board 1 frees. Once both are known, they're named in bracket order.
		expect(listSeats()).toEqual([
			[2, ann.name, cat.name],
			[3, dan.name, 'Winner of Board 2'],
		]);

		recordWin(2, ann);
		// Ann joins Dan at Board 3 for the final, and Board 2 frees.
		expect(listSeats()).toEqual([[3, ann.name, dan.name]]);
		expect(getBracketPicture(tournament, 'winners')!.champion).toBeUndefined();

		recordWin(3, dan);
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
		const recordFirstPlayerWin = (board: number) => {
			const { match, players } = findMatchOn(board);
			tournament = expectOk(
				recordWinner(tournament, match, (players[0] as Player).id, 'leaving'),
			);
		};
		const [a1, a2, a3, a4] = [1, 2, 3, 4].map((board) => getNameAt(board, 0));

		recordFirstPlayerWin(4);
		// Board 4 frees, and is the lowest free, so its winner waits there for Board 3's winner.
		expect(listSeats()).toEqual([
			[1, a1, getNameAt(1, 1)],
			[2, a2, getNameAt(2, 1)],
			[3, a3, getNameAt(3, 1)],
			[4, a4, 'Winner of Board 3'],
		]);

		recordFirstPlayerWin(3);
		// Board 3's winner goes to Board 4, and Board 3 frees.
		expect(listSeats().map(([board]) => board)).toEqual([1, 2, 4]);
		expect(findMatchOn(4).players.map((p) => getPlayerName(p))).toEqual([a3, a4]);

		recordFirstPlayerWin(4);
		/*
		 * The winner waits in the final at Board 3, the lowest free: their opponent will be the winner of
		 * a Match that hasn't started yet.
		 */
		expect(listSeats()).toEqual([
			[1, a1, getNameAt(1, 1)],
			[2, a2, getNameAt(2, 1)],
			[3, a3, 'Opponent to come'],
		]);

		recordFirstPlayerWin(1);
		expect(listSeats()).toEqual([
			[1, a1, 'Winner of Board 2'],
			[2, a2, getNameAt(2, 1)],
			[3, a3, 'Winner of Board 1'],
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
				const ready = matches.find((m) => m.players.every((p) => 'name' in p));
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
			{ winnerOfBoard: 1 },
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
		const recordFirstPlayerWin = (board: number) => {
			const { match, players } = findMatchOn(board);
			tournament = expectOk(
				recordWinner(tournament, match, (players[0] as Player).id, 'leaving'),
			);
		};
		const three = findMatchOn(3);
		// Boards 1 and 4's winners wait at their own Boards, and Boards 2 and 3's winners join them.
		for (const board of [1, 4, 2, 3]) {
			recordFirstPlayerWin(board);
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

describe('the Winners Bracket picture', () => {
	it('puts Bye Players in Round 2, and shows who has advanced and who is still playing', () => {
		// 5 Players in an 8-place bracket: one first-Round Match, three Byes.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting, byes] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];
		const [dan, eve] = byes.players as [Player, Player];

		expect(getBracketPicture(tournament, 'winners')).toEqual({
			rounds: [
				[{ players: [ann, bob], board: 1 }, undefined, undefined, undefined],
				[
					{ players: [undefined, cat], board: 2 },
					{ players: [dan, eve], board: 3 },
				],
				[{ players: [undefined, undefined] }],
			],
		});

		tournament = expectOk(recordWinner(tournament, firstMatch.match, bob.id, 'leaving'));

		expect(getBracketPicture(tournament, 'winners')!.rounds.slice(0, 2)).toEqual([
			[{ players: [ann, bob], winner: bob }, undefined, undefined, undefined],
			[
				{ players: [bob, cat], board: 2 },
				{ players: [dan, eve], board: 3 },
			],
		]);
	});
});

describe('Now playing', () => {
	it('lists each Match being played, with its Board and both Players, but not a Player waiting', () => {
		// 5 Players: Ann and Bob play on Board 1, Cat waits at Board 2 for its winner, Dan and Eve play on Board 3.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting, byes] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];
		const [dan, eve] = byes.players as [Player, Player];
		const listNowPlaying = () =>
			getNowPlaying(tournament).map(({ board, players: [a, b] }) => [board, a.name, b.name]);

		expect(listNowPlaying()).toEqual([
			[1, ann.name, bob.name],
			[3, dan.name, eve.name],
		]);

		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'leaving'));
		expect(listNowPlaying()).toEqual([
			[2, ann.name, cat.name],
			[3, dan.name, eve.name],
		]);
	});

	it('lists nothing before Start', () => {
		const drawn = expectOk(makeSeededDraw(5, 4));

		expect(getNowPlaying(drawn)).toEqual([]);
	});
});

describe('who has lost in the Winners Bracket', () => {
	it('counts only a Player beaten in a Match, not one with a Bye or still to play', () => {
		// 5 Players: Ann and Bob play the one first-Round Match; Cat has a Bye and waits for its winner.
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];

		expect(hasLostIn(tournament, 'winners', ann.id)).toBe(false);

		tournament = expectOk(recordWinner(tournament, firstMatch.match, bob.id, 'leaving'));

		expect(hasLostIn(tournament, 'winners', ann.id)).toBe(true);
		expect(hasLostIn(tournament, 'winners', bob.id)).toBe(false);
		expect(hasLostIn(tournament, 'winners', cat.id)).toBe(false);

		const bobAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, bob, cat))!;
		tournament = expectOk(recordWinner(tournament, bobAndCat.match, cat.id, 'leaving'));

		expect(hasLostIn(tournament, 'winners', bob.id)).toBe(true);
		expect(hasLostIn(tournament, 'winners', cat.id)).toBe(false);
	});
});

describe('the Losers Bracket', () => {
	it('asks whether a Player losing their first Match is staying, in whichever Round, Forfeits included', () => {
		/*
		 * 5 Players: Ann and Bob play the one first-Round Match, Cat has a Bye and waits for its winner,
		 * and Dan and Eve, both Byes, meet in Round 2.
		 */
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];

		expect(isLosersBracketOpenTo(tournament, bob.id)).toBe(true);
		expect(recordWinner(tournament, firstMatch.match, ann.id)).toEqual({
			ok: false,
			reason: `Say whether ${bob.name} is staying for the Losers Bracket.`,
		});
		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'staying'));

		// Cat's first Match is in Round 2, and a Forfeit counts. Ann has played, so losing now isn't asked.
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		expect(isLosersBracketOpenTo(tournament, cat.id)).toBe(true);
		expect(isLosersBracketOpenTo(tournament, ann.id)).toBe(false);
		expect(recordForfeit(tournament, annAndCat.match, cat.id)).toEqual({
			ok: false,
			reason: `Say whether ${cat.name} is staying for the Losers Bracket.`,
		});
		expect(recordForfeit(tournament, annAndCat.match, cat.id, 'leaving').ok).toBe(true);
		expect(recordWinner(tournament, annAndCat.match, cat.id).ok).toBe(true);
	});

	it('is drawn from those staying once every Match the Draw started has a result, its Matches waiting for a Board when none is free', () => {
		/*
		 * 6 Players on 3 Boards: Ann and Bob, and Cat and Dan, play first-Round Matches; Eve and Fay, both
		 * Byes, meet in Round 2.
		 */
		let tournament = startTournament(6, 3);
		const [annAndBob, catAndDan, eveAndFay] = getMatchesOnBoards(tournament);
		const [ann, bob] = annAndBob.players as [Player, Player];
		const [cat, dan] = catAndDan.players as [Player, Player];
		const [eve, fay] = eveAndFay.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));
		expect(getBracketPicture(tournament, 'losers')).toBeUndefined();

		tournament = expectOk(recordWinner(tournament, eveAndFay.match, eve.id, 'staying'));

		/*
		 * The Winners Bracket holds 2 Boards: Ann and Cat's Match, and Eve waiting for the final. Bob, Dan
		 * and Fay make a Losers Bracket of one Match and a Bye: the Match takes the third Board, and the Bye
		 * Player waits for a Board of their own.
		 */
		const [[losersMatch], [losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
		const byePlayer = losersFinal!.players.find(Boolean)!;
		expect([...losersMatch!.players, byePlayer].map((p) => p!.name).sort()).toEqual(
			[bob, dan, fay].map((p) => p.name).sort(),
		);
		const [losersA, losersB] = losersMatch!.players as [Player, Player];
		expect(listSeats(tournament)).toEqual([
			[1, ann.name, cat.name],
			[2, eve.name, 'Winner of Board 1'],
			[3, losersA.name, losersB.name],
		]);
		expect(listWaiting(tournament)).toEqual([[byePlayer.name, 'Winner of Board 3']]);

		// Board 1 frees, and the longest-waiting Match takes it. Ann goes to Eve's Board for the final.
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		tournament = expectOk(recordWinner(tournament, annAndCat.match, ann.id));
		expect(listSeats(tournament)).toEqual([
			[1, byePlayer.name, 'Winner of Board 3'],
			[2, ann.name, eve.name],
			[3, losersA.name, losersB.name],
		]);
		expect(listWaiting(tournament)).toEqual([]);
	});

	it('is not played with fewer than two Players staying, and the Tournament finishes with the Winners Bracket', () => {
		// 4 Players: Ann and Bob, and Cat and Dan, play the first Round.
		let tournament = startTournament(4, 2);
		const [annAndBob, catAndDan] = getMatchesOnBoards(tournament);
		const [ann] = annAndBob.players as [Player, Player];
		const [cat] = catAndDan.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'leaving'));

		expect(getBracketPicture(tournament, 'losers')).toBeUndefined();
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1]);
		const [final] = getMatchesOnBoards(tournament);
		tournament = expectOk(recordWinner(tournament, final.match, ann.id));
		expect(tournament.phase).toBe('finished');
	});

	it('finishes the Tournament only once both brackets have a champion', () => {
		// 4 Players: Ann beats Bob and Cat beats Dan, and Bob and Dan both stay to meet in the Losers Bracket.
		let tournament = startTournament(4, 2);
		const [annAndBob, catAndDan] = getMatchesOnBoards(tournament);
		const [ann, bob] = annAndBob.players as [Player, Player];
		const [cat, dan] = catAndDan.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));
		const winnersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		const losersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, bob, dan))!;

		tournament = expectOk(recordWinner(tournament, winnersFinal.match, cat.id));
		expect(getBracketPicture(tournament, 'winners')!.champion).toEqual(cat);
		expect(tournament.phase).toBe('inProgress');

		expect(hasLostIn(tournament, 'losers', dan.id)).toBe(false);
		tournament = expectOk(recordWinner(tournament, losersFinal.match, bob.id));
		expect(hasLostIn(tournament, 'losers', dan.id)).toBe(true);
		expect(hasLostIn(tournament, 'winners', dan.id)).toBe(true);
		expect(hasLostIn(tournament, 'losers', bob.id)).toBe(false);
		expect(getBracketPicture(tournament, 'losers')!.champion).toEqual(bob);
		expect(tournament.phase).toBe('finished');
	});

	it('holds a place for a Bye Player whose first Match is still to come, theirs if they lose and stay', () => {
		const heldPlace = setUpHeldPlace(['staying', 'staying']);
		const { ann, cat, dan, losersMatch } = heldPlace;
		let { tournament } = heldPlace;
		const [staying, other] = losersMatch.map((p) => p.name);
		expect(listSeats(tournament)).toEqual([
			[1, dan.name, 'Winner of Board 2'],
			[2, ann.name, cat.name],
			[3, staying, `Place held for ${cat.name}`],
			[4, other, 'Winner of Board 3'],
		]);
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		const losersFirstMatch = getMatchesOnBoards(tournament).find((m) => m.board === 3)!;
		expect(recordWinner(tournament, losersFirstMatch.match, losersMatch[0].id)).toEqual({
			ok: false,
			reason: 'That Match is still waiting for a Player.',
		});
		expect(isLosersBracketOpenTo(tournament, cat.id)).toBe(true);

		tournament = expectOk(recordWinner(tournament, annAndCat.match, ann.id, 'staying'));

		// Cat comes to the held place at Board 3, and Ann joins Dan for the final.
		expect(listSeats(tournament)).toEqual([
			[1, ann.name, dan.name],
			[3, cat.name, staying],
			[4, other, 'Winner of Board 3'],
		]);
	});

	it.each([
		{ result: 'wins their first Match', catWins: true, answer: undefined },
		{
			result: 'loses their first Match and leaves',
			catWins: false,
			answer: 'leaving' as const,
		},
	])(
		'gives the held place’s opponent a Bye when the Bye Player $result',
		({ catWins, answer }) => {
			const heldPlace = setUpHeldPlace(['staying', 'staying']);
			const { ann, cat, dan, losersMatch } = heldPlace;
			let { tournament } = heldPlace;
			const [byeNow, byeAtDraw] = losersMatch.map((p) => p.name);
			const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
			const winner = catWins ? cat : ann;

			tournament = expectOk(recordWinner(tournament, annAndCat.match, winner.id, answer));

			// Board 3 frees: its Player goes on to meet the Bye Player waiting at Board 4.
			expect(listSeats(tournament)).toEqual([
				[1, winner.name, dan.name],
				[4, byeNow, byeAtDraw],
			]);
			const [, [losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
			expect(losersFinal!.players.map((p) => p!.name)).toEqual([byeNow, byeAtDraw]);
		},
	);

	it('refuses to undo a first-Match result once the Losers Bracket is drawn, and lists only the others', () => {
		// 4 Players: Ann beats Bob and Cat beats Dan, and Bob and Dan both stay to meet in the Losers Bracket.
		let tournament = startTournament(4, 2);
		const [annAndBob, catAndDan] = getMatchesOnBoards(tournament);
		const [ann, bob] = annAndBob.players as [Player, Player];
		const [cat, dan] = catAndDan.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));

		expect(undoResult(tournament, annAndBob.match)).toEqual({
			ok: false,
			reason: 'That result can’t be undone: the Losers Bracket has been drawn.',
		});
		expect(getUndoableResults(tournament)).toEqual([]);

		const losersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, bob, dan))!;
		const winnersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		tournament = expectOk(recordWinner(tournament, losersFinal.match, dan.id));
		tournament = expectOk(recordWinner(tournament, winnersFinal.match, ann.id));
		const undoable = getUndoableResults(tournament).map((r) => [r.winner.name, r.loser.name]);
		expect(undoable).toEqual([
			[ann.name, cat.name],
			[dan.name, bob.name],
		]);
		expect(undoResult(tournament, losersFinal.match).ok).toBe(true);
	});

	it('lets a first-Match result be undone when no Losers Bracket was drawn, drawing one if two then stay', () => {
		// 4 Players: Ann beats Bob, who stays, and Cat beats Dan, who leaves: no Losers Bracket.
		let tournament = startTournament(4, 2);
		const [annAndBob, catAndDan] = getMatchesOnBoards(tournament);
		const [ann, bob] = annAndBob.players as [Player, Player];
		const [cat, dan] = catAndDan.players as [Player, Player];
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'leaving'));

		tournament = expectOk(undoResult(tournament, catAndDan.match));
		expect(isLosersBracketOpenTo(tournament, dan.id)).toBe(true);
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));

		const [[losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
		expect(losersFinal!.players.map((p) => p!.name).sort()).toEqual(
			[bob.name, dan.name].sort(),
		);
		expect(getMatchesOnBoards(tournament).some((m) => isPlaying(m, ann, cat))).toBe(true);
	});

	it('makes the Losers Draw at random, the same every time from the same seeded random source', () => {
		const drawLosersWith = (seed: number) => {
			const tournament = playDrawStaying(startTournament(26, 13, seed));
			return getBracketPicture(tournament, 'losers')!.rounds[0];
		};

		expect(drawLosersWith(42)).toEqual(drawLosersWith(42));
		expect(drawLosersWith(42)).not.toEqual(drawLosersWith(43));
		// Not in the order the Players registered.
		const drawnIds = drawLosersWith(42).flatMap((m) => m?.players.map((p) => p!.id) ?? []);
		expect(drawnIds).not.toEqual([...drawnIds].sort((a, b) => a - b));
	});

	it('gives each Board that frees to the longest-waiting Match, whichever its bracket', () => {
		/*
		 * 10 Players on 5 Boards: two first-Round Matches, and three Round 2 Matches between Bye Players.
		 * Once all five are played, the Winners Bracket holds 3 Boards, and the five losers, all staying,
		 * make a Losers Bracket needing 3: its last Match waits.
		 */
		let tournament = playDrawStaying(startTournament(10, 5));
		const [waitingLosers] = getWaitingForBoard(tournament);
		expect(waitingLosers.match.bracket).toBe('losers');
		const [a, b] = waitingLosers.players as [Player, Player];
		expect(recordWinner(tournament, waitingLosers.match, a.id)).toEqual({
			ok: false,
			reason: `${a.name} and ${b.name} are still waiting for a Board.`,
		});
		const ready = getMatchesOnBoards(tournament).find(
			(m) => m.match.round === 3 && m.players.every((p) => 'name' in p),
		)!;
		const winner = ready.players[0] as Player;
		const otherSemiFinal = getMatchesOnBoards(tournament).find(
			(m) => m.match.round === 3 && m !== ready,
		)!;

		tournament = expectOk(recordWinner(tournament, ready.match, winner.id));

		// The waiting Losers Match takes the Board, and the winner's next Match waits behind it.
		const nowOnBoard = getMatchesOnBoards(tournament).find((m) => m.board === ready.board)!;
		expect(nowOnBoard.match).toEqual(waitingLosers.match);
		expect(listWaiting(tournament)).toEqual([
			[winner.name, `Winner of Board ${otherSemiFinal.board}`],
		]);
		const roundTwo = getMatchesOnBoards(tournament).find(
			(m) => m.match.bracket === 'winners' && m.match.round === 2,
		)!;

		tournament = expectOk(recordWinner(tournament, roundTwo.match, roundTwo.players[0].id));

		const final = getMatchesOnBoards(tournament).find((m) => m.board === roundTwo.board)!;
		expect(final.players[0]).toEqual(winner);
		expect(listWaiting(tournament)).toEqual([]);
	});

	it('waits for the held place when only one Player is staying, and is not played with none', () => {
		const one = setUpHeldPlace(['staying', 'leaving']);
		expect(getBracketPicture(one.tournament, 'losers')).toBeUndefined();
		expect(isLosersBracketOpenTo(one.tournament, one.cat.id)).toBe(true);
		const annAndCat = getMatchesOnBoards(one.tournament).find((m) =>
			isPlaying(m, one.ann, one.cat),
		)!;
		const catStays = expectOk(
			recordWinner(one.tournament, annAndCat.match, one.ann.id, 'staying'),
		);
		const [[losersFinal]] = getBracketPicture(catStays, 'losers')!.rounds;
		expect(losersFinal!.players.map((p) => p!.name).sort()).toEqual(
			[one.bob.name, one.cat.name].sort(),
		);
		const catWins = expectOk(recordWinner(one.tournament, annAndCat.match, one.cat.id));
		expect(getBracketPicture(catWins, 'losers')).toBeUndefined();
		expect(listSeats(catWins)).toEqual([[1, one.cat.name, one.dan.name]]);

		const none = setUpHeldPlace(['leaving', 'leaving']);
		expect(isLosersBracketOpenTo(none.tournament, none.cat.id)).toBe(false);
		const noneAnnAndCat = getMatchesOnBoards(none.tournament).find((m) =>
			isPlaying(m, none.ann, none.cat),
		)!;
		expect(recordWinner(none.tournament, noneAnnAndCat.match, none.ann.id).ok).toBe(true);
	});
});

/*
 * 5 Players on 4 Boards, Started, up to the Losers Draw: Ann beats Bob in the one first-Round Match, Cat
 * has a Bye and waits for Ann, and Dan beats Eve in Round 2, where they met as Byes. Bob and Eve answer
 * whether they are staying; Cat's first Match is still to come. The Losers Bracket's first-Round Match is
 * given by its Player first.
 */
const setUpHeldPlace = (answers: readonly [StayingAnswer, StayingAnswer]) => {
	let tournament = startTournament(5, 4);
	const [annAndBob, waiting, danAndEve] = getMatchesOnBoards(tournament);
	const [ann, bob] = annAndBob.players as [Player, Player];
	const cat = waiting.players[0];
	const [dan, eve] = danAndEve.players as [Player, Player];
	tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, answers[0]));
	tournament = expectOk(recordWinner(tournament, danAndEve.match, dan.id, answers[1]));
	const [[firstMatch]] = getBracketPicture(tournament, 'losers')?.rounds ?? [[]];
	const inFirstMatch = firstMatch?.players.find(Boolean);
	const losersMatch = inFirstMatch?.id === eve.id ? [eve, bob] : [bob, eve];
	return { tournament, ann, bob, cat, dan, eve, losersMatch };
};

/*
 * Records every Match the Draw started, its first-named Player winning and the loser staying for the
 * Losers Bracket.
 */
const playDrawStaying = (started: Tournament): Tournament => {
	let tournament = started;
	const opening = getMatchesOnBoards(tournament).filter((m) =>
		m.players.every((p) => 'name' in p),
	);
	for (const { match, players } of opening) {
		tournament = expectOk(recordWinner(tournament, match, players[0].id, 'staying'));
	}
	return tournament;
};

// Each Match holding a Board, in Board order, by its Board and its Players' names.
const listSeats = (tournament: Tournament) =>
	getMatchesOnBoards(tournament).map(({ board, players: [a, b] }) => [
		board,
		a.name,
		getPlayerName(b),
	]);

// Each Match waiting for a Board, longest-waiting first, by its Players' names.
const listWaiting = (tournament: Tournament) =>
	getWaitingForBoard(tournament).map(({ players: [a, b] }) => [a.name, getPlayerName(b)]);

// Whether all the given Players are seated in a Match, wherever the Draw put it.
const isPlaying = (match: MatchOnBoard, ...players: Player[]): boolean =>
	players.every((p) => match.players.some((seated) => 'id' in seated && seated.id === p.id));

// A Tournament with the given number of Players registered and Boards set out.
const setUpTournament = (players: number, boards: number): Tournament => {
	let tournament = createTournament();
	for (let i = 1; i <= players; i++) {
		tournament = expectOk(registerPlayer(tournament, `Player ${i}`));
	}
	const typed = String(boards);
	return boards === 0 ? tournament : expectOk(setBoardCount(tournament, typed));
};

// A Tournament with the named Players registered, in order.
const registerPlayers = (...names: string[]): Tournament => {
	let tournament = createTournament();
	for (const name of names) {
		tournament = expectOk(registerPlayer(tournament, name));
	}
	return tournament;
};

// The Draw for a Tournament set up as setUpTournament does, shuffled by a seeded random source.
const makeSeededDraw = (players: number, boards: number, seed = 1): Result<Tournament> => {
	const registered = setUpTournament(players, boards);
	return makeDraw(registered, createSeededRandom(seed));
};

// A Tournament that has made its Draw and Started.
const startTournament = (players: number, boards: number, seed = 1): Tournament => {
	const drawn = expectOk(makeSeededDraw(players, boards, seed));
	return expectOk(start(drawn));
};

// A repeatable stand-in for Math.random (mulberry32): the same seed gives the same numbers.
const createSeededRandom = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const expectOk = (outcome: Result<Tournament>): Tournament => {
	if (!outcome.ok) {
		throw new Error(`Expected command to succeed, was rejected: ${outcome.reason}`);
	}
	return outcome.value;
};

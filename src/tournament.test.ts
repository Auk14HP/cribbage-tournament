import { describe, expect, it } from 'vitest';
import {
	makeDraw,
	newTournament,
	recordWinner,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	start,
	matchesOnBoards,
	winnersBracketPicture,
	type Player,
	type Tournament,
	type WinnerOf,
} from './tournament';
import type { Result } from './result';

describe('registering Players', () => {
	it('lists registered Players by the name the room knows them by, with a running count', () => {
		let tournament = newTournament();
		tournament = expectOk(registerPlayer(tournament, 'Dave K.'));
		tournament = expectOk(registerPlayer(tournament, 'Big Dave'));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.', 'Big Dave']);
		expect(tournament.players.length).toBe(2);
	});

	it('rejects a name identical to an existing Player, with a reason, and leaves the list unchanged', () => {
		const tournament = expectOk(registerPlayer(newTournament(), 'Big Dave'));

		const outcome = registerPlayer(tournament, 'Big Dave');

		expect(outcome).toEqual({
			ok: false,
			reason: 'There is already a Player called "Big Dave".',
		});
		expect(tournament.players.length).toBe(1);
	});

	it('ignores stray spaces around a name, so a padded duplicate is still rejected', () => {
		const tournament = expectOk(registerPlayer(newTournament(), '  Dave K. '));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.']);
		expect(registerPlayer(tournament, 'Dave K.  ').ok).toBe(false);
	});

	it('rejects a blank name', () => {
		expect(registerPlayer(newTournament(), '   ')).toEqual({
			ok: false,
			reason: 'Type the Player’s name.',
		});
	});
});

describe('correcting Players before the Draw', () => {
	it('renames a Player, keeping their place in the list', () => {
		let tournament = expectOk(registerPlayer(newTournament(), 'Dave K'));
		tournament = expectOk(registerPlayer(tournament, 'Big Dave'));
		const daveK = tournament.players[0];

		tournament = expectOk(renamePlayer(tournament, daveK.id, 'Dave K.'));

		expect(tournament.players.map((p) => p.name)).toEqual(['Dave K.', 'Big Dave']);
	});

	it('refuses to rename a Player to another Player’s name', () => {
		let tournament = expectOk(registerPlayer(newTournament(), 'Dave K.'));
		tournament = expectOk(registerPlayer(tournament, 'Big Dave'));
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
		const tournament = expectOk(registerPlayer(newTournament(), 'Dave K.'));
		const daveK = tournament.players[0];

		expect(renamePlayer(tournament, daveK.id, 'Dave K. ').ok).toBe(true);
	});

	it('removes a Player who changed their mind, freeing their name', () => {
		let tournament = expectOk(registerPlayer(newTournament(), 'Dave K.'));
		tournament = expectOk(registerPlayer(tournament, 'Big Dave'));
		const daveK = tournament.players[0];

		tournament = expectOk(removePlayer(tournament, daveK.id));

		expect(tournament.players.map((p) => p.name)).toEqual(['Big Dave']);
		expect(tournament.players.length).toBe(1);
		expect(registerPlayer(tournament, 'Dave K.').ok).toBe(true);
	});

	it('refuses to rename or remove a Player who is no longer registered', () => {
		let tournament = expectOk(registerPlayer(newTournament(), 'Dave K.'));
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
		let tournament = expectOk(setBoardCount(newTournament(), ' 12 '));
		expect(tournament.boards).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

		tournament = expectOk(setBoardCount(tournament, '3'));
		expect(tournament.boards).toEqual([1, 2, 3]);
	});

	it('refuses a blank, or anything but a whole number above zero', () => {
		expect(setBoardCount(newTournament(), '  ')).toEqual({
			ok: false,
			reason: 'Type how many Boards there are.',
		});
		for (const typed of ['seven', '2.5', '0', '-3']) {
			expect(setBoardCount(newTournament(), typed)).toEqual({
				ok: false,
				reason: 'The number of Boards is a whole number above zero, like 12.',
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
			const tournament = expectOk(makeDraw(tonight(field, 16), seededRandom(field)));

			const matches = matchesOnBoards(tournament);
			expect(matches.length).toBe(boards);
			const seated = matches.flatMap((m) => m.players);
			const [players, winners] = [
				seated.filter((p): p is Player => 'name' in p),
				seated.filter((p): p is WinnerOf => 'winnerOfBoard' in p),
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
		const tournament = expectOk(makeDraw(tonight(3, 4), seededRandom(1)));

		const [match, waiting] = matchesOnBoards(tournament);
		const [a, b] = match.players as [Player, Player];
		const [bye] = tournament.players.filter((p) => p !== a && p !== b);
		expect(match.board).toBe(1);
		expect(waiting).toMatchObject({ board: 2, players: [bye, { winnerOfBoard: 1 }] });
	});

	it('makes the same Draw every time from the same seeded random source, and a different one from another', () => {
		const night = tonight(26, 16);
		const drawWith = (seed: number) =>
			matchesOnBoards(expectOk(makeDraw(night, seededRandom(seed))));

		expect(drawWith(42)).toEqual(drawWith(42));
		expect(drawWith(42)).not.toEqual(drawWith(43));
	});

	it('puts each Match it seats on the lowest-numbered free Board', () => {
		// 6 Players: two first-Round Matches, and the two Bye Players meet in Round 2.
		const matches = matchesOnBoards(expectOk(makeDraw(tonight(6, 5), seededRandom(1))));

		expect(matches.map((m) => m.board)).toEqual([1, 2, 3]);
	});

	it('refuses the Draw with fewer than two Players', () => {
		expect(makeDraw(tonight(1, 4), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw needs at least two Players.',
		});
	});

	it('refuses the Draw until there is a Board for every Player to sit at', () => {
		// 26 Players: 13 Matches, 10 in the first Round and 3 between Bye Players in Round 2.
		expect(makeDraw(tonight(26, 12), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 13 Boards, and there are only 12.',
		});
		// 21 Players: 10 Matches, and a Board for the Bye Player waiting for a winner.
		expect(makeDraw(tonight(21, 10), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 11 Boards, and there are only 10.',
		});
		expect(makeDraw(tonight(2, 0), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw seats every Player at a Board, so it needs 1 Board, and there are none.',
		});
		expect(makeDraw(tonight(26, 13), seededRandom(1)).ok).toBe(true);
		expect(makeDraw(tonight(21, 11), seededRandom(1)).ok).toBe(true);
	});

	it('closes registration: a late arrival is refused, and the drawn Players can’t be renamed or removed', () => {
		const tournament = expectOk(makeDraw(tonight(5, 4), seededRandom(1)));
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
		const tournament = expectOk(makeDraw(tonight(5, 4), seededRandom(1)));

		expect(setBoardCount(tournament, '6')).toEqual({
			ok: false,
			reason: 'The number of Boards can’t change once the Draw is made.',
		});
	});

	it('refuses a second Draw', () => {
		const tournament = expectOk(makeDraw(tonight(5, 4), seededRandom(1)));

		expect(makeDraw(tournament, seededRandom(2))).toEqual({
			ok: false,
			reason: 'The Draw has already been made.',
		});
	});
});

describe('starting the Tournament', () => {
	it('moves the Tournament from Tonight’s Draw screen to in progress', () => {
		let tournament = expectOk(makeDraw(tonight(5, 4), seededRandom(1)));
		expect(tournament.phase).toBe('drawShown');

		tournament = expectOk(start(tournament));

		expect(tournament.phase).toBe('inProgress');
	});

	it('refuses to Start before the Draw, or a second time', () => {
		expect(start(tonight(5, 4))).toEqual({
			ok: false,
			reason: 'Make the Draw before starting.',
		});
		const started = expectOk(start(expectOk(makeDraw(tonight(5, 4), seededRandom(1)))));
		expect(start(started)).toEqual({
			ok: false,
			reason: 'The Tournament has already started.',
		});
	});
});

describe('recording winners', () => {
	it('crowns the winner of a two-Player final as champion, freeing their Board', () => {
		const tournament = started(2, 1);
		const [final] = matchesOnBoards(tournament);
		const [a] = final.players as [Player, Player];

		const after = expectOk(recordWinner(tournament, final.match, a.id));

		expect(winnersBracketPicture(after)!.champion).toEqual(a);
		expect(matchesOnBoards(after)).toEqual([]);
	});

	it('plays a night with Byes through to a champion, moving each Match to the lowest-numbered free Board', () => {
		/*
		 * 5 Players: Ann and Bob play the one first-Round Match on Board 1. Cat has a Bye and waits at
		 * Board 2 for its winner; Dan and Eve, the other Bye Players, meet in Round 2 on Board 3.
		 */
		let tournament = started(5, 4);
		const seated = () =>
			matchesOnBoards(tournament).map(({ board, players: [a, b] }) => [
				board,
				a.name,
				'name' in b ? b.name : `Winner of Board ${b.winnerOfBoard}`,
			]);
		const on = (board: number) => matchesOnBoards(tournament).find((m) => m.board === board)!;
		const [ann, bob] = on(1).players as [Player, Player];
		const cat = on(2).players[0];
		const dan = on(3).players[0];
		const win = (board: number, winner: Player) => {
			tournament = expectOk(recordWinner(tournament, on(board).match, winner.id));
		};

		win(3, dan);
		// Dan waits for his Round 3 opponent without a Board; Board 3 is free.
		expect(seated()).toEqual([
			[1, ann.name, bob.name],
			[2, cat.name, 'Winner of Board 1'],
		]);

		win(1, ann);
		// Ann joins Cat at Board 2, and Board 1 frees. Once both are known, they're named in bracket order.
		expect(seated()).toEqual([[2, ann.name, cat.name]]);

		win(2, ann);
		// The final is ready, and takes the lowest-numbered free Board.
		expect(seated()).toEqual([[1, ann.name, dan.name]]);
		expect(winnersBracketPicture(tournament)!.champion).toBeUndefined();

		win(1, dan);
		expect(seated()).toEqual([]);
		expect(winnersBracketPicture(tournament)!.champion).toEqual(dan);
	});

	it('readies a Match as soon as both its Players are known, without waiting for the rest of the Round', () => {
		// 8 Players: four first-Round Matches on Boards 1 to 4.
		let tournament = started(8, 4);
		const on = (board: number) => matchesOnBoards(tournament).find((m) => m.board === board)!;
		const winFirst = (board: number) => {
			const { match, players } = on(board);
			tournament = expectOk(recordWinner(tournament, match, (players[0] as Player).id));
		};
		const fourth = (on(4).players[0] as Player).name;
		const third = (on(3).players[0] as Player).name;

		winFirst(4);
		expect(matchesOnBoards(tournament).map((m) => m.board)).toEqual([1, 2, 3]);

		winFirst(3);
		// The winners of Boards 3 and 4 meet on Board 3, while Boards 1 and 2 are still playing.
		expect(matchesOnBoards(tournament).map((m) => m.board)).toEqual([1, 2, 3]);
		expect(on(3).players.map((p) => ('name' in p ? p.name : p))).toEqual([third, fourth]);
	});

	it.each([2, 3, 7, 12, 21, 26, 32])(
		'plays %i Players to a champion, never seating two Matches at one Board',
		(field) => {
			const boards = Math.ceil(field / 2);
			let tournament = started(field, boards, field);
			let played = 0;
			for (;;) {
				const matches = matchesOnBoards(tournament);
				const seats = matches.map((m) => m.board);
				expect(new Set(seats).size).toBe(seats.length);
				expect(seats.every((b) => b >= 1 && b <= boards)).toBe(true);
				const ready = matches.find((m) => m.players.every((p) => 'name' in p));
				if (!ready) {
					break;
				}
				// The second-named Player wins, so a Player who waited isn't always the one who goes through.
				const winner = ready.players[1] as Player;
				tournament = expectOk(recordWinner(tournament, ready.match, winner.id));
				played++;
			}
			// Every Match knocks one Player out, until one is left: the champion.
			expect(played).toBe(field - 1);
			expect(winnersBracketPicture(tournament)!.champion).toBeDefined();
		},
	);

	it('refuses a winner before Start, twice for one Match, from outside the Match, or before both Players are known', () => {
		const drawn = expectOk(makeDraw(tonight(3, 2), seededRandom(1)));
		const [first, waiting] = matchesOnBoards(drawn);
		const [a, b] = first.players as [Player, Player];
		expect(recordWinner(drawn, first.match, a.id)).toEqual({
			ok: false,
			reason: 'Press Start before recording a winner.',
		});

		const tournament = expectOk(start(drawn));
		expect(recordWinner(tournament, waiting.match, waiting.players[0].id)).toEqual({
			ok: false,
			reason: 'That Match is still waiting for a Player.',
		});
		expect(recordWinner(tournament, first.match, waiting.players[0].id)).toEqual({
			ok: false,
			reason: 'That Player isn’t in that Match.',
		});
		const recorded = expectOk(recordWinner(tournament, first.match, a.id));
		expect(recordWinner(recorded, first.match, b.id)).toEqual({
			ok: false,
			reason: 'That Match already has a winner.',
		});
	});
});

describe('the Winners Bracket picture', () => {
	it('puts Bye Players in Round 2, and shows who has advanced and who is still playing', () => {
		// 5 Players in an 8-place bracket: one first-Round Match, three Byes.
		let tournament = started(5, 4);
		const [first, waiting, byes] = matchesOnBoards(tournament);
		const [ann, bob] = first.players as [Player, Player];
		const cat = waiting.players[0];
		const [dan, eve] = byes.players as [Player, Player];

		expect(winnersBracketPicture(tournament)).toEqual({
			rounds: [
				[{ players: [ann, bob], board: 1 }, undefined, undefined, undefined],
				[
					{ players: [undefined, cat], board: 2 },
					{ players: [dan, eve], board: 3 },
				],
				[{ players: [undefined, undefined] }],
			],
		});

		tournament = expectOk(recordWinner(tournament, first.match, bob.id));

		expect(winnersBracketPicture(tournament)!.rounds.slice(0, 2)).toEqual([
			[{ players: [ann, bob], winner: bob }, undefined, undefined, undefined],
			[
				{ players: [bob, cat], board: 2 },
				{ players: [dan, eve], board: 3 },
			],
		]);
	});
});

// A night with the given number of Players registered and Boards set out.
const tonight = (players: number, boards: number): Tournament => {
	let tournament = newTournament();
	for (let i = 1; i <= players; i++) {
		tournament = expectOk(registerPlayer(tournament, `Player ${i}`));
	}
	return boards === 0 ? tournament : expectOk(setBoardCount(tournament, String(boards)));
};

// A night that has made its Draw and Started.
const started = (players: number, boards: number, seed = 1): Tournament =>
	expectOk(start(expectOk(makeDraw(tonight(players, boards), seededRandom(seed)))));

// A repeatable stand-in for Math.random (mulberry32): the same seed gives the same numbers.
const seededRandom = (seed: number) => () => {
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

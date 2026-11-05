import { describe, expect, it } from 'vitest';
import {
	getMatchesOnBoards,
	getWaitingForBoard,
	makeDraw,
	recordWinner,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	start,
	type Player,
	type WinnerOf,
} from './index';
import {
	createSeededRandom,
	expectOk,
	isPlaying,
	hasBothPlayersKnown,
	listWaiting,
	makeSeededDraw,
	setUpTournament,
} from './testSetup';
import { getPlayerName } from '../wording';

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
			for (const { winnerOf } of winners) {
				expect(matches.some((m) => isPlaying(m, ...winnerOf!))).toBe(true);
			}
		},
	);

	it('seats a Bye Player at their own Board, waiting for the winner of a first-Round Match', () => {
		const tournament = expectOk(makeSeededDraw(3, 4));

		const [match, waiting] = getMatchesOnBoards(tournament);
		const [a, b] = match.players as [Player, Player];
		const [bye] = tournament.players.filter((p) => p !== a && p !== b);
		expect(match.board).toBe(1);
		expect(waiting).toMatchObject({ board: 2, players: [bye, { winnerOf: [a, b] }] });
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

	it('seats Matches with both Players known first, and queues the rest for a Board', () => {
		// 26 Players: 13 Matches, 10 in the first Round and 3 between Bye Players in Round 2.
		const drawOf26 = expectOk(makeSeededDraw(26, 12));

		expect(getMatchesOnBoards(drawOf26).map((m) => m.board)).toEqual(
			Array.from({ length: 12 }, (_, i) => i + 1),
		);
		const started = expectOk(start(drawOf26));
		const queue = getWaitingForBoard(started);
		expect(queue).toHaveLength(1);
		const [a, b] = queue[0].players as [Player, Player];
		expect(recordWinner(started, queue[0].match, a.id)).toEqual({
			ok: false,
			reason: `${a.name} and ${b.name} are still waiting for a Board.`,
		});

		/*
		 * 25 Players: 9 first-Round Matches and 3 between Bye Players fill the 12 Boards, ahead of the Bye
		 * Player waiting for the last first-Round Match's winner.
		 */
		const drawOf25 = expectOk(makeSeededDraw(25, 12));

		const seated = getMatchesOnBoards(drawOf25);
		expect(seated.every(hasBothPlayersKnown)).toBe(true);
		const [waiting] = listWaiting(drawOf25);
		const [, awaited] = /^Winner of (.+)$/.exec(waiting[1])!;
		expect(seated.map(({ players: [a, b] }) => `${a.name} / ${getPlayerName(b)}`)).toContain(
			awaited,
		);
	});

	it('refuses the Draw with no Boards set out', () => {
		expect(makeSeededDraw(2, 0)).toEqual({
			ok: false,
			reason: 'The Draw needs at least one Board.',
		});
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

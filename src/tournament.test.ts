import { describe, expect, it } from 'vitest';
import {
	addBoard,
	makeDraw,
	newTournament,
	registerPlayer,
	removeBoard,
	removePlayer,
	renamePlayer,
	roundOneDraw,
	start,
	type Tournament,
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

describe('entering Boards', () => {
	it('lists tonight’s Boards in number order, whatever order they were typed in', () => {
		let tournament = newTournament();
		tournament = expectOk(addBoard(tournament, '3'));
		tournament = expectOk(addBoard(tournament, ' 12 '));
		tournament = expectOk(addBoard(tournament, '1'));

		expect(tournament.boards).toEqual([1, 3, 12]);
	});

	it('refuses a Board number already entered, a blank, or anything but a whole number above zero', () => {
		const tournament = expectOk(addBoard(newTournament(), '7'));

		expect(addBoard(tournament, '7')).toEqual({
			ok: false,
			reason: 'Board 7 is already entered.',
		});
		expect(addBoard(tournament, '  ')).toEqual({
			ok: false,
			reason: 'Type the Board’s number.',
		});
		for (const typed of ['seven', '2.5', '0', '-3']) {
			expect(addBoard(tournament, typed)).toEqual({
				ok: false,
				reason: 'A Board number is a whole number on its placard, like 7.',
			});
		}
	});

	it('takes out a mistyped Board, so its number can be entered again', () => {
		let tournament = expectOk(addBoard(newTournament(), '1'));
		tournament = expectOk(addBoard(tournament, '22'));

		tournament = expectOk(removeBoard(tournament, 22));

		expect(tournament.boards).toEqual([1]);
		expect(addBoard(tournament, '22').ok).toBe(true);
	});
});

describe('making the Draw', () => {
	/*
	 * The bracket is the next power of two at or above the field, so Round 2 has half that many places:
	 * one for each first-Round Match winner and one for each Bye Player.
	 */
	it.each([
		{ field: 2, matches: 1, byes: 0 },
		{ field: 5, matches: 1, byes: 3 },
		{ field: 8, matches: 4, byes: 0 },
		{ field: 20, matches: 4, byes: 12 },
		{ field: 26, matches: 10, byes: 6 },
		{ field: 30, matches: 14, byes: 2 },
	])(
		'draws $field Players into $matches first-Round Matches and $byes Byes, each Player once',
		({ field, matches, byes }) => {
			const tournament = expectOk(makeDraw(tonight(field, 16), seededRandom(field)));

			const draw = roundOneDraw(tournament)!;
			expect(draw.matches.length).toBe(matches);
			expect(draw.byes.length).toBe(byes);
			const drawn = [...draw.matches.flatMap((m) => m.players), ...draw.byes];
			expect(drawn.map((p) => p.name).sort()).toEqual(
				tournament.players.map((p) => p.name).sort(),
			);
		},
	);

	it('makes the same Draw every time from the same seeded random source, and a different one from another', () => {
		const night = tonight(26, 16);
		const drawWith = (seed: number) =>
			roundOneDraw(expectOk(makeDraw(night, seededRandom(seed))));

		expect(drawWith(42)).toEqual(drawWith(42));
		expect(drawWith(42)).not.toEqual(drawWith(43));
	});

	it('puts each first-Round Match on the lowest-numbered free Board', () => {
		let night = tonight(6, 0);
		for (const board of ['9', '4', '7', '2']) {
			night = expectOk(addBoard(night, board));
		}

		const draw = roundOneDraw(expectOk(makeDraw(night, seededRandom(1))))!;

		expect(draw.matches.map((m) => m.board)).toEqual([2, 4]);
	});

	it('refuses the Draw with fewer than two Players', () => {
		expect(makeDraw(tonight(1, 4), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw needs at least two Players.',
		});
	});

	it('refuses the Draw until there is a Board for every first-Round Match', () => {
		// 26 Players: 10 first-Round Matches.
		expect(makeDraw(tonight(26, 9), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw needs a Board for each of its 10 first-Round Matches, and 9 are entered.',
		});
		expect(makeDraw(tonight(2, 0), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw needs a Board for its first-Round Match, and none are entered.',
		});
		expect(makeDraw(tonight(26, 10), seededRandom(1)).ok).toBe(true);
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

	it('refuses a second Draw', () => {
		const tournament = expectOk(makeDraw(tonight(5, 4), seededRandom(1)));

		expect(makeDraw(tournament, seededRandom(2))).toEqual({
			ok: false,
			reason: 'The Draw has already been made.',
		});
	});
});

describe('starting the Tournament', () => {
	it('moves the Tournament from the Round 1 draw screen to in progress', () => {
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

describe('Boards after the Draw', () => {
	it('refuses to take out a Board with a Match on it, but takes out a free one', () => {
		// 5 Players: one first-Round Match, on Board 1.
		let tournament = expectOk(makeDraw(tonight(5, 3), seededRandom(1)));

		expect(removeBoard(tournament, 1)).toEqual({
			ok: false,
			reason: 'Board 1 has a Match on it.',
		});
		tournament = expectOk(removeBoard(tournament, 3));
		expect(tournament.boards).toEqual([1, 2]);
	});
});

// A night with the given number of Players registered and Boards 1 to `boards` entered.
const tonight = (players: number, boards: number): Tournament => {
	let tournament = newTournament();
	for (let i = 1; i <= players; i++) {
		tournament = expectOk(registerPlayer(tournament, `Player ${i}`));
	}
	for (let i = 1; i <= boards; i++) {
		tournament = expectOk(addBoard(tournament, String(i)));
	}
	return tournament;
};

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

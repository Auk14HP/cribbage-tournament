import { describe, expect, it } from 'vitest';
import {
	makeDraw,
	newTournament,
	registerPlayer,
	removePlayer,
	renamePlayer,
	roundOneDraw,
	setBoardCount,
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
		// 6 Players: two first-Round Matches.
		const draw = roundOneDraw(expectOk(makeDraw(tonight(6, 5), seededRandom(1))))!;

		expect(draw.matches.map((m) => m.board)).toEqual([1, 2]);
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
			reason: 'The Draw needs a Board for each of its 10 first-Round Matches, and there are only 9.',
		});
		expect(makeDraw(tonight(2, 0), seededRandom(1))).toEqual({
			ok: false,
			reason: 'The Draw needs a Board for its first-Round Match, and there are none.',
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

// A night with the given number of Players registered and Boards set out.
const tonight = (players: number, boards: number): Tournament => {
	let tournament = newTournament();
	for (let i = 1; i <= players; i++) {
		tournament = expectOk(registerPlayer(tournament, `Player ${i}`));
	}
	return boards === 0 ? tournament : expectOk(setBoardCount(tournament, String(boards)));
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

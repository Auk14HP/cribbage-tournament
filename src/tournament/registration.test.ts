import { describe, expect, it } from 'vitest';
import {
	createTournament,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	setScreenSeconds,
} from './index';
import { expectOk, registerPlayers, startTournament } from './testSetup';

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

		const started = startTournament({ players: 5, boards: 4 });
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

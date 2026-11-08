import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getMatchesOnBoards,
	getNowPlaying,
	hasLostIn,
	recordWinner,
	type Player,
} from './index';
import { expectOk, isPlaying, makeSeededDraw, startTournament } from './testSetup';

describe('the Winners Bracket picture', () => {
	it('puts Bye Players in Round 2, and shows who has advanced and who is still playing', () => {
		// 5 Players in an 8-place bracket: one first-Round Match, three Byes.
		let tournament = startTournament({ players: 5, boards: 4 });
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
		let tournament = startTournament({ players: 5, boards: 4 });
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
		const drawn = expectOk(makeSeededDraw({ players: 5, boards: 4 }));

		expect(getNowPlaying(drawn)).toEqual([]);
	});
});

describe('who has lost in the Winners Bracket', () => {
	it('counts only a Player beaten in a Match, not one with a Bye or still to play', () => {
		// 5 Players: Ann and Bob play the one first-Round Match; Cat has a Bye and waits for its winner.
		let tournament = startTournament({ players: 5, boards: 4 });
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

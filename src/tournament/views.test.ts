import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getMatchesOnBoards,
	hasLostIn,
	recordWinner,
	type Player,
} from './index';
import { expectOk, isPlaying, startTournament } from './testSetup';

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

import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getChampions,
	getMatchesOnBoards,
	hasLostIn,
	recordForfeit,
	recordWinner,
	type Player,
} from './index';
import {
	expectOk,
	findMatchOf,
	findOpponentIn,
	isPlaying,
	playDrawStaying,
	recordWin,
	startTournament,
} from './testSetup';

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

describe('the champions', () => {
	it('names the Winners Bracket champion once its Final is won, and the Player they beat there', () => {
		// 3 Players: Ann and Bob play the one first-Round Match; Cat has a Bye and waits in the Final.
		let tournament = startTournament({ players: 3, boards: 2 });
		const [firstMatch, final] = getMatchesOnBoards(tournament);
		const [, bob] = firstMatch.players as [Player, Player];
		const cat = final.players[0];
		tournament = expectOk(recordWinner(tournament, firstMatch.match, bob.id, 'leaving'));

		expect(getChampions(tournament)).toEqual([]);

		const bobAndCat = findMatchOf(tournament, bob);
		tournament = recordWin(tournament, bobAndCat, 'leaving', cat);

		expect(getChampions(tournament)).toEqual([
			{ bracketName: 'winners', champion: cat, finalOpponent: bob, isForfeit: false },
		]);
	});

	it('names each bracket’s champion, the Winners Bracket’s first, and says when the Final was a Forfeit', () => {
		// 4 Players on 2 Boards: both first-Round losers stay, so the Losers Bracket is one Match, its Final.
		let tournament = playDrawStaying(startTournament({ players: 4, boards: 2 }));
		const matches = getMatchesOnBoards(tournament);
		const winnersFinal = matches.find((m) => m.match.bracket === 'winners')!;
		const losersFinal = matches.find((m) => m.match.bracket === 'losers')!;
		const [losersPlayerA, losersPlayerB] = losersFinal.players as [Player, Player];
		tournament = expectOk(recordForfeit(tournament, losersFinal.match, losersPlayerA.id));

		expect(getChampions(tournament)).toEqual([
			{
				bracketName: 'losers',
				champion: losersPlayerB,
				finalOpponent: losersPlayerA,
				isForfeit: true,
			},
		]);

		const [winnersChampion] = winnersFinal.players as [Player, Player];
		const runnerUp = findOpponentIn(winnersFinal, winnersChampion);
		tournament = recordWin(tournament, winnersFinal, 'leaving');

		expect(getChampions(tournament)).toEqual([
			{
				bracketName: 'winners',
				champion: winnersChampion,
				finalOpponent: runnerUp,
				isForfeit: false,
			},
			{
				bracketName: 'losers',
				champion: losersPlayerB,
				finalOpponent: losersPlayerA,
				isForfeit: true,
			},
		]);
	});
});

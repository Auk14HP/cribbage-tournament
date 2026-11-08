import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getMatchesOnBoards,
	getNowPlaying,
	isLosersBracketOpenTo,
	recordWinner,
	undoResult,
	type Player,
} from './index';
import {
	expectOk,
	findMatchOf,
	isPlaying,
	hasBothPlayersKnown,
	listPlayersInRound,
	listSeats,
	listWaiting,
	recordWin,
	startTournament,
} from './testSetup';

describe('a Player waiting alone when Boards run short', () => {
	it('gives up their Board to a re-opened Match, so the night never stalls', () => {
		// 3 Players on 1 Board: undoing the first Match leaves the Bye Player alone on the only Board.
		let tournament = startTournament({ players: 3, boards: 1 });
		const [winner, loser] = listPlayersInRound(tournament, 1);
		const firstMatch = findMatchOf(tournament, winner);
		tournament = expectOk(recordWinner(tournament, firstMatch.match, winner.id, 'leaving'));

		tournament = expectOk(undoResult(tournament, firstMatch.match));

		// The re-opened Match can be played, so it takes the Board and the Bye Player waits for one.
		expect(listSeats(tournament)).toEqual([[1, winner.name, loser.name]]);
		expect(listWaiting(tournament)).toHaveLength(1);
		tournament = expectOk(recordWinner(tournament, firstMatch.match, loser.id, 'leaving'));
		expect(listWaiting(tournament)).toEqual([]);
		expect(getNowPlaying(tournament)).toHaveLength(1);
	});

	it('moves the Player seated latest when a Match ready to play needs a Board', () => {
		/*
		 * 10 Players on 4 Boards. The Bye pairs play first, so a Round 3 winner sits alone in the final,
		 * after another Player sat alone in Round 3. The first Round's results then make the Losers Draw,
		 * and its two Matches ready to play need more Boards than are free.
		 */
		let tournament = startTournament({ players: 10, boards: 4 });
		const findReadyInRound = (round: number) =>
			getMatchesOnBoards(tournament).find(
				(m) => m.match.round === round && hasBothPlayersKnown(m),
			);
		for (let match = findReadyInRound(2); match; match = findReadyInRound(2)) {
			tournament = recordWin(tournament, match, 'staying');
		}
		const aloneInRoundThree = getMatchesOnBoards(tournament).find(
			(m) => m.match.round === 3 && !hasBothPlayersKnown(m),
		)!;
		const seatedFirst = aloneInRoundThree.players[0];
		tournament = recordWin(tournament, findReadyInRound(3)!, 'staying');
		const [seatedLatest] = listPlayersInRound(tournament, 4);
		const isSeated = (player: Player) => {
			const seated = getMatchesOnBoards(tournament);
			return seated.some((m) => isPlaying(m, player));
		};
		expect(isSeated(seatedFirst)).toBe(true);
		expect(isSeated(seatedLatest)).toBe(true);

		for (let match = findReadyInRound(1); match; match = findReadyInRound(1)) {
			tournament = recordWin(tournament, match, 'staying');
		}

		expect(isSeated(seatedFirst)).toBe(true);
		expect(isSeated(seatedLatest)).toBe(false);
		const waitingNames = listWaiting(tournament).map(([name]) => name);
		expect(waitingNames).toContain(seatedLatest.name);
	});

	it.each([
		{ field: 3, boards: 1 },
		{ field: 7, boards: 2 },
		{ field: 12, boards: 1 },
		{ field: 21, boards: 3 },
		{ field: 26, boards: 12 },
		{ field: 32, boards: 5 },
	])(
		'always has a Match to play through $field Players on $boards Boards, undoing every third result',
		({ field, boards }) => {
			let tournament = startTournament({ players: field, boards });
			for (let recorded = 1; tournament.phase !== 'finished'; recorded++) {
				const ready = getMatchesOnBoards(tournament).find(hasBothPlayersKnown);
				expect(ready).toBeDefined();
				const [winner, loser] = ready!.players as [Player, Player];
				const answer = isLosersBracketOpenTo(tournament, loser.id) ? 'staying' : undefined;
				tournament = expectOk(recordWinner(tournament, ready!.match, winner.id, answer));
				const undone = undoResult(tournament, ready!.match);
				if (recorded % 3 === 0 && undone.ok) {
					tournament = expectOk(undone);
				}
			}
			expect(getBracketPicture(tournament, 'winners')!.champion).toBeDefined();
		},
	);
});

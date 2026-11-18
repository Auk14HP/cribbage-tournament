import { describe, expect, it } from 'vitest';
import {
	getMatchesOnBoards,
	getWaitingForBoard,
	setHomeBoard,
	swapPlayers,
	type Player,
} from './index';
import {
	createSeededRandom,
	expectOk,
	findMatchOf,
	findOpponentIn,
	hasBothPlayersKnown,
	isByePlayerIn,
	listSeats,
	listWaiting,
	makeDrawAfterHouseRules,
	makeSeededDraw,
	setUpTournament,
	startTournament,
} from './testSetup';

describe('swapping two Players on Tonight’s Draw', () => {
	it('trades their places, each Match keeping its Board, and swapping them back restores the Draw', () => {
		// 8 Players on 4 Boards: four first-Round Matches, each on a Board.
		const drawn = expectOk(makeSeededDraw({ players: 8, boards: 4 }));
		const [onBoard1, , onBoard3] = getMatchesOnBoards(drawn);
		const [ann, bob] = onBoard1.players as [Player, Player];
		const [cat, dan] = onBoard3.players as [Player, Player];

		const swapped = expectOk(swapPlayers(drawn, ann.id, dan.id));

		const [, seatsOnBoard2, , seatsOnBoard4] = listSeats(drawn);
		expect(listSeats(swapped)).toEqual([
			[1, dan.name, bob.name],
			seatsOnBoard2,
			[3, cat.name, ann.name],
			seatsOnBoard4,
		]);
		expect(swapped.losersDrawOrder).toEqual(drawn.losersDrawOrder);
		const swappedBack = expectOk(swapPlayers(swapped, dan.id, ann.id));
		expect(swappedBack).toEqual(drawn);
	});

	it('keeps a Home Board Player at their Home Board, the Match there taking the Board their new Match left', () => {
		// 8 Players on 4 Boards, the Home Board 2 for the first Player registered.
		const registered = setUpTournament({ players: 8, boards: 4 });
		const [homePlayer] = registered.players;
		const withHomeBoard = expectOk(setHomeBoard(registered, homePlayer.id, 2));
		const random = createSeededRandom(1);
		const drawn = expectOk(makeDrawAfterHouseRules(withHomeBoard, random));
		const homeMatch = findMatchOf(drawn, homePlayer);
		expect(homeMatch.board).toBe(2);
		const homeOpponent = findOpponentIn(homeMatch, homePlayer);
		const onBoard4 = getMatchesOnBoards(drawn).find((m) => m.board === 4)!;
		const [movingPlayer, staying] = onBoard4.players as [Player, Player];

		const swapped = expectOk(swapPlayers(drawn, homePlayer.id, movingPlayer.id));

		expect(findMatchOf(swapped, homePlayer)).toMatchObject({
			board: 2,
			players: [homePlayer, staying],
		});
		expect(findMatchOf(swapped, movingPlayer).board).toBe(4);
		expect(findMatchOf(swapped, homeOpponent).board).toBe(4);
	});

	it('puts the Match a Home Board Player leaves first in line for a Board, when their new Match was waiting for one', () => {
		/*
		 * 8 Players on 2 Boards, the Home Board 2 for the first Player registered: their Match takes it, another
		 * takes Board 1, and two wait for a Board.
		 */
		const registered = setUpTournament({ players: 8, boards: 2 });
		const [homePlayer] = registered.players;
		const withHomeBoard = expectOk(setHomeBoard(registered, homePlayer.id, 2));
		const random = createSeededRandom(1);
		const drawn = expectOk(makeDrawAfterHouseRules(withHomeBoard, random));
		const homeOpponent = findOpponentIn(findMatchOf(drawn, homePlayer), homePlayer);
		const [firstWaiting, secondWaiting] = getWaitingForBoard(drawn);
		const [movingPlayer, staying] = secondWaiting.players as [Player, Player];
		const onBoard1 = listSeats(drawn).find(([board]) => board === 1);

		const swapped = expectOk(swapPlayers(drawn, homePlayer.id, movingPlayer.id));

		expect(findMatchOf(swapped, homePlayer)).toMatchObject({
			board: 2,
			players: [homePlayer, staying],
		});
		expect(listSeats(swapped)).toContainEqual(onBoard1);
		const [firstWaitingPlayer, secondWaitingPlayer] = firstWaiting.players as [Player, Player];
		expect(listWaiting(swapped)).toEqual([
			[movingPlayer.name, homeOpponent.name],
			[firstWaitingPlayer.name, secondWaitingPlayer.name],
		]);
	});

	it('moves a Bye to whoever is swapped with a Bye Player, including the one waiting for a first-Round winner', () => {
		/*
		 * 5 Players on 4 Boards: one first-Round Match, a Bye Player waiting alone for its winner, and two Bye
		 * Players meeting in Round 2.
		 */
		const drawn = expectOk(makeSeededDraw({ players: 5, boards: 4 }));
		const matches = getMatchesOnBoards(drawn);
		const firstMatch = matches.find((m) => m.match.round === 1)!;
		const [ann, bob] = firstMatch.players as [Player, Player];
		const waitingAlone = matches.find((m) => !hasBothPlayersKnown(m))!;
		const cat = waitingAlone.players[0];
		const byePair = matches.find((m) => m.match.round === 2 && hasBothPlayersKnown(m))!;
		const [dan, eve] = byePair.players as [Player, Player];

		const catSwapped = expectOk(swapPlayers(drawn, cat.id, ann.id));
		const danSwapped = expectOk(swapPlayers(drawn, bob.id, dan.id));

		expect(isByePlayerIn(catSwapped, ann)).toBe(true);
		expect(isByePlayerIn(catSwapped, cat)).toBe(false);
		expect(listSeats(catSwapped)).toEqual(
			expect.arrayContaining([
				[firstMatch.board, cat.name, bob.name],
				[waitingAlone.board, ann.name, `Winner of ${cat.name} / ${bob.name}`],
			]),
		);
		expect(listSeats(danSwapped)).toEqual(
			expect.arrayContaining([
				[firstMatch.board, ann.name, dan.name],
				[waitingAlone.board, cat.name, `Winner of ${ann.name} / ${dan.name}`],
				[byePair.board, bob.name, eve.name],
			]),
		);
	});

	it('refuses before the Draw and once Started', () => {
		const registered = setUpTournament({ players: 4, boards: 2 });
		const [ann, bob] = registered.players;
		const started = startTournament({ players: 4, boards: 2 });

		expect(swapPlayers(registered, ann.id, bob.id)).toEqual({
			ok: false,
			reason: 'Make the Draw before swapping Players.',
		});
		expect(swapPlayers(started, ann.id, bob.id)).toEqual({
			ok: false,
			reason: 'Players can’t be swapped once the Tournament has started.',
		});
	});

	it('refuses two Players in the same Match, Bye Players meeting in Round 2 included, and a Player not in the Draw', () => {
		// 6 Players on 3 Boards: two first-Round Matches, and two Bye Players meeting in Round 2.
		const drawn = expectOk(makeSeededDraw({ players: 6, boards: 3 }));
		const [firstMatch, , byePair] = getMatchesOnBoards(drawn);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const [cat, dan] = byePair.players as [Player, Player];
		const sameMatchRefusal = {
			ok: false,
			reason: 'Swapping two Players in the same Match changes nothing.',
		};

		expect(swapPlayers(drawn, ann.id, bob.id)).toEqual(sameMatchRefusal);
		expect(swapPlayers(drawn, cat.id, dan.id)).toEqual(sameMatchRefusal);
		expect(swapPlayers(drawn, ann.id, ann.id)).toEqual(sameMatchRefusal);
		expect(swapPlayers(drawn, ann.id, drawn.nextPlayerId)).toEqual({
			ok: false,
			reason: 'That Player isn’t in the Draw.',
		});
	});
});

import { describe, expect, it } from 'vitest';
import {
	getBracketPicture,
	getMatchesOnBoards,
	getUndoableResults,
	getWaitingForBoard,
	hasLostIn,
	isLosersBracketOpenTo,
	recordForfeit,
	recordWinner,
	undoResult,
	type MatchOnBoard,
	type Opponent,
	type Player,
	type StayingAnswer,
	type Tournament,
} from './index';
import {
	expectOk,
	findMatchOf,
	isPlaying,
	isReadyToPlay,
	listPlayersInRound,
	listSeats,
	listWaiting,
	playDrawStaying,
	startTournament,
} from './testSetup';

/*
 * 5 Players on 4 Boards, Started, up to the Losers Draw: Ann beats Bob in the one first-Round Match, Cat
 * has a Bye and waits for Ann, and Dan beats Eve in Round 2, where they met as Byes. Bob and Eve answer
 * whether they are staying; Cat's first Match is still to come. losersMatch lists the Players of the
 * Losers Bracket's first-Round Match in the order its Draw put them.
 */
const setUpHeldPlace = (answers: readonly [StayingAnswer, StayingAnswer]) => {
	let tournament = startTournament(5, 4);
	const [ann, bob] = listPlayersInRound(tournament, 1);
	const annAndBob = findMatchOf(tournament, ann);
	const onBoards = getMatchesOnBoards(tournament).filter((m) => !isPlaying(m, ann));
	const danAndEve = onBoards.find(isReadyToPlay)!;
	const waiting = onBoards.find((m) => !isReadyToPlay(m))!;
	const cat = waiting.players[0];
	const [dan, eve] = danAndEve.players as [Player, Player];
	tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, answers[0]));
	tournament = expectOk(recordWinner(tournament, danAndEve.match, dan.id, answers[1]));
	const [[firstMatch]] = getBracketPicture(tournament, 'losers')?.rounds ?? [[]];
	const inFirstMatch = firstMatch?.players.find(Boolean);
	const losersMatch = inFirstMatch?.id === eve.id ? [eve, bob] : [bob, eve];
	return { tournament, ann, bob, cat, dan, eve, losersMatch };
};

// Whether a Player had a Bye: they aren't in any first-Round Match of the Winners Bracket.
const isByePlayerIn = (tournament: Tournament, player: Opponent): boolean => {
	const [firstRound] = getBracketPicture(tournament, 'winners')!.rounds;
	return 'name' in player && !firstRound.some((m) => m?.players.some((p) => p?.id === player.id));
};

// Whether exactly one of a Match's Players had a Bye.
const hasOneByePlayer = (tournament: Tournament, match: MatchOnBoard): boolean =>
	match.players.filter((p) => isByePlayerIn(tournament, p)).length === 1;

/*
 * The one Bye Player still to play their first Match, waiting for the first-Round Match's winner, and
 * that Match of theirs: in a Tournament whose Draw has an odd number of first-Round Matches.
 */
const findByePlayerStillToPlay = (tournament: Tournament) => {
	const firstMatch = getMatchesOnBoards(tournament).find(
		(m) => m.match.bracket === 'winners' && isReadyToPlay(m) && hasOneByePlayer(tournament, m),
	)!;
	const byePlayer = firstMatch.players.find((p) => isByePlayerIn(tournament, p)) as Player;
	return { byePlayer, firstMatch };
};

// 4 Players on 2 Boards, Started: Ann and Bob, and Cat and Dan, play the first Round.
const startFourPlayerTournament = () => {
	const started = startTournament(4, 2);
	const [ann, bob, cat, dan] = listPlayersInRound(started, 1);
	const annAndBob = findMatchOf(started, ann);
	const catAndDan = findMatchOf(started, cat);
	return { started, ann, bob, cat, dan, annAndBob, catAndDan };
};

describe('the Losers Bracket', () => {
	it('asks whether a Player losing their first Match is staying, in whichever Round, Forfeits included', () => {
		/*
		 * 5 Players: Ann and Bob play the one first-Round Match, Cat has a Bye and waits for its winner,
		 * and Dan and Eve, both Byes, meet in Round 2.
		 */
		let tournament = startTournament(5, 4);
		const [firstMatch, waiting] = getMatchesOnBoards(tournament);
		const [ann, bob] = firstMatch.players as [Player, Player];
		const cat = waiting.players[0];

		expect(isLosersBracketOpenTo(tournament, bob.id)).toBe(true);
		expect(recordWinner(tournament, firstMatch.match, ann.id)).toEqual({
			ok: false,
			reason: `Say whether ${bob.name} is staying for the Losers Bracket.`,
		});
		tournament = expectOk(recordWinner(tournament, firstMatch.match, ann.id, 'staying'));

		// Cat's first Match is in Round 2, and a Forfeit counts. Ann has played, so losing now isn't asked.
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		expect(isLosersBracketOpenTo(tournament, cat.id)).toBe(true);
		expect(isLosersBracketOpenTo(tournament, ann.id)).toBe(false);
		expect(recordForfeit(tournament, annAndCat.match, cat.id)).toEqual({
			ok: false,
			reason: `Say whether ${cat.name} is staying for the Losers Bracket.`,
		});
		expect(recordForfeit(tournament, annAndCat.match, cat.id, 'leaving').ok).toBe(true);
		expect(recordWinner(tournament, annAndCat.match, cat.id).ok).toBe(true);
	});

	it('is drawn from those staying once every Match the Draw started has a result, its Matches waiting for a Board when none is free', () => {
		/*
		 * 6 Players on 3 Boards: Ann and Bob, and Cat and Dan, play first-Round Matches; Eve and Fay, both
		 * Byes, meet in Round 2.
		 */
		let tournament = startTournament(6, 3);
		const [ann, bob, cat, dan] = listPlayersInRound(tournament, 1);
		const [eve, fay] = listPlayersInRound(tournament, 2);
		const annAndBob = findMatchOf(tournament, ann);
		const catAndDan = findMatchOf(tournament, cat);
		const eveAndFay = findMatchOf(tournament, eve);
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));
		expect(getBracketPicture(tournament, 'losers')).toBeUndefined();

		tournament = expectOk(recordWinner(tournament, eveAndFay.match, eve.id, 'staying'));

		/*
		 * The Winners Bracket holds 2 Boards: Ann and Cat's Match, and Eve waiting for the final. Bob, Dan
		 * and Fay make a Losers Bracket of one Match and a Bye. The two Boards Cat and Eve won at free, and
		 * the Losers Match, ready to play, takes the lower one ahead of Eve, who waits at the other. The Bye
		 * Player waits for a Board of their own.
		 */
		const [[losersMatch], [losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
		const byePlayer = losersFinal!.players.find(Boolean)!;
		expect([...losersMatch!.players, byePlayer].map((p) => p!.name).sort()).toEqual(
			[bob, dan, fay].map((p) => p.name).sort(),
		);
		const [losersA, losersB] = losersMatch!.players as [Player, Player];
		expect(listSeats(tournament)).toEqual([
			[1, ann.name, cat.name],
			[2, losersA.name, losersB.name],
			[3, eve.name, `Winner of ${ann.name} / ${cat.name}`],
		]);
		const losersWinner = `Winner of ${losersA.name} / ${losersB.name}`;
		expect(listWaiting(tournament)).toEqual([[byePlayer.name, losersWinner]]);

		// Board 1 frees, and the Match waiting takes it. Ann goes to Eve's Board for the final.
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		tournament = expectOk(recordWinner(tournament, annAndCat.match, ann.id));
		expect(listSeats(tournament)).toEqual([
			[1, byePlayer.name, losersWinner],
			[2, losersA.name, losersB.name],
			[3, ann.name, eve.name],
		]);
		expect(listWaiting(tournament)).toEqual([]);
	});

	it('is not played with fewer than two Players staying, and the Tournament finishes with the Winners Bracket', () => {
		// 4 Players: Ann and Bob, and Cat and Dan, play the first Round.
		const { started, ann, cat, annAndBob, catAndDan } = startFourPlayerTournament();
		let tournament = started;
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'leaving'));

		expect(getBracketPicture(tournament, 'losers')).toBeUndefined();
		expect(getMatchesOnBoards(tournament).map((m) => m.board)).toEqual([1]);
		const [final] = getMatchesOnBoards(tournament);
		tournament = expectOk(recordWinner(tournament, final.match, ann.id));
		expect(tournament.phase).toBe('finished');
	});

	it('finishes the Tournament only once both brackets have a champion', () => {
		// 4 Players: Ann beats Bob and Cat beats Dan, and Bob and Dan both stay to meet in the Losers Bracket.
		const { started, ann, bob, cat, dan, annAndBob, catAndDan } = startFourPlayerTournament();
		let tournament = started;
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));
		const winnersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		const losersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, bob, dan))!;

		tournament = expectOk(recordWinner(tournament, winnersFinal.match, cat.id));
		expect(getBracketPicture(tournament, 'winners')!.champion).toEqual(cat);
		expect(tournament.phase).toBe('inProgress');

		expect(hasLostIn(tournament, 'losers', dan.id)).toBe(false);
		tournament = expectOk(recordWinner(tournament, losersFinal.match, bob.id));
		expect(hasLostIn(tournament, 'losers', dan.id)).toBe(true);
		expect(hasLostIn(tournament, 'winners', dan.id)).toBe(true);
		expect(hasLostIn(tournament, 'losers', bob.id)).toBe(false);
		expect(getBracketPicture(tournament, 'losers')!.champion).toEqual(bob);
		expect(tournament.phase).toBe('finished');
	});

	it('holds a place for a Bye Player whose first Match is still to come, theirs if they lose and stay', () => {
		const heldPlace = setUpHeldPlace(['staying', 'staying']);
		const { ann, cat, dan, losersMatch } = heldPlace;
		let { tournament } = heldPlace;
		const [staying, other] = losersMatch.map((p) => p.name);
		expect(listSeats(tournament)).toEqual([
			[1, dan.name, `Winner of ${ann.name} / ${cat.name}`],
			[2, ann.name, cat.name],
			[3, staying, `Place held for ${cat.name}`],
			[4, other, 'Opponent to come'],
		]);
		const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		const losersFirstMatch = getMatchesOnBoards(tournament).find((m) =>
			isPlaying(m, losersMatch[0]),
		)!;
		expect(recordWinner(tournament, losersFirstMatch.match, losersMatch[0].id)).toEqual({
			ok: false,
			reason: 'That Match is still waiting for a Player.',
		});
		expect(isLosersBracketOpenTo(tournament, cat.id)).toBe(true);

		tournament = expectOk(recordWinner(tournament, annAndCat.match, ann.id, 'staying'));

		// Cat comes to the Held Place at Board 3, and Ann joins Dan for the final.
		expect(listSeats(tournament)).toEqual([
			[1, ann.name, dan.name],
			[3, cat.name, staying],
			[4, other, `Winner of ${cat.name} / ${staying}`],
		]);
	});

	it.each([
		{ result: 'wins their first Match', catWins: true, answer: undefined },
		{
			result: 'loses their first Match and leaves',
			catWins: false,
			answer: 'leaving' as const,
		},
	])(
		'gives the Held Place’s opponent a Bye when the Bye Player $result',
		({ catWins, answer }) => {
			const heldPlace = setUpHeldPlace(['staying', 'staying']);
			const { ann, cat, dan, losersMatch } = heldPlace;
			let { tournament } = heldPlace;
			const [byeNow, byeAtDraw] = losersMatch.map((p) => p.name);
			const annAndCat = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
			const winner = catWins ? cat : ann;

			tournament = expectOk(recordWinner(tournament, annAndCat.match, winner.id, answer));

			// Board 3 frees: its Player goes on to meet the Bye Player waiting at Board 4.
			expect(listSeats(tournament)).toEqual([
				[1, winner.name, dan.name],
				[4, byeNow, byeAtDraw],
			]);
			// Its first Round is now all Byes, so the bracket starts at the final.
			const [[losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
			expect(losersFinal!.players.map((p) => p!.name)).toEqual([byeNow, byeAtDraw]);
		},
	);

	it('refuses to undo a first-Match result once the Losers Bracket is drawn, and lists only the others', () => {
		// 4 Players: Ann beats Bob and Cat beats Dan, and Bob and Dan both stay to meet in the Losers Bracket.
		const { started, ann, bob, cat, dan, annAndBob, catAndDan } = startFourPlayerTournament();
		let tournament = started;
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));

		expect(undoResult(tournament, annAndBob.match)).toEqual({
			ok: false,
			reason: 'That result can’t be undone: the Losers Bracket has been drawn.',
		});
		expect(getUndoableResults(tournament)).toEqual([]);

		const losersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, bob, dan))!;
		const winnersFinal = getMatchesOnBoards(tournament).find((m) => isPlaying(m, ann, cat))!;
		tournament = expectOk(recordWinner(tournament, losersFinal.match, dan.id));
		tournament = expectOk(recordWinner(tournament, winnersFinal.match, ann.id));
		const undoable = getUndoableResults(tournament).map((r) => [r.winner.name, r.loser.name]);
		expect(undoable).toEqual([
			[ann.name, cat.name],
			[dan.name, bob.name],
		]);
		expect(undoResult(tournament, losersFinal.match).ok).toBe(true);
	});

	it('lets a first-Match result be undone when no Losers Bracket was drawn, drawing one if two then stay', () => {
		// 4 Players: Ann beats Bob, who stays, and Cat beats Dan, who leaves: no Losers Bracket.
		const { started, ann, bob, cat, dan, annAndBob, catAndDan } = startFourPlayerTournament();
		let tournament = started;
		tournament = expectOk(recordWinner(tournament, annAndBob.match, ann.id, 'staying'));
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'leaving'));

		tournament = expectOk(undoResult(tournament, catAndDan.match));
		expect(isLosersBracketOpenTo(tournament, dan.id)).toBe(true);
		tournament = expectOk(recordWinner(tournament, catAndDan.match, cat.id, 'staying'));

		const [[losersFinal]] = getBracketPicture(tournament, 'losers')!.rounds;
		expect(losersFinal!.players.map((p) => p!.name).sort()).toEqual(
			[bob.name, dan.name].sort(),
		);
		expect(getMatchesOnBoards(tournament).some((m) => isPlaying(m, ann, cat))).toBe(true);
	});

	it('leaves out a first Round nobody plays in, once a Held Place becomes a Bye', () => {
		/*
		 * 9 Players: one first-Round Match, whose winner meets Cat, a Bye Player, and three Round 2 Matches
		 * between Bye Players. Their four losers stay, so with Cat's Held Place the Losers Bracket has eight
		 * places: one first-Round Match, against the Held Place, and three Byes.
		 */
		let tournament = playDrawStaying(startTournament(9, 5));
		expect(getBracketPicture(tournament, 'losers')!.rounds.map((r) => r.length)).toEqual([
			4, 2, 1,
		]);
		const { byePlayer: cat, firstMatch: catsMatch } = findByePlayerStillToPlay(tournament);

		tournament = expectOk(recordWinner(tournament, catsMatch.match, cat.id));

		// Cat won, so every first-Round place is a Bye, and the bracket starts at its Round 2.
		const { rounds } = getBracketPicture(tournament, 'losers')!;
		expect(rounds.map((r) => r.length)).toEqual([2, 1]);
		expect(rounds[0].every((m) => m!.players.every(Boolean))).toBe(true);
	});

	it.each([
		{ result: 'loses and stays', catWins: false },
		{ result: 'wins', catWins: true },
	])(
		'plays through a Held Place to both champions when the Bye Player $result',
		({ catWins }) => {
			// 9 Players: four losers stay, and Cat, the Bye Player still to play, has a place held.
			let tournament = playDrawStaying(startTournament(9, 5));
			const { byePlayer: cat } = findByePlayerStillToPlay(tournament);
			for (;;) {
				const ready = getMatchesOnBoards(tournament).find(isReadyToPlay);
				if (!ready) {
					break;
				}
				const [a, b] = ready.players as [Player, Player];
				// Cat's Winners Bracket Matches go the way this case asks, every other to its first-named Player.
				const otherPlayer = a.id === cat.id ? b : a;
				const isCatsMatch = ready.match.bracket === 'winners' && isPlaying(ready, cat);
				const catsResult = catWins ? cat : otherPlayer;
				const winner = isCatsMatch ? catsResult : a;
				const loser = winner === a ? b : a;
				const answer = isLosersBracketOpenTo(tournament, loser.id) ? 'staying' : undefined;
				tournament = expectOk(recordWinner(tournament, ready.match, winner.id, answer));
			}
			expect(tournament.phase).toBe('finished');
			expect(hasLostIn(tournament, 'winners', cat.id)).toBe(!catWins);
			expect(getBracketPicture(tournament, 'losers')!.champion).toBeDefined();
		},
	);

	it('makes the Losers Draw at random, the same every time from the same seeded random source', () => {
		const drawLosersWith = (seed: number) => {
			const tournament = playDrawStaying(startTournament(26, 13, seed));
			return getBracketPicture(tournament, 'losers')!.rounds[0];
		};

		expect(drawLosersWith(42)).toEqual(drawLosersWith(42));
		expect(drawLosersWith(42)).not.toEqual(drawLosersWith(43));
		// Not in the order the Players registered.
		const drawnIds = drawLosersWith(42).flatMap((m) => m?.players.map((p) => p!.id) ?? []);
		expect(drawnIds).not.toEqual([...drawnIds].sort((a, b) => a - b));
	});

	it('seats Matches ready to play ahead of a Player waiting alone, and gives each Board that frees to the queue, whichever its bracket', () => {
		/*
		 * 10 Players on 5 Boards: two first-Round Matches, and three Round 2 Matches between Bye Players.
		 * Once all five are played, the Winners Bracket holds 3 Boards, and the five losers, all staying,
		 * make a Losers Bracket of one first-Round Match and three Byes. Its first-Round Match and the Bye
		 * pair's Match, both ready to play, take the 2 free Boards ahead of the Bye Player waiting for a
		 * winner, though that Bye Player comes first in the bracket.
		 */
		let tournament = playDrawStaying(startTournament(10, 5));
		const losersOnBoards = getMatchesOnBoards(tournament).filter(
			(m) => m.match.bracket === 'losers',
		);
		expect(losersOnBoards).toHaveLength(2);
		expect(losersOnBoards.every(isReadyToPlay)).toBe(true);
		const [waitingLosers] = getWaitingForBoard(tournament);
		expect(waitingLosers.match.bracket).toBe('losers');
		const losersFirstMatch = losersOnBoards.find((m) => m.match.round === 1)!;
		const [losersA, losersB] = losersFirstMatch.players as [Player, Player];
		expect(listWaiting(tournament)).toEqual([
			[waitingLosers.players[0].name, `Winner of ${losersA.name} / ${losersB.name}`],
		]);
		// Two Bye Pairs' winners meet, while the other semi-final's Player waits for an opponent.
		const ready = getMatchesOnBoards(tournament).find(
			(m) =>
				m.match.bracket === 'winners' &&
				m.players.every((p) => isByePlayerIn(tournament, p)),
		)!;
		const winner = ready.players[0] as Player;

		tournament = expectOk(recordWinner(tournament, ready.match, winner.id));

		// The waiting Losers Match takes the Board, and the winner's next Match waits behind it.
		expect(getMatchesOnBoards(tournament)).toContainEqual(
			expect.objectContaining({ board: ready.board, match: waitingLosers.match }),
		);
		expect(listWaiting(tournament)).toEqual([[winner.name, 'Opponent to come']]);
		// The first-Round winners' Match, its Players both known.
		const roundTwo = getMatchesOnBoards(tournament).find(
			(m) =>
				m.match.bracket === 'winners' &&
				m.players.every((p) => 'name' in p && !isByePlayerIn(tournament, p)),
		)!;

		tournament = expectOk(recordWinner(tournament, roundTwo.match, roundTwo.players[0].id));

		const final = getMatchesOnBoards(tournament).find((m) => isPlaying(m, winner))!;
		expect(final.board).toBe(roundTwo.board);
		expect(listWaiting(tournament)).toEqual([]);
	});

	it('waits for the Held Place when only one Player is staying, and is not played with none', () => {
		const one = setUpHeldPlace(['staying', 'leaving']);
		expect(getBracketPicture(one.tournament, 'losers')).toBeUndefined();
		expect(isLosersBracketOpenTo(one.tournament, one.cat.id)).toBe(true);
		const annAndCat = getMatchesOnBoards(one.tournament).find((m) =>
			isPlaying(m, one.ann, one.cat),
		)!;
		const catStays = expectOk(
			recordWinner(one.tournament, annAndCat.match, one.ann.id, 'staying'),
		);
		const [[losersFinal]] = getBracketPicture(catStays, 'losers')!.rounds;
		expect(losersFinal!.players.map((p) => p!.name).sort()).toEqual(
			[one.bob.name, one.cat.name].sort(),
		);
		const catWins = expectOk(recordWinner(one.tournament, annAndCat.match, one.cat.id));
		expect(getBracketPicture(catWins, 'losers')).toBeUndefined();
		expect(listSeats(catWins)).toEqual([[1, one.cat.name, one.dan.name]]);

		const none = setUpHeldPlace(['leaving', 'leaving']);
		expect(isLosersBracketOpenTo(none.tournament, none.cat.id)).toBe(false);
		const noneAnnAndCat = getMatchesOnBoards(none.tournament).find((m) =>
			isPlaying(m, none.ann, none.cat),
		)!;
		expect(recordWinner(none.tournament, noneAnnAndCat.match, none.ann.id).ok).toBe(true);
	});
});

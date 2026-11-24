import { describe, expect, it } from 'vitest';
import {
	chooseTvScreen,
	createTournament,
	findTvScreenOnShow,
	getMatchesOnBoards,
	listTvScreens,
	recordWinner,
	restartTvCycleIfDue,
	setScreenSeconds,
	start,
	undoResult,
	type Player,
	type Tournament,
	type TvScreen,
} from './index';
import type { Result } from '../result';
import { expectOk, makeSeededDraw, playDrawStaying, startTournament } from './testSetup';

describe('choosing what the TV shows', () => {
	it('is Auto until the Organizer chooses a screen', () => {
		expect(createTournament().tvChoice).toBe('auto');
		expect(startTournament({ players: 4, boards: 2 }).tvChoice).toBe('auto');
	});

	it('is refused before Start', () => {
		const registering = createTournament();
		const drawn = expectOk(makeSeededDraw({ players: 4, boards: 2 }));
		const refusal = { ok: false, reason: 'Press Start before choosing what the TV shows.' };

		expect(chooseTvScreen(registering, 'winnersBracket')).toEqual(refusal);
		expect(chooseTvScreen(drawn, 'auto')).toEqual(refusal);
	});

	it('offers only the Winners Bracket while in progress before a Losers Bracket, and holds it when chosen', () => {
		const started = startTournament({ players: 4, boards: 2 });
		expect(listTvScreens(started)).toEqual(['winnersBracket']);

		const holding = expectOk(chooseTvScreen(started, 'winnersBracket'));
		expect(holding.tvChoice).toBe('winnersBracket');
		const auto = expectOk(chooseTvScreen(holding, 'auto'));
		expect(auto.tvChoice).toBe('auto');
	});

	it('offers the Losers Bracket once it is drawn', () => {
		const started = startTournament({ players: 6, boards: 3 });
		const playing = playDrawStaying(started);

		expect(chooseTvScreen(started, 'losersBracket')).toEqual({
			ok: false,
			reason: 'The TV has no Losers Bracket screen right now.',
		});
		expect(listTvScreens(playing)).toEqual(['winnersBracket', 'losersBracket']);
		expect(expectOk(chooseTvScreen(playing, 'losersBracket')).tvChoice).toBe('losersBracket');
	});

	it('refuses a screen the TV doesn’t have in the current phase', () => {
		const started = startTournament({ players: 4, boards: 2 });
		const finished = finishTwoPlayerTournament();

		expect(chooseTvScreen(started, 'champion')).toEqual({
			ok: false,
			reason: 'The TV has no Champion screen right now.',
		});
		expect(listTvScreens(finished)).toEqual(['champion', 'winnersBracket']);
	});
});

describe('a Held screen when the Tournament finishes or is undone', () => {
	it('stays held when the finished Tournament still has it', () => {
		const started = startTwoPlayerTournament();
		const holding = expectOk(chooseTvScreen(started, 'winnersBracket'));

		const finished = winFinal(holding);

		expect(finished.phase).toBe('finished');
		expect(finished.tvChoice).toBe('winnersBracket');
	});

	it('falls back to Auto when undoing the final takes the champion screen away', () => {
		const finished = finishTwoPlayerTournament();
		const holding = expectOk(chooseTvScreen(finished, 'champion'));
		const [final] = holding.results;

		const undone = expectOk(undoResult(holding, final.match));

		expect(undone.phase).toBe('inProgress');
		expect(undone.tvChoice).toBe('auto');
	});
});

describe('the TV screen on show', () => {
	it('is none before Start, when the TV shows its own screens', () => {
		const drawn = expectOk(makeSeededDraw({ players: 4, boards: 2 }));

		expect(findScreenOnShowAfter(drawn, 0)).toBeUndefined();
	});

	it('is a phase’s only screen with no countdown, however long it shows', () => {
		const drawn = expectOk(makeSeededDraw({ players: 4, boards: 2 }));
		const started = runCommand(drawn, start(drawn), 0);

		expect(findScreenOnShowAfter(started, 0)).toEqual({ screen: 'winnersBracket' });
		expect(findScreenOnShowAfter(started, 95)).toEqual({ screen: 'winnersBracket' });
	});

	it('on Auto cycles the phase’s screens from the clock, each for the seconds per TV screen, cycle after cycle', () => {
		const playing = playIntoLosersBracketAt(0);

		expect(findScreenOnShowAfter(playing, 0)).toEqual(makeScreenOnShow('winnersBracket', 20));
		expect(findScreenOnShowAfter(playing, 19)).toEqual(makeScreenOnShow('winnersBracket', 1));
		expect(findScreenOnShowAfter(playing, 20)).toEqual(makeScreenOnShow('losersBracket', 20));
		expect(findScreenOnShowAfter(playing, 39.5)).toEqual(
			makeScreenOnShow('losersBracket', 0.5),
		);
		expect(findScreenOnShowAfter(playing, 40)).toEqual(makeScreenOnShow('winnersBracket', 20));
		expect(findScreenOnShowAfter(playing, 105)).toEqual(makeScreenOnShow('losersBracket', 15));
	});

	it('is the Held screen with no countdown, however long it is held', () => {
		const playing = playIntoLosersBracketAt(0);
		const holding = runCommand(playing, chooseTvScreen(playing, 'losersBracket'), 5);

		expect(findScreenOnShowAfter(holding, 5)).toEqual({ screen: 'losersBracket' });
		expect(findScreenOnShowAfter(holding, 21)).toEqual({ screen: 'losersBracket' });
	});

	it('on Auto chosen again starts the cycle from the Held screen, with a fresh screen time', () => {
		const playing = playIntoLosersBracketAt(0);
		const holding = runCommand(playing, chooseTvScreen(playing, 'losersBracket'), 5);
		const auto = runCommand(holding, chooseTvScreen(holding, 'auto'), 50);

		expect(findScreenOnShowAfter(auto, 50)).toEqual(makeScreenOnShow('losersBracket', 20));
		expect(findScreenOnShowAfter(auto, 69)).toEqual(makeScreenOnShow('losersBracket', 1));
		expect(findScreenOnShowAfter(auto, 70)).toEqual(makeScreenOnShow('winnersBracket', 20));
	});

	it('keeps its cycle when Auto is chosen while already on Auto', () => {
		const playing = playIntoLosersBracketAt(0);
		const chosenAgain = runCommand(playing, chooseTvScreen(playing, 'auto'), 30);

		expect(findScreenOnShowAfter(chosenAgain, 30)).toEqual(
			makeScreenOnShow('losersBracket', 10),
		);
	});

	it('on a new seconds per TV screen starts the cycle again from the screen on show, for the new time', () => {
		const playing = playIntoLosersBracketAt(0);
		const quicker = runCommand(playing, setScreenSeconds(playing, '5'), 30);

		expect(findScreenOnShowAfter(quicker, 30)).toEqual(makeScreenOnShow('losersBracket', 5));
		expect(findScreenOnShowAfter(quicker, 34)).toEqual(makeScreenOnShow('losersBracket', 1));
		expect(findScreenOnShowAfter(quicker, 35)).toEqual(makeScreenOnShow('winnersBracket', 5));
	});

	it('on a new phase starts the cycle from the phase’s first screen', () => {
		const started = startTwoPlayerTournament();
		const finished = saveAt(started, winFinal(started), 37);

		expect(findScreenOnShowAfter(finished, 37)).toEqual(makeScreenOnShow('champion', 20));
		expect(findScreenOnShowAfter(finished, 57)).toEqual(makeScreenOnShow('winnersBracket', 20));

		const [final] = finished.results;
		const undone = runCommand(finished, undoResult(finished, final.match), 63);
		expect(findScreenOnShowAfter(undone, 63)).toEqual({ screen: 'winnersBracket' });
	});

	it('keeps its cycle through a command that changes none of its screens, choice or time', () => {
		const playing = playIntoLosersBracketAt(0);
		const [match] = getMatchesOnBoards(playing).filter((m) => m.match.bracket === 'losers');
		const [winner] = match.players as [Player, Player];
		const recorded = runCommand(playing, recordWinner(playing, match.match, winner.id), 30);

		expect(findScreenOnShowAfter(recorded, 30)).toEqual(makeScreenOnShow('losersBracket', 10));
	});
});

// When Auto's cycle is tested from: the evening of the brewery's first Tournament.
const testStart = new Date(2026, 10, 9, 19, 30).getTime();

// The clock's time the given seconds after the test's start.
const getTimeAfter = (seconds: number): number => testStart + seconds * 1000;

// The screen on show the given seconds after the test's start.
const findScreenOnShowAfter = (tournament: Tournament, seconds: number) =>
	findTvScreenOnShow(tournament, getTimeAfter(seconds));

// The screen on show on Auto, with the seconds left on it.
const makeScreenOnShow = (screen: TvScreen, secondsLeft: number) => ({ screen, secondsLeft });

/*
 * The Tournament made from the one before, as the Organizer's window saves it the given seconds after the
 * test's start: with Auto's cycle started again if the change calls for it.
 */
const saveAt = (before: Tournament, after: Tournament, seconds: number): Tournament =>
	restartTvCycleIfDue({ before, after, now: getTimeAfter(seconds) });

// The Tournament a command made, saved as saveAt does.
const runCommand = (before: Tournament, outcome: Result<Tournament>, seconds: number): Tournament =>
	saveAt(before, expectOk(outcome), seconds);

/*
 * 6 Players on 3 Boards, Started, the Draw's three Matches played and their losers staying, the last of them
 * the given seconds after the test's start: the TV cycles the Winners Bracket and the Losers Bracket from then.
 */
const playIntoLosersBracketAt = (seconds: number): Tournament => {
	const started = startTournament({ players: 6, boards: 3 });
	return saveAt(started, playDrawStaying(started), seconds);
};

// Two Players, Started: their one Match is the final.
const startTwoPlayerTournament = (): Tournament => startTournament({ players: 2, boards: 1 });

// Records the final's winner, its first-named Player, with no Losers Bracket to play.
const winFinal = (tournament: Tournament): Tournament => {
	const [final] = getMatchesOnBoards(tournament);
	const [champion] = final.players as [Player, Player];
	return expectOk(recordWinner(tournament, final.match, champion.id, 'leaving'));
};

const finishTwoPlayerTournament = (): Tournament => winFinal(startTwoPlayerTournament());

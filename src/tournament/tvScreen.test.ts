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

		expect(findScreenOnShowAt(drawn, { atSecond: 0 })).toBeUndefined();
	});

	it('is a phase’s only screen with no countdown, however long it shows', () => {
		const drawn = expectOk(makeSeededDraw({ players: 4, boards: 2 }));
		const started = runCommand(drawn, start(drawn), { atSecond: 0 });

		expect(findScreenOnShowAt(started, { atSecond: 0 })).toEqual({ screen: 'winnersBracket' });
		expect(findScreenOnShowAt(started, { atSecond: 95 })).toEqual({ screen: 'winnersBracket' });
	});

	it('on Auto cycles the phase’s screens from the clock, each for the seconds per TV screen, cycle after cycle', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });

		expect(findScreenOnShowAt(playing, { atSecond: 0 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 20,
		});
		expect(findScreenOnShowAt(playing, { atSecond: 19 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 1,
		});
		expect(findScreenOnShowAt(playing, { atSecond: 20 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 20,
		});
		expect(findScreenOnShowAt(playing, { atSecond: 39.5 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 0.5,
		});
		expect(findScreenOnShowAt(playing, { atSecond: 40 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 20,
		});
		expect(findScreenOnShowAt(playing, { atSecond: 105 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 15,
		});
	});

	it('is the Held screen with no countdown, however long it is held', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });
		const holding = runCommand(playing, chooseTvScreen(playing, 'losersBracket'), {
			atSecond: 5,
		});

		expect(findScreenOnShowAt(holding, { atSecond: 5 })).toEqual({ screen: 'losersBracket' });
		expect(findScreenOnShowAt(holding, { atSecond: 21 })).toEqual({ screen: 'losersBracket' });
	});

	it('on Auto chosen again starts the cycle from the Held screen, with a fresh screen time', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });
		const holding = runCommand(playing, chooseTvScreen(playing, 'losersBracket'), {
			atSecond: 5,
		});
		const auto = runCommand(holding, chooseTvScreen(holding, 'auto'), { atSecond: 50 });

		expect(findScreenOnShowAt(auto, { atSecond: 50 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 20,
		});
		expect(findScreenOnShowAt(auto, { atSecond: 69 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 1,
		});
		expect(findScreenOnShowAt(auto, { atSecond: 70 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 20,
		});
	});

	it('keeps its cycle when Auto is chosen while already on Auto', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });
		const chosenAgain = runCommand(playing, chooseTvScreen(playing, 'auto'), { atSecond: 30 });

		expect(findScreenOnShowAt(chosenAgain, { atSecond: 30 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 10,
		});
	});

	it('on a new seconds per TV screen starts the cycle again from the screen on show, for the new time', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });
		const quicker = runCommand(playing, setScreenSeconds(playing, '5'), { atSecond: 30 });

		expect(findScreenOnShowAt(quicker, { atSecond: 30 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 5,
		});
		expect(findScreenOnShowAt(quicker, { atSecond: 34 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 1,
		});
		expect(findScreenOnShowAt(quicker, { atSecond: 35 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 5,
		});
	});

	it('on a new phase starts the cycle from the phase’s first screen', () => {
		const started = startTwoPlayerTournament();
		const finished = saveAtSecond(started, winFinal(started), { atSecond: 37 });

		expect(findScreenOnShowAt(finished, { atSecond: 37 })).toEqual({
			screen: 'champion',
			secondsLeft: 20,
		});
		expect(findScreenOnShowAt(finished, { atSecond: 56 })).toEqual({
			screen: 'champion',
			secondsLeft: 1,
		});
		expect(findScreenOnShowAt(finished, { atSecond: 57 })).toEqual({
			screen: 'winnersBracket',
			secondsLeft: 20,
		});

		const [final] = finished.results;
		const undone = runCommand(finished, undoResult(finished, final.match), { atSecond: 63 });
		expect(findScreenOnShowAt(undone, { atSecond: 63 })).toEqual({ screen: 'winnersBracket' });
	});

	it('still moves on when saved without a cycle start', () => {
		const started = startTournament({ players: 6, boards: 3 });
		const playing: Tournament = { ...playDrawStaying(started), tvCycleStart: undefined };
		const screenTime = { atSecond: 20 };

		const onShow = findScreenOnShowAt(playing, { atSecond: 0 });
		const onShowLater = findScreenOnShowAt(playing, screenTime);

		expect(onShowLater?.screen).not.toBe(onShow?.screen);
	});

	it('keeps its cycle through a command that changes none of its screens, choice or time', () => {
		const playing = playIntoLosersBracket({ atSecond: 0 });
		const [match] = getMatchesOnBoards(playing).filter((m) => m.match.bracket === 'losers');
		const [winner] = match.players as [Player, Player];
		const recorded = runCommand(playing, recordWinner(playing, match.match, winner.id), {
			atSecond: 30,
		});

		expect(findScreenOnShowAt(recorded, { atSecond: 30 })).toEqual({
			screen: 'losersBracket',
			secondsLeft: 10,
		});
	});
});

// When Auto's cycle is tested from: the evening of the brewery's first Tournament.
const testStart = new Date(2026, 10, 9, 19, 30).getTime();

// A time in a test, as the seconds after the test's start.
interface TestTime {
	readonly atSecond: number;
}

// The clock's time at the test's time.
const getClockTime = ({ atSecond }: TestTime): number => testStart + atSecond * 1000;

// The screen on show at the test's time.
const findScreenOnShowAt = (tournament: Tournament, time: TestTime) =>
	findTvScreenOnShow(tournament, getClockTime(time));

/*
 * The Tournament made from the one before, as the Organizer's window saves it at the test's time: with Auto's
 * cycle started again if the change calls for it.
 */
const saveAtSecond = (before: Tournament, after: Tournament, time: TestTime): Tournament =>
	restartTvCycleIfDue({ before, after, now: getClockTime(time) });

// The Tournament a command made, saved as saveAtSecond does.
const runCommand = (before: Tournament, outcome: Result<Tournament>, time: TestTime): Tournament =>
	saveAtSecond(before, expectOk(outcome), time);

/*
 * 6 Players on 3 Boards, Started, the Draw's three Matches played and their losers staying, the last of them
 * at the test's time: the TV cycles the Winners Bracket and the Losers Bracket from then.
 */
const playIntoLosersBracket = (time: TestTime): Tournament => {
	const started = startTournament({ players: 6, boards: 3 });
	return saveAtSecond(started, playDrawStaying(started), time);
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

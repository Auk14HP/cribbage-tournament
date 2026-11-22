import { describe, expect, it } from 'vitest';
import {
	chooseTvScreen,
	createTournament,
	getMatchesOnBoards,
	listTvScreens,
	recordWinner,
	undoResult,
	type Player,
	type Tournament,
} from './index';
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

// Two Players, Started: their one Match is the final.
const startTwoPlayerTournament = (): Tournament => startTournament({ players: 2, boards: 1 });

// Records the final's winner, its first-named Player, with no Losers Bracket to play.
const winFinal = (tournament: Tournament): Tournament => {
	const [final] = getMatchesOnBoards(tournament);
	const [champion] = final.players as [Player, Player];
	return expectOk(recordWinner(tournament, final.match, champion.id, 'leaving'));
};

const finishTwoPlayerTournament = (): Tournament => winFinal(startTwoPlayerTournament());

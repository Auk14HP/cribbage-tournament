/*
 * What the TV shows once Started: the screens of the current phase, and the Organizer's choice of Auto or a
 * Held screen.
 */
import type { Result } from '../result';
import type { Tournament, TvChoice, TvScreen } from './types';

// The names the Organizer knows each screen by.
export const tvScreenNames: Record<TvScreen, string> = {
	winnersBracket: 'Winners Bracket',
	losersBracket: 'Losers Bracket',
	nowPlaying: 'Now playing',
	champion: 'Champion',
};

/*
 * Returns the screens the TV cycles through on Auto, in the order it shows them: during play the brackets,
 * then Now playing; once finished the champions first, then the brackets. The Losers Bracket's screen is
 * there once it is drawn. None before Start, when the TV shows its own screens.
 */
export const listTvScreens = (tournament: Tournament): readonly TvScreen[] => {
	const bracketScreens: TvScreen[] = tournament.losersBracket
		? ['winnersBracket', 'losersBracket']
		: ['winnersBracket'];
	switch (tournament.phase) {
		case 'inProgress':
			return [...bracketScreens, 'nowPlaying'];
		case 'finished':
			return ['champion', ...bracketScreens];
		default:
			return [];
	}
};

// Sets the TV to Auto, or holds one of the current phase's screens on it.
export const chooseTvScreen = (tournament: Tournament, choice: TvChoice): Result<Tournament> => {
	const screens = listTvScreens(tournament);
	if (screens.length === 0) {
		return { ok: false, reason: 'Press Start before choosing what the TV shows.' };
	}
	if (choice !== 'auto' && !screens.includes(choice)) {
		return { ok: false, reason: `The TV has no ${tvScreenNames[choice]} screen right now.` };
	}
	return { ok: true, value: { ...tournament, tvChoice: choice } };
};

/*
 * Returns the Tournament with its Held screen kept if the current phase still has that screen, or else set
 * back to Auto.
 */
export const dropHeldScreenIfGone = (tournament: Tournament): Tournament =>
	tournament.tvChoice === 'auto' || listTvScreens(tournament).includes(tournament.tvChoice)
		? tournament
		: { ...tournament, tvChoice: 'auto' };

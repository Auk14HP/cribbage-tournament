/*
 * What the TV shows once Started: the screens of the current phase, and the Organizer's choice of Auto or a
 * Held screen.
 */
import type { Result } from '../result';
import type { Tournament, TvChoice, TvCycleStart, TvScreen } from './types';

// The names the Organizer knows each screen by.
export const tvScreenNames: Record<TvScreen, string> = {
	winnersBracket: 'Winners Bracket',
	losersBracket: 'Losers Bracket',
	champion: 'Champion',
};

/*
 * Returns the screens the TV cycles through on Auto, in the order it shows them: during play the brackets;
 * once finished the champions first, then the brackets. The Losers Bracket's screen is
 * there once it is drawn. None before Start, when the TV shows its own screens.
 */
export const listTvScreens = (tournament: Tournament): readonly TvScreen[] => {
	const bracketScreens: TvScreen[] = tournament.losersDraw
		? ['winnersBracket', 'losersBracket']
		: ['winnersBracket'];
	switch (tournament.phase) {
		case 'inProgress':
			return bracketScreens;
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

/*
 * The screen the TV has on show, and on Auto the seconds left before it moves on. A Held screen, or a phase's
 * only screen, has no seconds left: there is nothing to count down to.
 */
export interface TvScreenOnShow {
	readonly screen: TvScreen;
	readonly secondsLeft?: number;
}

/*
 * Returns the screen the TV has on show at the given time, in milliseconds since 1970 as Date.now() gives, or
 * undefined before Start, when the TV shows its own screens. On Auto the cycle runs from the Tournament's
 * cycle start: each screen in turn, each for the seconds per TV screen, from the screen it started from.
 */
export const findTvScreenOnShow = (
	tournament: Tournament,
	now: number,
): TvScreenOnShow | undefined => {
	const screens = listTvScreens(tournament);
	if (screens.length === 0) {
		return undefined;
	}
	if (tournament.tvChoice !== 'auto') {
		return { screen: tournament.tvChoice };
	}
	if (screens.length === 1) {
		return { screen: screens[0] };
	}
	/*
	 * A Tournament saved without a cycle start, which only a save that skips restartTvCycleIfDue makes, cycles
	 * from a fixed start, so every window still agrees and the cycle still moves on.
	 */
	const cycleStart = tournament.tvCycleStart ?? { time: 0, screen: screens[0] };
	const screenTime = tournament.screenSeconds * 1000;
	// A cycle start later than the clock, from a window whose clock runs ahead, counts as just started.
	const elapsed = Math.max(now - cycleStart.time, 0);
	const screensShown = Math.floor(elapsed / screenTime);
	// A cycle start the phase no longer has, which a new phase replaces, counts as its first.
	const firstIndex = Math.max(screens.indexOf(cycleStart.screen), 0);
	const screen = screens[(firstIndex + screensShown) % screens.length];
	return { screen, secondsLeft: (screenTime - (elapsed % screenTime)) / 1000 };
};

// Whether the screens the TV cycles, or their order, differ between the two Tournaments.
const haveTvScreensChanged = (before: Tournament, after: Tournament): boolean => {
	const screensBefore = listTvScreens(before);
	const screensAfter = listTvScreens(after);
	return (
		screensBefore.length !== screensAfter.length ||
		screensBefore.some((screen, i) => screen !== screensAfter[i])
	);
};

/*
 * Returns the Tournament a command made, with Auto's cycle started again at the given time if the command
 * calls for it: from the first screen when the screens the TV cycles change, as a new phase or the Losers Draw
 * changes them; from the Held screen when Auto is chosen; and from the screen on show when the seconds per TV
 * screen change, so the new time shows at once. Otherwise the cycle carries on as before.
 */
export const restartTvCycleIfDue = ({
	before,
	after,
	now,
}: {
	before: Tournament;
	after: Tournament;
	now: number;
}): Tournament => {
	const screens = listTvScreens(after);
	const restartFrom = (screen: TvScreen): Tournament => ({
		...after,
		tvCycleStart: { time: now, screen } satisfies TvCycleStart,
	});
	// Every new phase changes the screens, so a new phase starts the cycle again here too.
	if (haveTvScreensChanged(before, after)) {
		return screens.length === 0
			? { ...after, tvCycleStart: undefined }
			: restartFrom(screens[0]);
	}
	if (before.tvChoice !== 'auto' && after.tvChoice === 'auto') {
		return restartFrom(before.tvChoice);
	}
	if (before.screenSeconds !== after.screenSeconds) {
		const onShow = findTvScreenOnShow(before, now);
		return onShow ? restartFrom(onShow.screen) : after;
	}
	return after;
};

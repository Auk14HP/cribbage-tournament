// What both the TV and the Organizer's thumbnail of it need to draw the TV screen on show.
import { useEffect, useState, type CSSProperties } from 'react';
import { findTvScreenOnShow, type Tournament, type TvScreenOnShow } from '../tournament';

/*
 * Makes a box the TV screen's frame: the screen's sizes are hundredths of its width and height. The box needs
 * a height of its own, since what it holds can't set it.
 */
export const tvFrame = '[container-type:size]';

/*
 * Returns the screen the TV has on show, worked out from the Tournament and the clock, or undefined before
 * Start. On Auto it looks at the clock again the moment the screen's time is up, so the next screen shows.
 */
export const useTvScreenOnShow = (tournament: Tournament): TvScreenOnShow | undefined => {
	// The time the screen on show was last worked out at.
	const [now, setNow] = useState(() => Date.now());
	const onShow = findTvScreenOnShow(tournament, now);
	const secondsLeft = onShow?.secondsLeft;
	const screenEnd = secondsLeft === undefined ? undefined : now + secondsLeft * 1000;
	useEffect(() => {
		if (screenEnd === undefined) {
			return;
		}
		const timer = setTimeout(() => setNow(Date.now()), screenEnd - Date.now());
		return () => clearTimeout(timer);
	}, [screenEnd]);
	return onShow;
};

/*
 * The countdown over the screen on show holds how long the screen shows, the seconds left of it, and the key
 * that tells one screen's countdown from the next: the cycle's start and the screen. A countdown keyed by it
 * starts again exactly when the screen changes or the cycle starts again.
 */
export interface Countdown {
	readonly key: string;
	readonly seconds: number;
	readonly secondsLeft: number;
}

/*
 * Returns the countdown over the screen on show, or undefined when there is nothing to count down to: before
 * Start, on a Held screen, or on a phase's only screen.
 */
export const describeCountdown = (
	tournament: Tournament,
	onShow: TvScreenOnShow | undefined,
): Countdown | undefined =>
	onShow?.secondsLeft === undefined
		? undefined
		: {
				key: `${tournament.tvCycleStart?.time} ${onShow.screen}`,
				seconds: tournament.screenSeconds,
				secondsLeft: onShow.secondsLeft,
			};

/*
 * Returns the CSS variables a countdown's animation reads: the screen's whole time, and the part of it already
 * gone when the countdown appears. The time gone is kept from then: the animation counts on by itself.
 */
export const useCountdownTimes = ({ seconds, secondsLeft }: Countdown): CSSProperties => {
	const [elapsedSeconds] = useState(seconds - secondsLeft);
	return {
		'--countdown-duration': `${seconds}s`,
		'--countdown-elapsed': `${elapsedSeconds}s`,
	} as CSSProperties;
};

/*
 * The TV's countdown ring's size, and the strip down the safe area's right edge the screen keeps clear for it,
 * from Tonight's Draw on: the ring's width and a gap. Both in cqh, so the ring stays round and its strip fits
 * it on any TV.
 */
export const countdownRing = { size: 'h-[3cqh] w-[3cqh]', clearance: 'pr-[4cqh]' };

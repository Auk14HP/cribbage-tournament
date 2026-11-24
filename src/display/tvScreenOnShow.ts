// What both the TV and the Organizer's thumbnail of it need to draw the TV screen on show.
import { useEffect, useState } from 'react';
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
 * Returns what tells one screen's countdown from the next: the cycle's start and the screen. A countdown keyed
 * by it starts again exactly when the screen changes or the cycle starts again.
 */
export const findCountdownKey = (tournament: Tournament, onShow: TvScreenOnShow) =>
	`${tournament.tvCycleStart?.time} ${onShow.screen}`;

/*
 * The TV's countdown ring's size, and the strip down the safe area's right edge the screen keeps clear for it,
 * from Tonight's Draw on: the ring's width and a gap. Both in cqh, so the ring stays round and its strip fits
 * it on any TV.
 */
export const countdownRing = { size: 'h-[3cqh] w-[3cqh]', clearance: 'pr-[4cqh]' };

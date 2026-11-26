/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes scale with the TV: large and high-contrast text, readable from across the room.
 * Everything sits inside the TV's safe area, since a TV that overscans crops the picture's edges.
 */
import type { Store } from '../storage';
import type { Random, Tournament } from '../tournament';
import { useTvHeartbeat, type TvHeartbeat } from '../tvHeartbeat';
import { useTournament } from '../useTournament';
import { tvSafeArea } from './tvSafeArea';
import { TvScreenView } from './TvScreenView';
import {
	countdownRing,
	describeCountdown,
	tvFrame,
	useCountdownTimes,
	useTvScreenOnShow,
	type Countdown,
} from './tvScreenOnShow';

/*
 * Fun Facts are chosen with the random source given, so tests can repeat them. The window is the TV screen's
 * frame, so the screen fills it. The countdown ring shows over the screen's time on Auto; a Held screen, or a
 * phase's only screen, has none. While open, it saves the TV's heartbeat, so the Organizer screen knows the TV
 * is running.
 */
export const Display = ({
	store,
	heartbeatStore,
	random,
}: {
	store: Store<Tournament>;
	heartbeatStore: Store<TvHeartbeat>;
	random: Random;
}) => {
	useTvHeartbeat(heartbeatStore);
	const tournament = useTournament(store);
	const onShow = useTvScreenOnShow(tournament);
	const countdown = describeCountdown(tournament, onShow);
	return (
		<div className={`h-screen w-screen ${tvFrame}`}>
			<main className={`min-h-full bg-black text-white ${tvSafeArea.page}`}>
				<TvScreenView tournament={tournament} onShow={onShow} random={random} />
				{countdown && <CountdownRing key={countdown.key} countdown={countdown} />}
			</main>
		</div>
	);
};

/*
 * A ring in the safe area's bottom-right corner that fills over the screen's time, so the room sees a change
 * coming. It sits in the strip the screen keeps clear for it, clear of every Match card. It starts filled as
 * far as the time already gone when it appears, and fills on from there.
 * Decorative, so hidden from assistive technology. The times reach the animation through inherited CSS
 * variables.
 */
const CountdownRing = ({ countdown }: { countdown: Countdown }) => {
	const countdownTimes = useCountdownTimes(countdown);
	return (
		<svg
			data-testid="countdown ring"
			aria-hidden
			viewBox="0 0 36 36"
			style={countdownTimes}
			className={`fixed -rotate-90 ${tvSafeArea.bottomRightCorner} ${countdownRing.size}`}
		>
			<circle {...ringCircle} className="stroke-gray-700" />
			<circle
				{...ringCircle}
				pathLength={1}
				strokeDasharray={1}
				className="animate-countdown stroke-white"
			/>
		</svg>
	);
};

// The ring's track and its filling share one circle.
const ringCircle = { cx: 18, cy: 18, r: 15, fill: 'none', strokeWidth: 6 };

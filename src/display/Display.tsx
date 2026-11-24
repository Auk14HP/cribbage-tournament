/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 * Everything sits inside the TV's safe area, since a TV that overscans crops the picture's edges.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Store } from '../storage';
import { findTvScreenOnShow, type Random, type Tournament, type TvScreen } from '../tournament';
import { useTournament } from '../useTournament';
import { Bracket } from './Bracket';
import { Champion } from './Champion';
import { HouseRules } from './HouseRules';
import { Players } from './Players';
import { tvSafeArea } from './tvSafeArea';

// Fun Facts are chosen with the random source given, so tests can repeat them.
export const Display = ({ store, random }: { store: Store<Tournament>; random: Random }) => {
	const tournament = useTournament(store);
	return (
		<main className={`min-h-screen bg-black text-white ${tvSafeArea.page}`}>
			{tournament.phase === 'registration' && (
				<Players tournament={tournament} random={random} />
			)}
			{tournament.phase === 'houseRules' && <HouseRules tournament={tournament} />}
			{/*
			 * From Tonight's Draw on, every screen keeps clear of the countdown ring's strip, ring or not, so
			 * the bracket doesn't shift at Start and holding a screen doesn't shift it.
			 */}
			{tournament.phase !== 'registration' && tournament.phase !== 'houseRules' && (
				<div className={countdownRing.clearance}>
					{/* Tonight's Draw: the Winners Bracket as the Draw stands, until Start. */}
					{tournament.phase === 'drawShown' && (
						<Bracket
							tournament={tournament}
							bracketName="winners"
							heading="Tonight’s Draw"
						/>
					)}
					{(tournament.phase === 'inProgress' || tournament.phase === 'finished') && (
						<Cycle tournament={tournament} />
					)}
				</div>
			)}
		</main>
	);
};

// Each screen the TV shows once Started.
const tvScreens: Record<TvScreen, (tournament: Tournament) => ReactNode> = {
	winnersBracket: (tournament) => <Bracket tournament={tournament} bracketName="winners" />,
	losersBracket: (tournament) => <Bracket tournament={tournament} bracketName="losers" />,
	champion: (tournament) => <Champion tournament={tournament} />,
};

/*
 * Shows the screen the TV has on show, worked out from the Tournament and the clock, so a reloaded TV picks
 * up the cycle where it was. On Auto it looks at the clock again the moment the screen's time is up, and
 * shows a countdown ring over the screen's time; a Held screen, or a phase's only screen, has none.
 */
const Cycle = ({ tournament }: { tournament: Tournament }) => {
	// The time the screen on show was last worked out at.
	const [now, setNow] = useState(() => Date.now());
	// Shown only from Start, so there is always a screen on show.
	const onShow = findTvScreenOnShow(tournament, now)!;
	const { secondsLeft } = onShow;
	const screenEnd = secondsLeft === undefined ? undefined : now + secondsLeft * 1000;
	useEffect(() => {
		if (screenEnd === undefined) {
			return;
		}
		const timer = setTimeout(() => setNow(Date.now()), screenEnd - Date.now());
		return () => clearTimeout(timer);
	}, [screenEnd]);
	/*
	 * Keyed by the cycle's start and the screen, so the ring starts again exactly when the screen changes or
	 * the cycle starts again.
	 */
	return (
		<>
			{tvScreens[onShow.screen](tournament)}
			{secondsLeft !== undefined && (
				<CountdownRing
					key={`${tournament.tvCycleStart?.time} ${onShow.screen}`}
					seconds={tournament.screenSeconds}
					secondsLeft={secondsLeft}
				/>
			)}
		</>
	);
};

/*
 * The ring's size, and the strip down the safe area's right edge the screen keeps clear for it, from Tonight's
 * Draw on: the ring's width and a gap. Both in vh, so the ring stays round and its strip fits it on any TV.
 */
const countdownRing = { size: 'h-[3vh] w-[3vh]', clearance: 'pr-[4vh]' };

/*
 * A ring in the safe area's bottom-right corner that fills over the screen's time, so the room sees a change
 * coming. It sits in the strip the screen keeps clear for it, clear of every Match card. It starts filled as
 * far as the time already gone when it appears, and fills on from there.
 * Decorative, so hidden from assistive technology. The times reach the animation through inherited CSS
 * variables.
 */
const CountdownRing = ({ seconds, secondsLeft }: { seconds: number; secondsLeft: number }) => {
	// Kept from when the ring appears: the animation counts on from there by itself.
	const [elapsedSeconds] = useState(seconds - secondsLeft);
	const times = {
		'--countdown-duration': `${seconds}s`,
		'--countdown-elapsed': `${elapsedSeconds}s`,
	} as CSSProperties;
	return (
		<svg
			data-testid="countdown ring"
			aria-hidden
			viewBox="0 0 36 36"
			style={times}
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

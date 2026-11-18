/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 * Everything sits inside the TV's safe area, since a TV that overscans crops the picture's edges.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Store } from '../storage';
import { listTvScreens, type Tournament, type TvScreen } from '../tournament';
import { useTournament } from '../useTournament';
import { Bracket } from './Bracket';
import { Champion } from './Champion';
import { Draw } from './Draw';
import { NowPlaying } from './NowPlaying';
import { Players } from './Players';
import { tvSafeArea } from './tvSafeArea';

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className={`min-h-screen bg-black text-white ${tvSafeArea.page}`}>
			{tournament.phase === 'registration' && <Players tournament={tournament} />}
			{tournament.phase === 'drawShown' && <Draw tournament={tournament} />}
			{/* Keyed by phase, so finishing starts the cycle again from its first screen, or the Held screen. */}
			{(tournament.phase === 'inProgress' || tournament.phase === 'finished') && (
				<Cycle key={tournament.phase} tournament={tournament} />
			)}
		</main>
	);
};

// Each screen the TV shows once Started.
const tvScreens: Record<TvScreen, (tournament: Tournament) => ReactNode> = {
	winnersBracket: (tournament) => <Bracket tournament={tournament} bracketName="winners" />,
	losersBracket: (tournament) => <Bracket tournament={tournament} bracketName="losers" />,
	nowPlaying: (tournament) => <NowPlaying tournament={tournament} />,
	champion: (tournament) => <Champion tournament={tournament} />,
};

/*
 * On Auto, shows each of the phase's screens in turn, each for the Tournament's screenSeconds, from the
 * first. A Held screen stays on show, with no countdown ring. Choosing Auto again starts the cycle from the
 * screen on show, with a fresh screen time. A new screenSeconds restarts the current screen's time, so the
 * change shows at once.
 */
const Cycle = ({ tournament }: { tournament: Tournament }) => {
	const screens = listTvScreens(tournament);
	const held = tournament.tvChoice === 'auto' ? undefined : tournament.tvChoice;
	const isHeld = held !== undefined;
	const [shown, setShown] = useState(held ?? screens[0]);
	// While a screen is held it is the screen on show, so Auto picks up from it.
	if (isHeld && shown !== held) {
		setShown(held);
	}
	const shownIndex = screens.indexOf(shown);
	const nextScreen = screens[(shownIndex + 1) % screens.length];
	useEffect(() => {
		if (isHeld) {
			return;
		}
		const timer = setTimeout(() => setShown(nextScreen), tournament.screenSeconds * 1000);
		return () => clearTimeout(timer);
	}, [shown, nextScreen, isHeld, tournament.screenSeconds]);
	/*
	 * Keyed like the timer, so the ring starts again exactly when the screen's time does. The screen keeps
	 * clear of the ring's strip down the safe area's right edge, held or not, so holding doesn't shift it.
	 */
	return (
		<>
			<div className={countdownRing.clearance}>{tvScreens[shown](tournament)}</div>
			{!isHeld && (
				<CountdownRing
					key={`${shown} ${tournament.screenSeconds}`}
					seconds={tournament.screenSeconds}
				/>
			)}
		</>
	);
};

/*
 * The ring's size, and the strip down the safe area's right edge the screen keeps clear for it: the ring's
 * width and a gap. Both in vh, so the ring stays round and its strip fits it on any TV.
 */
const countdownRing = { size: 'h-[3vh] w-[3vh]', clearance: 'pr-[4vh]' };

/*
 * A ring in the safe area's bottom-right corner that fills over the screen's time, so the room sees a change
 * coming. It sits in the strip the screen keeps clear for it, clear of every Match and Now playing card.
 * Decorative, so hidden from assistive technology. The duration reaches the animation through an
 * inherited CSS variable.
 */
const CountdownRing = ({ seconds }: { seconds: number }) => (
	<svg
		data-testid="countdown ring"
		aria-hidden
		viewBox="0 0 36 36"
		style={{ '--countdown-duration': `${seconds}s` } as CSSProperties}
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

// The ring's track and its filling share one circle.
const ringCircle = { cx: 18, cy: 18, r: 15, fill: 'none', strokeWidth: 6 };

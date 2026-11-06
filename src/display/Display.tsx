/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
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

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className="min-h-screen bg-black px-[4vw] py-[3vh] text-white">
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
	// Keyed like the timer, so the ring starts again exactly when the screen's time does.
	return (
		<>
			{tvScreens[shown](tournament)}
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
 * A ring in the bottom-right corner that fills over the screen's time, so the room sees a change coming.
 * It sits in the page's right padding, clear of every Match and Now playing card on a landscape TV.
 * Decorative, so hidden from assistive technology. The duration reaches the animation through an
 * inherited CSS variable.
 */
const CountdownRing = ({ seconds }: { seconds: number }) => (
	<svg
		data-testid="countdown ring"
		aria-hidden
		viewBox="0 0 36 36"
		style={{ '--countdown-duration': `${seconds}s` } as CSSProperties}
		className="fixed right-[1vw] bottom-[1vh] h-[3vh] w-[3vh] -rotate-90"
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

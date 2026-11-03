/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { Store } from '../storage';
import type { Tournament } from '../tournament';
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
			{/* Keyed by phase, so finishing starts the cycle again from its first screen. */}
			{(tournament.phase === 'inProgress' || tournament.phase === 'finished') && (
				<Cycle key={tournament.phase} tournament={tournament} />
			)}
		</main>
	);
};

// The screens the TV cycles through, each for the Tournament's screenSeconds.
const cycledScreens = {
	winnersBracket: (tournament: Tournament) => (
		<Bracket tournament={tournament} bracketName="winners" />
	),
	losersBracket: (tournament: Tournament) => (
		<Bracket tournament={tournament} bracketName="losers" />
	),
	nowPlaying: (tournament: Tournament) => <NowPlaying tournament={tournament} />,
	champion: (tournament: Tournament) => <Champion tournament={tournament} />,
};

type CycledScreen = keyof typeof cycledScreens;

// The Losers Bracket's screen, once it is drawn: skipped when there is none.
const listBracketScreens = (tournament: Tournament): CycledScreen[] =>
	tournament.losersBracket ? ['winnersBracket', 'losersBracket'] : ['winnersBracket'];

/*
 * The screens in the order the TV shows them. During play: the brackets, then Now playing. Once the night
 * is finished: the champions first, then the brackets.
 */
const listCycledScreens = (tournament: Tournament): CycledScreen[] =>
	tournament.phase === 'finished'
		? ['champion', ...listBracketScreens(tournament)]
		: [...listBracketScreens(tournament), 'nowPlaying'];

/*
 * Shows each screen in turn, from the first. A new screenSeconds restarts the current screen's time, so
 * the change shows at once.
 */
const Cycle = ({ tournament }: { tournament: Tournament }) => {
	const screens = listCycledScreens(tournament);
	const [shown, setShown] = useState(0);
	useEffect(() => {
		const timer = setTimeout(
			() => setShown((index) => (index + 1) % screens.length),
			tournament.screenSeconds * 1000,
		);
		return () => clearTimeout(timer);
	}, [shown, screens.length, tournament.screenSeconds]);
	// Keyed like the timer, so the ring starts again exactly when the screen's time does.
	return (
		<>
			{cycledScreens[screens[shown]](tournament)}
			<CountdownRing
				key={`${shown} ${tournament.screenSeconds}`}
				seconds={tournament.screenSeconds}
			/>
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

/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import type { Store } from './storage';
import type { Tournament } from './tournament';
import { useTournament } from './useTournament';
import { playersRegistered } from './wording';

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className="min-h-screen bg-black px-[4vw] py-[3vh] text-white">
			<h1 className="text-[7vh] font-bold">Tonight’s Players</h1>
			<p className="mt-[1vh] mb-[3vh] text-[5vh] text-yellow-300">
				{playersRegistered(tournament.players.length)}
			</p>
			<ul className="columns-3 gap-x-[4vw] text-[5vh] leading-snug font-semibold">
				{tournament.players.map((p) => (
					<li key={p.id}>{p.name}</li>
				))}
			</ul>
		</main>
	);
};

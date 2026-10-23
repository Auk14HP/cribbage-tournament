/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import type { Store } from './storage';
import { tonightsDraw, type Tournament } from './tournament';
import { useTournament } from './useTournament';
import { playerName, playersRegistered } from './wording';

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className="min-h-screen bg-black px-[4vw] py-[3vh] text-white">
			{tournament.phase === 'registration' ? (
				<Players tournament={tournament} />
			) : (
				<Draw
					tournament={tournament}
					heading={tournament.phase === 'drawShown' ? 'Tonight’s Draw' : 'Now playing'}
				/>
			)}
		</main>
	);
};

const Players = ({ tournament }: { tournament: Tournament }) => (
	<>
		<h1 className="text-[7vh] font-bold">Tonight’s Players</h1>
		<p className="mt-[1vh] mb-[3vh] text-[5vh] text-yellow-300">
			{playersRegistered(tournament.players.length)}
		</p>
		<ul className="columns-3 gap-x-[4vw] text-[5vh] leading-snug font-semibold">
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
	</>
);

/*
 * Every Match holding a Board, so each Player can find their seat, including a Bye Player waiting there
 * for a Match's winner. Sized so a 32-place bracket fits one screen: up to four rows of Matches.
 */
const Draw = ({ tournament, heading }: { tournament: Tournament; heading: string }) => {
	const matches = tonightsDraw(tournament)!;
	return (
		<>
			<h1 className="text-[6vh] leading-none font-bold">{heading}</h1>
			<ul aria-label="Matches" className="mt-[3vh] grid grid-cols-4 gap-[1.5vh]">
				{matches.map((match) => (
					<li
						key={match.board}
						className="rounded-[1vh] border-[0.3vh] border-gray-500 px-[1.5vw] py-[0.8vh] leading-tight"
					>
						<span className="block text-[3.8vh] font-bold text-yellow-300">
							Board {match.board}
						</span>
						<span className="block text-[3.8vh] font-semibold">
							{match.players[0].name}
						</span>
						{/* A winner still to come is greyed, so it doesn't read as a Player's name. */}
						<span
							className={`block text-[3.8vh] font-semibold ${'winnerOfBoard' in match.players[1] ? 'text-gray-300 italic' : ''}`}
						>
							{playerName(match.players[1])}
						</span>
					</li>
				))}
			</ul>
		</>
	);
};

// Before the Draw: every Player registered so far, up to the 32 a bracket holds, in three columns on one screen.
import type { Tournament } from '../tournament';
import { describePlayersRegistered } from '../wording';

export const Players = ({ tournament }: { tournament: Tournament }) => (
	<>
		<h1 className="text-[7vh] leading-none font-bold">Tonight’s Players</h1>
		<p className="mt-[2vh] mb-[3vh] text-[5vh] leading-none text-yellow-300">
			{describePlayersRegistered(tournament.players.length)}
		</p>
		<ul className="columns-3 gap-x-[4vw] text-[4.5vh] leading-snug font-semibold">
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
	</>
);

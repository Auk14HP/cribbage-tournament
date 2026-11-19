/*
 * Before the Draw: the Tournament's title and the night's date, then every Player registered so far, up to
 * the 32 a bracket holds, in three columns on one screen, and a Fun Fact pinned to the bottom of the safe
 * area. The names take the space between, so the Fun Fact keeps its place as the list grows.
 */
import type { Random, Tournament } from '../tournament';
import { describePlayersRegistered } from '../wording';
import { FunFactLine } from './FunFactLine';
import { TournamentTitle } from './TournamentTitle';
import { tvSafeArea } from './tvSafeArea';

export const Players = ({ tournament, random }: { tournament: Tournament; random: Random }) => (
	<div className={`flex flex-col ${tvSafeArea.fullHeight}`}>
		<TournamentTitle tournament={tournament} titleElement="h1" />
		<p className="mt-[1.5vh] mb-[2vh] text-[4.5vh] leading-none text-yellow-300">
			{describePlayersRegistered(tournament.players.length)}
		</p>
		<ul className="min-h-0 flex-1 columns-3 gap-x-[4vw] text-[4.2vh] leading-tight font-semibold">
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
		<FunFactLine players={tournament.players} random={random} />
	</div>
);

/*
 * Before the Draw: the Tournament's title and the night's date, then every Player registered so far, up to
 * the 32 a bracket holds, in three columns on one screen, and a Fun Fact pinned to the bottom of the safe
 * area. The names take the space between, so the Fun Fact keeps its place as the list grows. The TV Theme's
 * motifs stand at the right, below the title's line and above the names, beside the date and the count, which
 * never reach that far.
 */
import type { Random, Tournament } from '../tournament';
import { describePlayersRegistered } from '../wording';
import { FunFactLine } from './FunFactLine';
import { TournamentTitle } from './TournamentTitle';
import { tvSafeArea } from './tvSafeArea';
import { TvThemeTitleMotifs } from './TvThemeArt';

export const Players = ({ tournament, random }: { tournament: Tournament; random: Random }) => (
	<div className={`flex flex-col ${tvSafeArea.fullHeight}`}>
		<div className="relative">
			<TournamentTitle tournament={tournament} titleElement="h1" />
			<p className="text-tv-highlight mt-[1.5cqh] mb-[2cqh] text-[4.5cqh] leading-none">
				{describePlayersRegistered(tournament.players.length)}
			</p>
			<TvThemeTitleMotifs className="absolute right-0 bottom-0 h-[10cqh]" />
		</div>
		<ul
			aria-label="Players"
			className="min-h-0 flex-1 columns-3 gap-x-[4cqw] text-[4.2cqh] leading-tight font-semibold"
		>
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
		<FunFactLine players={tournament.players} random={random} />
	</div>
);

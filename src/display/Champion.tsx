import { getBracketPicture, type BracketName, type Player, type Tournament } from '../tournament';
import { bracketTitles } from '../wording';
import { TournamentTitle } from './TournamentTitle';
import { tvSafeArea } from './tvSafeArea';
import { TvThemeChampionMotif } from './TvThemeArt';

/*
 * Once the Tournament is finished: the Tournament's title and the night's date across the top, then the
 * champions in the space left, as large as the TV allows. The Winners Bracket's is the night's only champion
 * when no Losers Bracket is played. Each champion's name has the TV Theme's champion motif either side.
 */
export const Champion = ({ tournament }: { tournament: Tournament }) => {
	const winnersChampion = getBracketPicture(tournament, 'winners')!.champion!;
	const losersChampion = getBracketPicture(tournament, 'losers')?.champion;
	const heading = losersChampion ? 'Tonight’s Champions' : 'Tonight’s Champion';
	return (
		<div className={`flex flex-col items-center text-center ${tvSafeArea.fullHeight}`}>
			<TournamentTitle tournament={tournament} titleElement="p" />
			<div className="flex flex-1 flex-col items-center justify-center">
				<h1 className="text-[8cqh] leading-none font-bold">{heading}</h1>
				{losersChampion ? (
					<>
						<BracketChampion bracketName="winners" champion={winnersChampion} />
						<BracketChampion bracketName="losers" champion={losersChampion} />
					</>
				) : (
					<p className="mt-[6cqh]">
						<ChampionName name={winnersChampion.name} size={championNameSizes.alone} />
					</p>
				)}
			</div>
		</div>
	);
};

// One bracket's champion on the champions screen, under the bracket's name.
const BracketChampion = ({
	bracketName,
	champion,
}: {
	bracketName: BracketName;
	champion: Player;
}) => (
	<p className="mt-[6cqh]">
		<span className="text-tv-muted block text-[5cqh] font-bold">
			{bracketTitles[bracketName]}
		</span>
		<ChampionName name={champion.name} size={championNameSizes.besideAnother} />
	</p>
);

/*
 * The size of a champion's name and of the motifs beside it, which stand as tall as the name's line: larger
 * for the night's only champion than for one of two. Each class is written out whole so Tailwind finds it.
 */
const championNameSizes = {
	alone: { text: 'text-[14cqh]', motif: 'h-[14cqh]' },
	besideAnother: { text: 'text-[11cqh]', motif: 'h-[11cqh]' },
};

// A champion's name, in the highlight colour, with the TV Theme's champion motif either side.
const ChampionName = ({
	name,
	size,
}: {
	name: string;
	size: (typeof championNameSizes)[keyof typeof championNameSizes];
}) => (
	<span
		className={`text-tv-highlight flex items-center justify-center gap-[3cqw] leading-none font-bold ${size.text}`}
	>
		<TvThemeChampionMotif className={size.motif} />
		<span>{name}</span>
		<TvThemeChampionMotif className={size.motif} />
	</span>
);

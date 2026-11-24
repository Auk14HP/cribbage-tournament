import { getBracketPicture, type BracketName, type Player, type Tournament } from '../tournament';
import { bracketTitles } from '../wording';
import { TournamentTitle } from './TournamentTitle';
import { tvSafeArea } from './tvSafeArea';

/*
 * Once the Tournament is finished: the Tournament's title and the night's date across the top, then the
 * champions in the space left, as large as the TV allows. The Winners Bracket's is the night's only champion
 * when no Losers Bracket is played.
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
					<p className="mt-[6cqh] text-[14cqh] leading-none font-bold text-yellow-300">
						{winnersChampion.name}
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
		<span className="block text-[5cqh] font-bold text-gray-300">
			{bracketTitles[bracketName]}
		</span>
		<span className="block text-[11cqh] leading-none font-bold text-yellow-300">
			{champion.name}
		</span>
	</p>
);

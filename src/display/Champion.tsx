import { getBracketPicture, type BracketName, type Player, type Tournament } from '../tournament';
import { bracketTitles } from '../wording';

/*
 * Once the Tournament is finished: the champions, as large as the TV allows. The Winners Bracket's is the
 * night's only champion when no Losers Bracket is played.
 */
export const Champion = ({ tournament }: { tournament: Tournament }) => {
	const winnersChampion = getBracketPicture(tournament, 'winners')!.champion!;
	const losersChampion = getBracketPicture(tournament, 'losers')?.champion;
	const heading = losersChampion ? 'Tonight’s Champions' : 'Tonight’s Champion';
	return (
		<div className="flex h-[94vh] flex-col items-center justify-center text-center">
			<h1 className="text-[8vh] leading-none font-bold">{heading}</h1>
			{losersChampion ? (
				<>
					<BracketChampion bracketName="winners" champion={winnersChampion} />
					<BracketChampion bracketName="losers" champion={losersChampion} />
				</>
			) : (
				<p className="mt-[6vh] text-[14vh] leading-none font-bold text-yellow-300">
					{winnersChampion.name}
				</p>
			)}
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
	<p className="mt-[6vh]">
		<span className="block text-[5vh] font-bold text-gray-300">
			{bracketTitles[bracketName]}
		</span>
		<span className="block text-[11vh] leading-none font-bold text-yellow-300">
			{champion.name}
		</span>
	</p>
);

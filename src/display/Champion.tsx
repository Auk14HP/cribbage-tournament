import { getWinnersBracketPicture, type Tournament } from '../tournament';

/*
 * Once the Tournament is finished: the champion, as large as the TV allows. The Winners Bracket's is the
 * night's only champion until the Losers Bracket is played.
 */
export const Champion = ({ tournament }: { tournament: Tournament }) => {
	const { champion } = getWinnersBracketPicture(tournament)!;
	return (
		<div className="flex h-[94vh] flex-col items-center justify-center text-center">
			<h1 className="text-[8vh] leading-none font-bold">Tonight’s Champion</h1>
			<p className="mt-[6vh] text-[14vh] leading-none font-bold text-yellow-300">
				{champion!.name}
			</p>
		</div>
	);
};

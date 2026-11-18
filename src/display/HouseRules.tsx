/*
 * The House Rules step: the House Rules the Organizer has shown so far, as they announce them, under the
 * number of Players tonight. The latest stands out, so the room knows which one is being talked about, and
 * the earlier ones fade slightly.
 */
import { houseRules, type Tournament } from '../tournament';
import { describePlayersTonight } from '../wording';

export const HouseRules = ({ tournament }: { tournament: Tournament }) => {
	const shown = houseRules.slice(0, tournament.houseRulesShown);
	const latestIndex = shown.length - 1;
	return (
		<>
			<h1 className="text-[7vh] leading-none font-bold">House Rules</h1>
			<p className="mt-[2vh] mb-[4vh] text-[5vh] leading-none text-yellow-300">
				{describePlayersTonight(tournament.players.length)}
			</p>
			<ol className="list-decimal space-y-[3vh] pl-[3vw] text-[5.5vh] leading-tight">
				{shown.map((rule, index) =>
					index === latestIndex ? (
						<li key={rule} aria-current="true" className="font-bold text-white">
							{rule}
						</li>
					) : (
						<li key={rule} className="font-semibold text-gray-300">
							{rule}
						</li>
					),
				)}
			</ol>
		</>
	);
};

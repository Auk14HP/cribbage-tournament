/*
 * The House Rules step: the House Rules the Organizer has shown so far, as they announce them, under the
 * number of Players tonight. The latest stands out, so the room knows which one is being talked about, and
 * the earlier ones fade slightly.
 */
import { houseRules, type Tournament } from '../tournament';
import { describePlayersTonight } from '../wording';

// The latest House Rule stands out in bold white; the earlier ones fade slightly to grey.
const ruleClasses = {
	latest: 'font-bold text-white',
	earlier: 'font-semibold text-gray-300',
};

export const HouseRules = ({ tournament }: { tournament: Tournament }) => {
	const shownRules = houseRules.slice(0, tournament.shownHouseRuleCount);
	const latestIndex = shownRules.length - 1;
	return (
		<>
			<h1 className="text-[7vh] leading-none font-bold">House Rules</h1>
			<p className="mt-[2vh] mb-[4vh] text-[5vh] leading-none text-yellow-300">
				{describePlayersTonight(tournament.players.length)}
			</p>
			{/* A rule too long for one line has its lines balanced to about the same length. */}
			<ol
				aria-label="House Rules"
				className="list-decimal space-y-[3vh] pl-[3vw] text-[5.5vh] leading-tight text-balance"
			>
				{shownRules.map((rule, index) => (
					<HouseRule key={rule} rule={rule} isLatest={index === latestIndex} />
				))}
			</ol>
		</>
	);
};

// One House Rule, marked as the current one when it is the latest shown.
const HouseRule = ({ rule, isLatest }: { rule: string; isLatest: boolean }) => (
	<li
		aria-current={isLatest ? 'true' : undefined}
		className={isLatest ? ruleClasses.latest : ruleClasses.earlier}
	>
		{rule}
	</li>
);

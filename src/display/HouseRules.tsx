/*
 * The House Rules step: the House Rules the Organizer has shown so far, as they announce them, under the
 * number of Players tonight. The latest stands out, so the room knows which one is being talked about, and
 * the earlier ones fade slightly. The TV Theme's motifs stand beside the heading.
 */
import { houseRules, type Tournament } from '../tournament';
import { describePlayersTonight } from '../wording';
import { tvSafeArea } from './tvSafeArea';
import { TvThemeTitleMotifs } from './TvThemeArt';

// The latest House Rule stands out in bold ink; the earlier ones fade slightly to the muted colour.
const ruleClasses = {
	latest: 'font-bold text-tv-ink',
	earlier: 'font-semibold text-tv-muted',
};

export const HouseRules = ({ tournament }: { tournament: Tournament }) => {
	const shownRules = houseRules.slice(0, tournament.shownHouseRuleCount);
	const latestIndex = shownRules.length - 1;
	return (
		<>
			<div className={`flex items-end gap-[2cqw] ${tvSafeArea.headingClearance}`}>
				<h1 className="text-[7cqh] leading-none font-bold">House Rules</h1>
				<TvThemeTitleMotifs className="h-[7cqh]" />
			</div>
			<p className="text-tv-highlight mt-[2cqh] mb-[4cqh] text-[5cqh] leading-none">
				{describePlayersTonight(tournament.players.length)}
			</p>
			{/* A rule too long for one line has its lines balanced to about the same length. */}
			<ol
				aria-label="House Rules"
				className="list-decimal space-y-[3cqh] pl-[3cqw] text-[5.5cqh] leading-tight text-balance"
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

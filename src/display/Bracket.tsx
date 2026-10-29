import {
	getBracketPicture,
	hasLostIn,
	type BracketMatch,
	type BracketName,
	type Player,
	type Tournament,
} from '../tournament';
import { describeFinal, describeHalf, getPathShade, type BracketSlot } from './bracketLines';

// Text shrinks as the bracket grows, so a 32-place bracket's nine columns fit across the TV.
const bracketText = ['text-[5vh]', 'text-[5vh]', 'text-[4vh]', 'text-[3.2vh]', 'text-[2.5vh]'];

const titles: Record<BracketName, string> = {
	winners: 'Winners Bracket',
	losers: 'Losers Bracket',
};

/*
 * A whole bracket: its two halves run in from either side to the final in the middle. Each Round's Matches
 * share their column's height equally and sit in the middle of their share, so every Match is centred
 * between the two that feed it, and bracket lines join them.
 */
export const Bracket = ({ tournament, name }: { tournament: Tournament; name: BracketName }) => {
	const { rounds, champion } = getBracketPicture(tournament, name)!;
	const isStillIn = (player: number) => !hasLostIn(tournament, name, player);
	const earlier = rounds.slice(0, -1).map((_, round) => round);
	return (
		<div className="flex h-[94vh] flex-col">
			<div className="flex items-baseline justify-between">
				<h1 className="text-[6vh] leading-none font-bold">{titles[name]}</h1>
				{champion && (
					<p className="text-[6vh] leading-none font-bold text-yellow-300">
						Champion: {champion.name}
					</p>
				)}
			</div>
			<div
				className={`mt-[2vh] flex flex-1 gap-[1vw] leading-[1.15] ${bracketText[rounds.length - 1]}`}
			>
				{earlier.map((round) => (
					<BracketColumn
						key={`left ${round}`}
						name={`Round ${round + 1}`}
						slots={describeHalf(isStillIn, rounds, round, 'left')}
					/>
				))}
				<BracketColumn
					name="Final"
					slots={[describeFinal(isStillIn, rounds)]}
					champion={champion}
				/>
				{[...earlier].reverse().map((round) => (
					<BracketColumn
						key={`right ${round}`}
						name={`Round ${round + 1}`}
						slots={describeHalf(isStillIn, rounds, round, 'right')}
					/>
				))}
			</div>
		</div>
	);
};

/*
 * One Round column, or half of one: its slots share the column's height equally. Columns start at their
 * content's width but may shrink below it, so long names never push a column off the TV, and a header
 * never wraps, so every column's Matches start level. No column shrinks narrower than its header or a
 * Board label: a name may break anywhere, so these are the widest things in the column that cannot.
 */
const BracketColumn = ({
	name,
	slots,
	champion,
}: {
	name: string;
	slots: readonly (BracketSlot | undefined)[];
	champion?: Player;
}) => (
	<section className="flex min-w-min flex-auto flex-col">
		<h2 className="text-center text-[2.5vh] font-bold whitespace-nowrap text-gray-300">
			{name}
		</h2>
		<ul aria-label={name} className="flex flex-1 flex-col">
			{slots.map((slot, i) =>
				slot ? (
					<li key={i} className={`relative flex flex-1 items-center ${slot.lines}`}>
						<MatchBox match={slot.match} champion={champion} isOnPath={slot.isOnPath} />
					</li>
				) : (
					// A Bye's place: its Player is in Round 2. It draws no line.
					<li key={i} aria-hidden className="flex-1" />
				),
			)}
		</ul>
	</section>
);

// The winner bright, the loser faded, and faded further once the final has a champion.
const getPlayerShade = (match: BracketMatch, player: Player | undefined, champion?: Player) => {
	if (match.winner === undefined) {
		return '';
	}
	if (player?.id === match.winner.id) {
		return 'font-bold';
	}
	return champion ? 'text-gray-700' : 'text-gray-500';
};

/*
 * A Match's two Players: the winner bright, the loser faded, a Player still to come as a dash. A Match
 * holding a Board names it. A Match on the path of a Player still in the bracket has a green
 * border. The final turns yellow once it has a champion.
 */
const MatchBox = ({
	match,
	champion,
	isOnPath,
}: {
	match: BracketMatch;
	champion?: Player;
	isOnPath: boolean;
}) => (
	<div
		data-testid="match card"
		className={`w-full rounded-[1vh] border-[0.3vh] px-[0.6vw] py-[0.3vh] font-semibold ${champion ? 'border-yellow-300 bg-yellow-300 text-black' : getPathShade('card', isOnPath)}`}
	>
		{match.board !== undefined && (
			<span className="block whitespace-nowrap text-yellow-300">Board {match.board}</span>
		)}
		<MatchPlayer
			player={match.players[0]}
			shade={getPlayerShade(match, match.players[0], champion)}
		/>
		<MatchPlayer
			player={match.players[1]}
			shade={getPlayerShade(match, match.players[1], champion)}
		/>
	</div>
);

/*
 * One Player's name in a Match card, or a dash while they are still to come. One line, cut short with an
 * ellipsis. It may break anywhere, so it never holds its column wider than it needs.
 */
const MatchPlayer = ({ player, shade }: { player: Player | undefined; shade: string }) => (
	<span className={`line-clamp-1 break-all ${shade}`}>{player?.name ?? '—'}</span>
);

import {
	getBracketPicture,
	hasLostIn,
	type BracketMatch,
	type BracketName,
	type BracketPlayer,
	type Player,
	type PlayerId,
	type Tournament,
} from '../tournament';
import { bracketTitles, describeRound } from '../wording';
import { tvSafeArea } from './tvSafeArea';
import { describeFinal, describeHalf, getPathShade, type BracketSlot } from './bracketLines';

// Text shrinks as the bracket grows, so a 32-place bracket's nine columns fit across the TV.
const bracketText = ['text-[5cqh]', 'text-[5cqh]', 'text-[4cqh]', 'text-[3.2cqh]', 'text-[2.5cqh]'];

/*
 * A whole bracket: its two halves run in from either side to the final in the middle. Each Round's Matches
 * share their column's height equally and sit in the middle of their share, so every Match is centred
 * between the two that feed it, and bracket lines join them. Headed with the bracket's title, or the
 * heading given.
 */
export const Bracket = ({
	tournament,
	bracketName,
	heading = bracketTitles[bracketName],
}: {
	tournament: Tournament;
	bracketName: BracketName;
	heading?: string;
}) => {
	const { rounds, champion } = getBracketPicture(tournament, bracketName)!;
	const isStillInBracket = (player: PlayerId) => !hasLostIn(tournament, bracketName, player);
	const earlier = rounds.slice(0, -1).map((_, round) => round);
	const nameRound = (round: number) =>
		describeRound({ round: round + 1, roundCount: rounds.length });
	return (
		<div className={`flex flex-col ${tvSafeArea.fullHeight}`}>
			<div className="flex items-baseline justify-between">
				<h1 className="text-[6cqh] leading-none font-bold">{heading}</h1>
				{champion && (
					<p className="text-[6cqh] leading-none font-bold text-yellow-300">
						Champion: {champion.name}
					</p>
				)}
			</div>
			<div
				className={`mt-[2cqh] flex flex-1 gap-[1cqw] leading-[1.15] ${bracketText[rounds.length - 1]}`}
			>
				{earlier.map((round) => (
					<BracketColumn
						key={`left ${round}`}
						name={nameRound(round)}
						slots={describeHalf(isStillInBracket, rounds, round, 'left')}
					/>
				))}
				<BracketColumn
					name={nameRound(rounds.length - 1)}
					slots={[describeFinal(isStillInBracket, rounds)]}
					champion={champion}
				/>
				{[...earlier].reverse().map((round) => (
					<BracketColumn
						key={`right ${round}`}
						name={nameRound(round)}
						slots={describeHalf(isStillInBracket, rounds, round, 'right')}
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
		<h2 className="text-center text-[2.5cqh] font-bold whitespace-nowrap text-gray-300">
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
const getPlayerShade = (match: BracketMatch, player: BracketPlayer, champion?: Player) => {
	if (match.winner === undefined) {
		return '';
	}
	if (player && 'id' in player && player.id === match.winner.id) {
		return 'font-bold';
	}
	return champion ? 'text-gray-700' : 'text-gray-500';
};

/*
 * A Match's two Players: the winner bright, the loser faded, a Player still to come as a dash, and a place
 * held for a Bye Player as their name with a question mark. A Match holding a Board names it. A Match on
 * the path of a Player still in the bracket has a green border. The final turns yellow once it has a
 * champion.
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
		className={`w-full rounded-[1cqh] border-[0.3cqh] px-[0.6cqw] py-[0.3cqh] font-semibold ${champion ? 'border-yellow-300 bg-yellow-300 text-black' : getPathShade('card', isOnPath)}`}
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
 * One Player's name in a Match card, or a dash while they are still to come. A place held for a Bye Player
 * shows their name and a question mark, faded and in italics: they will be here if they lose their first
 * Match and stay. It needs no more room than a name.
 * One line, cut short with an ellipsis. It may break anywhere, so it never holds its column wider than it
 * needs.
 */
const MatchPlayer = ({ player, shade }: { player: BracketPlayer; shade: string }) => {
	if (player && 'placeHeldFor' in player) {
		return (
			<span className="line-clamp-1 break-all text-gray-400 italic">
				{player.placeHeldFor.name}?
			</span>
		);
	}
	return <span className={`line-clamp-1 break-all ${shade}`}>{player?.name ?? '—'}</span>;
};

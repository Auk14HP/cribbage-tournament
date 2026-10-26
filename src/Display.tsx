/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import type { Store } from './storage';
import {
	getMatchesOnBoards,
	getWinnersBracketPicture,
	hasLostInWinnersBracket,
	type BracketMatch,
	type Player,
	type Tournament,
} from './tournament';
import { useTournament } from './useTournament';
import { getPlayerName, describePlayersRegistered } from './wording';

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className="min-h-screen bg-black px-[4vw] py-[3vh] text-white">
			{tournament.phase === 'registration' && <Players tournament={tournament} />}
			{tournament.phase === 'drawShown' && <Draw tournament={tournament} />}
			{tournament.phase === 'inProgress' && <WinnersBracket tournament={tournament} />}
		</main>
	);
};

const Players = ({ tournament }: { tournament: Tournament }) => (
	<>
		<h1 className="text-[7vh] font-bold">Tonight’s Players</h1>
		<p className="mt-[1vh] mb-[3vh] text-[5vh] text-yellow-300">
			{describePlayersRegistered(tournament.players.length)}
		</p>
		<ul className="columns-3 gap-x-[4vw] text-[5vh] leading-snug font-semibold">
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
	</>
);

/*
 * Every Match holding a Board, so each Player can find their seat, including a Bye Player waiting there
 * for a Match's winner. Sized so a 32-place bracket fits one screen: up to four rows of Matches.
 */
const Draw = ({ tournament }: { tournament: Tournament }) => {
	const matches = getMatchesOnBoards(tournament);
	return (
		<>
			<h1 className="text-[6vh] leading-none font-bold">Tonight’s Draw</h1>
			<ul aria-label="Matches" className="mt-[3vh] grid grid-cols-4 gap-[1.5vh]">
				{matches.map((match) => (
					<li
						key={match.board}
						className="rounded-[1vh] border-[0.3vh] border-gray-500 px-[1.5vw] py-[0.8vh] leading-tight"
					>
						<span className="block text-[3.8vh] font-bold text-yellow-300">
							Board {match.board}
						</span>
						<span className="block text-[3.8vh] font-semibold">
							{match.players[0].name}
						</span>
						{/* A winner still to come is greyed, so it doesn't read as a Player's name. */}
						<span
							className={`block text-[3.8vh] font-semibold ${'name' in match.players[1] ? '' : 'text-gray-300 italic'}`}
						>
							{getPlayerName(match.players[1])}
						</span>
					</li>
				))}
			</ul>
		</>
	);
};

// Text shrinks as the bracket grows, so a 32-place bracket's nine columns fit across the TV.
const bracketText = ['text-[5vh]', 'text-[5vh]', 'text-[4vh]', 'text-[3.2vh]', 'text-[2.5vh]'];

type Side = 'left' | 'right';
type LineShape = 'straight' | 'down' | 'up';

/*
 * Bracket lines, drawn with CSS on each slot and sized to half the gap between Round columns: in vw, not
 * vh, because the gap is. A Match draws its line out on ::after: across to the gap's middle, then down or
 * up to meet its pair halfway, which is level with the Match they feed. That Match draws the rest on
 * ::before: across from the gap's middle to its own box. The final, fed from both sides, draws its right
 * one on ::after. Both rely on every slot in a column taking an equal share of its height.
 *
 * The pieces each line is built from, written out whole so Tailwind finds every class.
 */
const linePieces = {
	after: {
		base: 'after:absolute after:w-[0.5vw]',
		edge: { left: 'after:-left-[0.5vw]', right: 'after:-right-[0.5vw]' },
		shape: {
			straight: 'after:top-[calc(50%-0.15vh)] after:border-t-[0.3vh]',
			down: 'after:top-[calc(50%-0.15vh)] after:h-[calc(50%+0.15vh)] after:border-t-[0.3vh]',
			up: 'after:top-0 after:h-[calc(50%+0.15vh)] after:border-b-[0.3vh]',
		},
		turn: { left: 'after:border-l-[0.3vh]', right: 'after:border-r-[0.3vh]' },
		shade: { plain: 'after:border-gray-500', path: 'after:border-green-400' },
	},
	before: {
		base: 'before:absolute before:w-[0.5vw]',
		edge: { left: 'before:-left-[0.5vw]', right: 'before:-right-[0.5vw]' },
		shape: {
			straight: 'before:top-[calc(50%-0.15vh)] before:border-t-[0.3vh]',
			down: 'before:top-[calc(50%-0.15vh)] before:h-[calc(50%+0.15vh)] before:border-t-[0.3vh]',
			up: 'before:top-0 before:h-[calc(50%+0.15vh)] before:border-b-[0.3vh]',
		},
		turn: { left: 'before:border-l-[0.3vh]', right: 'before:border-r-[0.3vh]' },
		shade: { plain: 'before:border-gray-500', path: 'before:border-green-400' },
	},
};

/*
 * One line on a slot's ::after or ::before, sticking out past its left or right edge. It is green on the
 * path a Player still in the Winners Bracket took, from each Match they won to the Match they're in now.
 */
const drawLine = (end: 'after' | 'before', edge: Side, shape: LineShape, isPath: boolean) => {
	const pieces = linePieces[end];
	const turn = shape === 'straight' ? '' : pieces.turn[edge];
	const shade = pieces.shade[isPath ? 'path' : 'plain'];
	return [pieces.base, pieces.edge[edge], pieces.shape[shape], turn, shade].join(' ');
};

const otherSide = { left: 'right', right: 'left' } as const;

// How a slot draws: its bracket lines, and whether its Match is on the path of a Player still in.
interface SlotLook {
	readonly lines: string;
	readonly isOnPath: boolean;
}

/*
 * The whole Winners Bracket: its two halves run in from either side to the final in the middle. Each
 * Round's Matches share their column's height equally and sit in the middle of their share, so every
 * Match is centred between the two that feed it, and bracket lines join them.
 */
const WinnersBracket = ({ tournament }: { tournament: Tournament }) => {
	const { rounds, champion } = getWinnersBracketPicture(tournament)!;
	const final = rounds.length - 1;
	const getRoundName = (round: number) => (round === final ? 'Final' : `Round ${round + 1}`);
	const getHalf = (round: number, side: Side) => {
		const matches = rounds[round];
		const middle = matches.length / 2;
		return side === 'left' ? matches.slice(0, middle) : matches.slice(middle);
	};
	// A decided Match whose winner hasn't lost since: the path of a Player still in the Winners Bracket.
	const isWonByPlayerStillIn = (match: BracketMatch | undefined) =>
		match?.winner !== undefined && !hasLostInWinnersBracket(tournament, match.winner.id);
	/*
	 * The places that feed a Match from one side: none for a first-Round Match, a Bye's place undefined.
	 * The final is fed from each half's last Round.
	 */
	const getFeeders = (round: number, side: Side, place: number) =>
		round > 0 ? getHalf(round - 1, side).slice(2 * place, 2 * place + 2) : [];
	const isFedByPlayerStillIn = (round: number, side: Side, place: number) =>
		getFeeders(round, side, place).some(isWonByPlayerStillIn);
	// The line into a Match from one side. A Match fed only by Byes, or a first-Round Match, has none.
	const drawLineIn = (round: number, side: Side, place: number, end: 'after' | 'before') => {
		const feeders = getFeeders(round, side, place);
		if (!feeders.some(Boolean)) {
			return '';
		}
		const isPath = isFedByPlayerStillIn(round, side, place);
		return drawLine(end, side, 'straight', isPath);
	};
	// A Match in one half: its line out towards the final, and its line in from the Matches that feed it.
	const describeHalfSlot = (round: number, side: Side, place: number): SlotLook => {
		const half = getHalf(round, side);
		const isPath = isWonByPlayerStillIn(half[place]);
		const pairShape = place % 2 === 0 ? 'down' : 'up';
		const lineOut = drawLine(
			'after',
			otherSide[side],
			half.length === 1 ? 'straight' : pairShape,
			isPath,
		);
		const lineIn = drawLineIn(round, side, place, 'before');
		const isFedByPath = isFedByPlayerStillIn(round, side, place);
		return { lines: `${lineOut} ${lineIn}`, isOnPath: isPath || isFedByPath };
	};
	// The final: a line in from each half.
	const describeFinal = (): SlotLook => {
		const lineInLeft = drawLineIn(final, 'left', 0, 'before');
		const lineInRight = drawLineIn(final, 'right', 0, 'after');
		const isFedByPath = (['left', 'right'] as const).some((side) =>
			isFedByPlayerStillIn(final, side, 0),
		);
		const isPath = isWonByPlayerStillIn(rounds[final][0]);
		return { lines: `${lineInLeft} ${lineInRight}`, isOnPath: isPath || isFedByPath };
	};
	const renderColumn = (
		key: string,
		round: number,
		matches: readonly (BracketMatch | undefined)[],
		describeSlot: (place: number) => SlotLook,
	) => (
		<section key={key} className="flex flex-1 flex-col">
			<h2 className="text-center text-[2.5vh] font-bold text-gray-300">
				{getRoundName(round)}
			</h2>
			<ul aria-label={getRoundName(round)} className="flex flex-1 flex-col">
				{matches.map((match, i) => {
					if (!match) {
						// A Bye's place: its Player is in Round 2. It draws no line.
						return <li key={i} aria-hidden className="flex-1" />;
					}
					const { lines, isOnPath } = describeSlot(i);
					return (
						<li key={i} className={`relative flex flex-1 items-center ${lines}`}>
							<MatchBox
								match={match}
								champion={round === final ? champion : undefined}
								isOnPath={isOnPath}
							/>
						</li>
					);
				})}
			</ul>
		</section>
	);
	const earlier = rounds.slice(0, final).map((_, round) => round);
	return (
		<div className="flex h-[94vh] flex-col">
			<div className="flex items-baseline justify-between">
				<h1 className="text-[6vh] leading-none font-bold">Winners Bracket</h1>
				{champion && (
					<p className="text-[6vh] leading-none font-bold text-yellow-300">
						Champion: {champion.name}
					</p>
				)}
			</div>
			<div
				className={`mt-[2vh] flex flex-1 gap-[1vw] leading-[1.15] ${bracketText[rounds.length - 1]}`}
			>
				{earlier.map((round) =>
					renderColumn(`left ${round}`, round, getHalf(round, 'left'), (place) =>
						describeHalfSlot(round, 'left', place),
					),
				)}
				{renderColumn('final', final, rounds[final], describeFinal)}
				{[...earlier]
					.reverse()
					.map((round) =>
						renderColumn(`right ${round}`, round, getHalf(round, 'right'), (place) =>
							describeHalfSlot(round, 'right', place),
						),
					)}
			</div>
		</div>
	);
};

/*
 * A Match's two Players: the winner bright, the loser faded, a Player still to come as a dash. A Match
 * holding a Board names it. A Match on the path of a Player still in the Winners Bracket has a green
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
}) => {
	const getShade = (player: Player | undefined) => {
		if (match.winner === undefined) {
			return '';
		}
		if (player?.id === match.winner.id) {
			return 'font-bold';
		}
		return champion ? 'text-gray-700' : 'text-gray-500';
	};
	const renderPlayer = (player: Player | undefined) => (
		<span className={`block truncate ${getShade(player)}`}>{player?.name ?? '—'}</span>
	);
	return (
		<div
			className={`w-full rounded-[1vh] border-[0.3vh] px-[0.6vw] py-[0.3vh] font-semibold ${champion ? 'border-yellow-300 bg-yellow-300 text-black' : isOnPath ? 'border-green-400' : 'border-gray-500'}`}
		>
			{match.board !== undefined && (
				<span className="block text-yellow-300">Board {match.board}</span>
			)}
			{renderPlayer(match.players[0])}
			{renderPlayer(match.players[1])}
		</div>
	);
};

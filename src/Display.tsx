/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import { useEffect, useState } from 'react';
import type { Store } from './storage';
import {
	getMatchesOnBoards,
	getNowPlaying,
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
			{tournament.phase === 'inProgress' && (
				<Cycle key="inProgress" tournament={tournament} screens={playingScreens} />
			)}
			{tournament.phase === 'finished' && (
				<Cycle key="finished" tournament={tournament} screens={finishedScreens} />
			)}
		</main>
	);
};

// The screens the TV cycles through, each for the Tournament's screenSeconds.
const cycledScreens = {
	winnersBracket: (tournament: Tournament) => <WinnersBracket tournament={tournament} />,
	nowPlaying: (tournament: Tournament) => <NowPlaying tournament={tournament} />,
	champion: (tournament: Tournament) => <Champion tournament={tournament} />,
};

type CycledScreen = keyof typeof cycledScreens;

// Once Started, from the Winners Bracket. Once finished, from the champion, so the night ends on them.
const playingScreens: readonly CycledScreen[] = ['winnersBracket', 'nowPlaying'];
const finishedScreens: readonly CycledScreen[] = ['champion', 'winnersBracket'];

/*
 * Shows each screen in turn, from the first. A new screenSeconds restarts the current screen's time, so
 * the change shows at once.
 */
const Cycle = ({
	tournament,
	screens,
}: {
	tournament: Tournament;
	screens: readonly CycledScreen[];
}) => {
	const [shown, setShown] = useState(0);
	useEffect(() => {
		const timer = setTimeout(
			() => setShown((index) => (index + 1) % screens.length),
			tournament.screenSeconds * 1000,
		);
		return () => clearTimeout(timer);
	}, [shown, screens.length, tournament.screenSeconds]);
	return cycledScreens[screens[shown]](tournament);
};

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four.
 */
const nowPlayingLayouts = [
	{ upTo: 4, grid: 'grid-cols-2', text: 'text-[8vh]' },
	{ upTo: 9, grid: 'grid-cols-3', text: 'text-[6vh]' },
	{ upTo: Infinity, grid: 'grid-cols-4', text: 'text-[4.5vh]' },
];

// Each Match being played, its Board and both Players, in big text so a Player can find their seat.
const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const layout = nowPlayingLayouts.find(({ upTo }) => matches.length <= upTo)!;
	return (
		<>
			<h1 className="text-[6vh] leading-none font-bold">Now playing</h1>
			<ul
				aria-label="Matches"
				className={`mt-[3vh] grid gap-[2vh] ${layout.grid} ${layout.text}`}
			>
				{matches.map(({ board, players: [a, b] }) => (
					<li
						key={board}
						className="rounded-[1vh] border-[0.3vh] border-gray-500 px-[1.5vw] py-[1vh] leading-tight font-semibold"
					>
						<span className="block font-bold text-yellow-300">Board {board}</span>
						<span className="block truncate">{a.name}</span>
						<span className="block truncate">{b.name}</span>
					</li>
				))}
			</ul>
		</>
	);
};

/*
 * Once the Tournament is finished: the champion, as large as the TV allows. The Winners Bracket's is the
 * night's only champion until the Losers Bracket is played.
 */
const Champion = ({ tournament }: { tournament: Tournament }) => {
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
// One Round's Matches, or half of them, in bracket order. A Bye's place in the first Round is undefined.
type RoundMatches = readonly (BracketMatch | undefined)[];

/*
 * The colours of a winner's path, kept in one place: a Match card's border, and a bracket line on a
 * slot's ::after or ::before. Green is the path a Player still in the Winners Bracket took, from each
 * Match they won to the Match they're in now; everything else is grey. Each class is written out whole
 * so Tailwind finds it.
 */
const pathShade = {
	card: { plain: 'border-gray-500', path: 'border-green-400' },
	after: { plain: 'after:border-gray-500', path: 'after:border-green-400' },
	before: { plain: 'before:border-gray-500', path: 'before:border-green-400' },
};

const getPathShade = (element: keyof typeof pathShade, isPath: boolean) =>
	pathShade[element][isPath ? 'path' : 'plain'];

/*
 * Bracket lines, drawn with CSS on each slot and sized to half the gap between Round columns. They are in
 * vw, not vh, because that gap is 1vw wide: a line sized in vh would fall short of the next column, or
 * run into it, on a TV that isn't 16:9. A Match draws its line out on ::after: across to the gap's middle,
 * then down or up to meet its pair halfway, which is level with the Match they feed. That Match draws the
 * rest on ::before: across from the gap's middle to its own box. The final, fed from both sides, draws its
 * right one on ::after. Both rely on every slot in a column taking an equal share of its height.
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
	},
};

// Which pseudo-element of a slot a line is drawn on.
type LineEnd = keyof typeof linePieces;

// One line on a slot's ::after or ::before, sticking out past its left or right edge.
const drawLine = (end: LineEnd, edge: Side, shape: LineShape, isPath: boolean) => {
	const pieces = linePieces[end];
	const turn = shape === 'straight' ? '' : pieces.turn[edge];
	const shade = getPathShade(end, isPath);
	return [pieces.base, pieces.edge[edge], pieces.shape[shape], turn, shade].join(' ');
};

const otherSide = { left: 'right', right: 'left' } as const;

const getHalf = (matches: RoundMatches, side: Side): RoundMatches => {
	const middle = matches.length / 2;
	return side === 'left' ? matches.slice(0, middle) : matches.slice(middle);
};

// A decided Match whose winner hasn't lost since: the path of a Player still in the Winners Bracket.
const isWonByPlayerStillIn = (tournament: Tournament, match: BracketMatch | undefined) =>
	match?.winner !== undefined && !hasLostInWinnersBracket(tournament, match.winner.id);

const isFedByPlayerStillIn = (tournament: Tournament, feeders: RoundMatches) =>
	feeders.some((match) => isWonByPlayerStillIn(tournament, match));

// The line into a Match from the places that feed it on one side. A Match fed only by Byes has none.
const drawLineIn = (tournament: Tournament, feeders: RoundMatches, side: Side, end: LineEnd) => {
	if (!feeders.some(Boolean)) {
		return '';
	}
	const isPath = isFedByPlayerStillIn(tournament, feeders);
	return drawLine(end, side, 'straight', isPath);
};

// A Match, the bracket lines its slot draws, and whether it is on the path of a Player still in.
interface BracketSlot {
	readonly match: BracketMatch;
	readonly lines: string;
	readonly isOnPath: boolean;
}

/*
 * One half of a Round: each Match with its line out towards the final, and its line in from the two
 * places in the Round before that feed it. A first-Round Match has none feeding it. A Bye's place stays
 * undefined.
 */
const describeHalf = (
	tournament: Tournament,
	rounds: readonly RoundMatches[],
	round: number,
	side: Side,
): (BracketSlot | undefined)[] => {
	const half = getHalf(rounds[round], side);
	const earlier = round > 0 ? getHalf(rounds[round - 1], side) : [];
	return half.map((match, place) => {
		if (!match) {
			return undefined;
		}
		const feeders = earlier.slice(2 * place, 2 * place + 2);
		const isPath = isWonByPlayerStillIn(tournament, match);
		const pairShape = place % 2 === 0 ? 'down' : 'up';
		const shape = half.length === 1 ? 'straight' : pairShape;
		const lineOut = drawLine('after', otherSide[side], shape, isPath);
		const lineIn = drawLineIn(tournament, feeders, side, 'before');
		const isFedByPath = isFedByPlayerStillIn(tournament, feeders);
		return { match, lines: `${lineOut} ${lineIn}`, isOnPath: isPath || isFedByPath };
	});
};

// The final, with a line in from each half's last Round. A two-Player bracket's final has none.
const describeFinal = (tournament: Tournament, rounds: readonly RoundMatches[]): BracketSlot => {
	const match = rounds.at(-1)![0]!;
	const beforeFinal = rounds.at(-2) ?? [];
	const fromLeft = getHalf(beforeFinal, 'left');
	const fromRight = getHalf(beforeFinal, 'right');
	const lineInLeft = drawLineIn(tournament, fromLeft, 'left', 'before');
	const lineInRight = drawLineIn(tournament, fromRight, 'right', 'after');
	const isPath = isWonByPlayerStillIn(tournament, match);
	const isFedByPath =
		isFedByPlayerStillIn(tournament, fromLeft) || isFedByPlayerStillIn(tournament, fromRight);
	return { match, lines: `${lineInLeft} ${lineInRight}`, isOnPath: isPath || isFedByPath };
};

/*
 * The whole Winners Bracket: its two halves run in from either side to the final in the middle. Each
 * Round's Matches share their column's height equally and sit in the middle of their share, so every
 * Match is centred between the two that feed it, and bracket lines join them.
 */
const WinnersBracket = ({ tournament }: { tournament: Tournament }) => {
	const { rounds, champion } = getWinnersBracketPicture(tournament)!;
	const earlier = rounds.slice(0, -1).map((_, round) => round);
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
				{earlier.map((round) => (
					<BracketColumn
						key={`left ${round}`}
						name={`Round ${round + 1}`}
						slots={describeHalf(tournament, rounds, round, 'left')}
					/>
				))}
				<BracketColumn
					name="Final"
					slots={[describeFinal(tournament, rounds)]}
					champion={champion}
				/>
				{[...earlier].reverse().map((round) => (
					<BracketColumn
						key={`right ${round}`}
						name={`Round ${round + 1}`}
						slots={describeHalf(tournament, rounds, round, 'right')}
					/>
				))}
			</div>
		</div>
	);
};

// One Round column, or half of one: its slots share the column's height equally.
const BracketColumn = ({
	name,
	slots,
	champion,
}: {
	name: string;
	slots: readonly (BracketSlot | undefined)[];
	champion?: Player;
}) => (
	<section className="flex flex-1 flex-col">
		<h2 className="text-center text-[2.5vh] font-bold text-gray-300">{name}</h2>
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
}) => (
	<div
		className={`w-full rounded-[1vh] border-[0.3vh] px-[0.6vw] py-[0.3vh] font-semibold ${champion ? 'border-yellow-300 bg-yellow-300 text-black' : getPathShade('card', isOnPath)}`}
	>
		{match.board !== undefined && (
			<span className="block text-yellow-300">Board {match.board}</span>
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

// One Player's name in a Match card, or a dash while they are still to come.
const MatchPlayer = ({ player, shade }: { player: Player | undefined; shade: string }) => (
	<span className={`block truncate ${shade}`}>{player?.name ?? '—'}</span>
);

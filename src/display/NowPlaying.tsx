import { getNowPlaying, getWaitingForBoard, type Tournament } from '../tournament';
import { matchCards } from './matchCards';
import { WaitingForBoard } from './WaitingForBoard';

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four.
 */
const spaced = { gaps: 'gap-[2vh]', card: 'py-[1vh]' };
const nowPlayingLayouts = [
	{ upTo: 4, grid: `grid-cols-2 ${spaced.gaps}`, text: 'text-[8vh]', card: spaced.card },
	{ upTo: 9, grid: `grid-cols-3 ${spaced.gaps}`, text: 'text-[6vh]', card: spaced.card },
	{ upTo: Infinity, grid: `grid-cols-4 ${spaced.gaps}`, text: 'text-[4.5vh]', card: spaced.card },
];

// With Matches waiting for a Board, as large as still leaves room for them beneath.
const layoutsAboveWaiting = [
	{ upTo: 2, grid: `grid-cols-2 ${spaced.gaps}`, text: 'text-[8vh]', card: spaced.card },
	{ upTo: 6, grid: `grid-cols-3 ${spaced.gaps}`, text: 'text-[6vh]', card: spaced.card },
	{ upTo: Infinity, ...matchCards },
];

/*
 * Each Match being played, its Board and both Players, in big text so a Player can find their seat. Beneath
 * it, any Matches waiting for a Board, in turn, so their Players know they are next.
 */
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const hasWaiting = getWaitingForBoard(tournament).length > 0;
	const layouts = hasWaiting ? layoutsAboveWaiting : nowPlayingLayouts;
	const layout = layouts.find(({ upTo }) => matches.length <= upTo)!;
	return (
		<>
			<h1 className="text-[6vh] leading-none font-bold">Now playing</h1>
			<ul aria-label="Matches" className={`mt-[3vh] grid ${layout.grid} ${layout.text}`}>
				{matches.map(({ board, players: [a, b] }) => (
					<li
						key={board}
						className={`rounded-[1vh] border-[0.3vh] border-gray-500 px-[1.5vw] leading-tight font-semibold ${layout.card}`}
					>
						<span className="block font-bold text-yellow-300">Board {board}</span>
						<span className="block truncate">{a.name}</span>
						<span className="block truncate">{b.name}</span>
					</li>
				))}
			</ul>
			<WaitingForBoard tournament={tournament} />
		</>
	);
};

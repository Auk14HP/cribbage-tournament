import { getNowPlaying, getWaitingForBoard, type Tournament } from '../tournament';
import { matchCards } from './matchCards';
import { WaitingForBoard } from './WaitingForBoard';

const largeCards = { grid: 'grid-cols-2 gap-[2vh]', text: 'text-[8vh]', card: 'py-[1vh]' };
const mediumCards = { grid: 'grid-cols-3 gap-[2vh]', text: 'text-[6vh]', card: 'py-[1vh]' };

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four.
 */
const nowPlayingLayouts = [
	{ upTo: 4, ...largeCards },
	{ upTo: 9, ...mediumCards },
	{ upTo: Infinity, grid: 'grid-cols-4 gap-[2vh]', text: 'text-[4.5vh]', card: 'py-[1vh]' },
];

// With Matches waiting for a Board, as large as still leaves room for them beneath.
const layoutsAboveWaiting = [
	{ upTo: 2, waitingUpTo: Infinity, ...largeCards },
	{ upTo: 6, waitingUpTo: 9, ...mediumCards },
	{ upTo: Infinity, waitingUpTo: Infinity, ...matchCards },
];

/*
 * Each Match being played, its Board and both Players, in big text so a Player can find their seat. Beneath
 * it, any Matches waiting for a Board, in turn, so their Players know they are next.
 */
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const waiting = getWaitingForBoard(tournament).length;
	const layout =
		waiting > 0
			? layoutsAboveWaiting.find(
					({ upTo, waitingUpTo }) => matches.length <= upTo && waiting <= waitingUpTo,
				)!
			: nowPlayingLayouts.find(({ upTo }) => matches.length <= upTo)!;
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

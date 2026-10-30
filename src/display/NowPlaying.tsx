import { getNowPlaying, getWaitingForBoard, type Tournament } from '../tournament';
import { WaitingForBoard } from './WaitingForBoard';

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four.
 */
const nowPlayingLayouts = [
	{ upTo: 4, grid: 'grid-cols-2 gap-[2vh]', text: 'text-[8vh]', card: 'py-[1vh]' },
	{ upTo: 9, grid: 'grid-cols-3 gap-[2vh]', text: 'text-[6vh]', card: 'py-[1vh]' },
	{ upTo: Infinity, grid: 'grid-cols-4 gap-[2vh]', text: 'text-[4.5vh]', card: 'py-[1vh]' },
];

// With Matches waiting for a Board, the size of Tonight’s Draw, which leaves room for them beneath.
const layoutAboveWaiting = {
	grid: 'grid-cols-4 gap-[1.5vh]',
	text: 'text-[3.8vh]',
	card: 'py-[0.8vh]',
};

/*
 * Each Match being played, its Board and both Players, in big text so a Player can find their seat. Beneath
 * it, any Matches waiting for a Board, in turn, so their Players know they are next.
 */
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const hasWaiting = getWaitingForBoard(tournament).length > 0;
	const layout = hasWaiting
		? layoutAboveWaiting
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

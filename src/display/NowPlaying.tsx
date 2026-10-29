import { getNowPlaying, type Tournament } from '../tournament';

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
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
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

import { getNowPlaying, getWaitingForBoard, type Tournament } from '../tournament';
import { getPlayerName } from '../wording';

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four.
 */
const nowPlayingLayouts = [
	{ upTo: 4, grid: 'grid-cols-2', text: 'text-[8vh]' },
	{ upTo: 9, grid: 'grid-cols-3', text: 'text-[6vh]' },
	{ upTo: Infinity, grid: 'grid-cols-4', text: 'text-[4.5vh]' },
];

/*
 * Each Match being played, its Board and both Players, in big text so a Player can find their seat. Beneath
 * it, any Matches waiting for a Board, longest-waiting first, so their Players know they are next.
 */
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const waiting = getWaitingForBoard(tournament);
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
			{waiting.length > 0 && (
				<>
					<h2 className="mt-[4vh] text-[5vh] leading-none font-bold">
						Waiting for a Board
					</h2>
					<ol
						aria-label="Waiting for a Board"
						className="mt-[2vh] grid grid-cols-2 gap-x-[4vw] gap-y-[1vh] text-[4.5vh] font-semibold"
					>
						{waiting.map(({ match, players: [a, b] }) => (
							<li
								key={`${match.bracket} ${match.round} ${match.place}`}
								className="truncate"
							>
								{a.name}
								<span className="text-gray-400"> vs </span>
								{/* A Player still to come is greyed, so it doesn't read as a Player's name. */}
								<span className={'name' in b ? '' : 'text-gray-300 italic'}>
									{getPlayerName(b)}
								</span>
							</li>
						))}
					</ol>
				</>
			)}
		</>
	);
};

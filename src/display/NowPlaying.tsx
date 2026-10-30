import { getNowPlaying, getWaitingForBoard, type Tournament } from '../tournament';
import { matchCards } from './matchCards';
import { WaitingForBoard } from './WaitingForBoard';

const roomy = { gap: 'gap-[2vh]', card: 'py-[1vh]' };
const largeCards = { grid: `grid-cols-2 ${roomy.gap}`, text: 'text-[8vh]', card: roomy.card };
const mediumCards = { grid: `grid-cols-3 ${roomy.gap}`, text: 'text-[6vh]', card: roomy.card };
const smallCards = { grid: `grid-cols-4 ${roomy.gap}`, text: 'text-[4.5vh]', card: roomy.card };

/*
 * Columns and text sizes for Now playing, by how many Matches are being played: as large as fits, down to
 * a 32-place bracket's 16 first-Round Matches in four rows of four. With Matches waiting for a Board, as
 * large as still leaves room for them beneath.
 */
const chooseLayout = (playingCount: number, waitingCount: number) => {
	if (waitingCount === 0) {
		if (playingCount <= 4) {
			return largeCards;
		}
		return playingCount <= 9 ? mediumCards : smallCards;
	}
	if (playingCount <= 2) {
		return largeCards;
	}
	return playingCount <= 6 && waitingCount <= 9 ? mediumCards : matchCards;
};

/*
 * Each Match being played, its Board and both Players, in big text so a Player can find their seat. Beneath
 * it, any Matches waiting for a Board, in turn, so their Players know they are next.
 */
export const NowPlaying = ({ tournament }: { tournament: Tournament }) => {
	const matches = getNowPlaying(tournament);
	const waitingCount = getWaitingForBoard(tournament).length;
	const layout = chooseLayout(matches.length, waitingCount);
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

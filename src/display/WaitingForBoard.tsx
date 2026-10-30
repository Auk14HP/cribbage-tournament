import { getWaitingForBoard, type Tournament } from '../tournament';
import { getPlayerName } from '../wording';
import { matchCards } from './matchCards';

// One or two waiting Matches get the width of the row, so a long entry shows whole; more sit three to a row.
const columnClasses = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

/*
 * Any Matches waiting for a Board, in turn, so their Players know they are next. Cut short rather than
 * wrapped, so each takes one line.
 */
export const WaitingForBoard = ({ tournament }: { tournament: Tournament }) => {
	const waiting = getWaitingForBoard(tournament);
	if (waiting.length === 0) {
		return null;
	}
	const columnClass = columnClasses[Math.min(waiting.length, columnClasses.length) - 1];
	return (
		<>
			<h2 className="mt-[2.5vh] text-[5vh] leading-none font-bold">Waiting for a Board</h2>
			<ol
				aria-label="Waiting for a Board"
				className={`mt-[1.5vh] grid gap-x-[3vw] gap-y-[0.5vh] font-semibold ${columnClass} ${matchCards.text}`}
			>
				{waiting.map(({ match, players: [a, b] }) => (
					<li key={`${match.bracket} ${match.round} ${match.place}`} className="truncate">
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
	);
};

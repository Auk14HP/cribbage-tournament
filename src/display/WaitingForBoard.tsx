import { getWaitingForBoard, type Tournament } from '../tournament';
import { getPlayerName } from '../wording';

// Any Matches waiting for a Board, longest-waiting first, so their Players know they are next.
export const WaitingForBoard = ({ tournament }: { tournament: Tournament }) => {
	const waiting = getWaitingForBoard(tournament);
	if (waiting.length === 0) {
		return null;
	}
	return (
		<>
			<h2 className="mt-[4vh] text-[5vh] leading-none font-bold">Waiting for a Board</h2>
			<ol
				aria-label="Waiting for a Board"
				className="mt-[2vh] grid grid-cols-2 gap-x-[4vw] gap-y-[1vh] text-[4.5vh] font-semibold"
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

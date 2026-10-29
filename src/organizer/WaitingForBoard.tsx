import { getWaitingForBoard, type Tournament } from '../tournament';
import { getPlayerName } from '../wording';

// The Matches waiting for a Board, longest-waiting first. None while every Match has a Board.
export const WaitingForBoard = ({ tournament }: { tournament: Tournament }) => {
	const waiting = getWaitingForBoard(tournament);
	if (waiting.length === 0) {
		return null;
	}
	return (
		<>
			<h2 className="mt-6 text-xl font-bold">Waiting for a Board</h2>
			<p className="mt-1 text-gray-700">The next Board to free goes to the first.</p>
			<ol aria-label="Waiting for a Board" className="mt-2">
				{waiting.map(({ match, players: [a, b] }) => (
					<li
						key={`${match.bracket} ${match.round} ${match.place}`}
						className="border-b border-gray-300 py-1.5 text-lg"
					>
						{a.name} vs {getPlayerName(b)}
					</li>
				))}
			</ol>
		</>
	);
};

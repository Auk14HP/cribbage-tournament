import { getMatchKey, getWaitingForBoard, type Tournament } from '../tournament';
import { describeBracketRound } from '../wording';
import { PlayerName, type SwapPicking } from './PlayerName';

/*
 * The Matches waiting for a Board, in turn, each with its bracket and Round, since the list mixes both
 * brackets. None while every Match has a Board. In Swap mode their Players' names can be tapped too.
 */
export const WaitingForBoard = ({
	tournament,
	swapPicking,
}: {
	tournament: Tournament;
	swapPicking?: SwapPicking;
}) => {
	const waiting = getWaitingForBoard(tournament);
	if (waiting.length === 0) {
		return null;
	}
	return (
		<>
			<h2 className="mt-6 text-xl font-bold">Waiting for a Board</h2>
			<p className="mt-1 text-gray-700">The next Board to free goes to the first.</p>
			<ol aria-label="Waiting for a Board" className="mt-2">
				{waiting.map(({ match, players: [playerA, playerB] }) => (
					<li
						key={getMatchKey(match)}
						className="flex gap-4 border-b border-gray-300 py-1.5 text-lg"
					>
						<span className="w-56 shrink-0 text-gray-700">
							{describeBracketRound(tournament, match)}
						</span>
						<span>
							<PlayerName player={playerA} match={match} swapPicking={swapPicking} />
							<span className="mx-1"> vs </span>
							<PlayerName player={playerB} match={match} swapPicking={swapPicking} />
						</span>
					</li>
				))}
			</ol>
		</>
	);
};

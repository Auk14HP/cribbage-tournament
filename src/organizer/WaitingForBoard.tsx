import { getMatchKey, getWaitingForBoard, type Tournament } from '../tournament';
import { describeBracketRound } from '../wording';
import { BracketBadge } from './BracketBadge';
import { PlayerName, type SwapPicking } from './PlayerName';

/*
 * The Matches waiting for a Board, in turn, each with its bracket's badge, its bracket and
 * its Round, since the list mixes both brackets. A dashed outline sets each apart from the
 * Matches holding a Board above. None while every Match has a Board. In Swap mode their
 * Players' names can be tapped too.
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
		<section aria-label="Waiting for a Board">
			<h2 className="text-muted text-sm font-bold tracking-widest uppercase">
				Waiting for a Board
			</h2>
			<p className="text-muted mt-1">The next Board to free goes to the first.</p>
			<ol aria-label="Waiting for a Board" className="mt-2 flex flex-col gap-2">
				{waiting.map(({ match, players: [playerA, playerB] }) => (
					<li
						key={getMatchKey(match)}
						className="border-line flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-dashed px-3.5 py-2.5 text-lg font-semibold"
					>
						<span className="text-muted flex w-64 shrink-0 items-center gap-2 text-sm font-bold">
							<BracketBadge bracketName={match.bracket} size="small" />
							{describeBracketRound(tournament, match)}
						</span>
						<span>
							<PlayerName player={playerA} match={match} swapPicking={swapPicking} />
							<span className="text-muted mx-1 font-normal"> vs </span>
							<PlayerName player={playerB} match={match} swapPicking={swapPicking} />
						</span>
					</li>
				))}
			</ol>
		</section>
	);
};

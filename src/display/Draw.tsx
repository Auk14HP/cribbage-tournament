import { getMatchesOnBoards, type Tournament } from '../tournament';
import { getPlayerName } from '../wording';
import { WaitingForBoard } from './WaitingForBoard';

/*
 * Every Match holding a Board, so each Player can find their seat, including a Bye Player waiting there
 * for a Match's winner, and beneath them any Matches waiting for a Board. Sized so a 32-place bracket fits
 * one screen: up to four rows of Matches.
 */
export const Draw = ({ tournament }: { tournament: Tournament }) => {
	const matches = getMatchesOnBoards(tournament);
	return (
		<>
			<h1 className="text-[6vh] leading-none font-bold">Tonight’s Draw</h1>
			<ul aria-label="Matches" className="mt-[3vh] grid grid-cols-4 gap-[1.5vh]">
				{matches.map((match) => (
					<li
						key={match.board}
						className="rounded-[1vh] border-[0.3vh] border-gray-500 px-[1.5vw] py-[0.8vh] leading-tight"
					>
						<span className="block text-[3.8vh] font-bold text-yellow-300">
							Board {match.board}
						</span>
						<span className="block text-[3.8vh] font-semibold">
							{match.players[0].name}
						</span>
						{/* A winner still to come is greyed, so it doesn't read as a Player's name. */}
						<span
							className={`block text-[3.8vh] font-semibold ${'name' in match.players[1] ? '' : 'text-gray-300 italic'}`}
						>
							{getPlayerName(match.players[1])}
						</span>
					</li>
				))}
			</ul>
			<WaitingForBoard tournament={tournament} />
		</>
	);
};

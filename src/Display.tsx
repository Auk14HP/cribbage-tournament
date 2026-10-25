/*
 * The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
 * Sizes are in vh so text scales with the TV: large and high-contrast, readable from across the room.
 */
import type { Store } from './storage';
import {
	matchesOnBoards,
	winnersBracketPicture,
	type BracketMatch,
	type Player,
	type Tournament,
} from './tournament';
import { useTournament } from './useTournament';
import { playerName, playersRegistered } from './wording';

export const Display = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	return (
		<main className="min-h-screen bg-black px-[4vw] py-[3vh] text-white">
			{tournament.phase === 'registration' && <Players tournament={tournament} />}
			{tournament.phase === 'drawShown' && <Draw tournament={tournament} />}
			{tournament.phase === 'inProgress' && <WinnersBracket tournament={tournament} />}
		</main>
	);
};

const Players = ({ tournament }: { tournament: Tournament }) => (
	<>
		<h1 className="text-[7vh] font-bold">Tonight’s Players</h1>
		<p className="mt-[1vh] mb-[3vh] text-[5vh] text-yellow-300">
			{playersRegistered(tournament.players.length)}
		</p>
		<ul className="columns-3 gap-x-[4vw] text-[5vh] leading-snug font-semibold">
			{tournament.players.map((p) => (
				<li key={p.id}>{p.name}</li>
			))}
		</ul>
	</>
);

/*
 * Every Match holding a Board, so each Player can find their seat, including a Bye Player waiting there
 * for a Match's winner. Sized so a 32-place bracket fits one screen: up to four rows of Matches.
 */
const Draw = ({ tournament }: { tournament: Tournament }) => {
	const matches = matchesOnBoards(tournament);
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
							{playerName(match.players[1])}
						</span>
					</li>
				))}
			</ul>
		</>
	);
};

// Text shrinks as the bracket grows, so a 32-place bracket's nine columns fit across the TV.
const bracketText = ['text-[5vh]', 'text-[5vh]', 'text-[4vh]', 'text-[3.2vh]', 'text-[2.5vh]'];

/*
 * The whole Winners Bracket: its two halves run in from either side to the final in the middle. Each
 * Round's Matches share their column's height equally, so every Match sits level with the two that feed it.
 */
const WinnersBracket = ({ tournament }: { tournament: Tournament }) => {
	const { rounds, champion } = winnersBracketPicture(tournament)!;
	const final = rounds.length - 1;
	const name = (round: number) => (round === final ? 'Final' : `Round ${round + 1}`);
	const half = (round: number, side: number) => {
		const matches = rounds[round];
		return matches.slice((side * matches.length) / 2, ((side + 1) * matches.length) / 2);
	};
	// A half whose first Round is all Byes has no column there: its Players start in Round 2.
	const column = (key: string, round: number, matches: readonly (BracketMatch | undefined)[]) =>
		matches.every((match) => match === undefined) ? null : (
			<section key={key} className="flex flex-1 flex-col">
				<h2 className="text-center text-[2.5vh] font-bold text-gray-300">{name(round)}</h2>
				<ul aria-label={name(round)} className="flex flex-1 flex-col">
					{matches.map((match, i) =>
						match ? (
							<li key={i} className="flex flex-1 items-center">
								<MatchBox
									match={match}
									champion={round === final ? champion : undefined}
								/>
							</li>
						) : (
							// A Bye's place: its Player is in Round 2.
							<li key={i} aria-hidden className="flex-1" />
						),
					)}
				</ul>
			</section>
		);
	const earlier = rounds.slice(0, final).map((_, round) => round);
	return (
		<div className="flex h-[94vh] flex-col">
			<div className="flex items-baseline justify-between">
				<h1 className="text-[6vh] leading-none font-bold">Winners Bracket</h1>
				{champion && (
					<p className="text-[6vh] leading-none font-bold text-yellow-300">
						Champion: {champion.name}
					</p>
				)}
			</div>
			<div
				className={`mt-[2vh] flex flex-1 gap-[1vw] leading-[1.15] ${bracketText[rounds.length - 1]}`}
			>
				{earlier.map((round) => column(`left ${round}`, round, half(round, 0)))}
				{column('final', final, rounds[final])}
				{[...earlier]
					.reverse()
					.map((round) => column(`right ${round}`, round, half(round, 1)))}
			</div>
		</div>
	);
};

/*
 * A Match's two Players: the winner bright, the loser faded, a Player still to come as a dash. A Match
 * holding a Board names it. The final turns yellow once it has a champion.
 */
const MatchBox = ({ match, champion }: { match: BracketMatch; champion?: Player }) => {
	const line = (player: Player | undefined) => {
		const shade =
			match.winner === undefined
				? ''
				: player?.id === match.winner.id
					? 'font-bold'
					: champion
						? 'text-gray-700'
						: 'text-gray-500';
		return <span className={`block truncate ${shade}`}>{player?.name ?? '—'}</span>;
	};
	return (
		<div
			className={`w-full rounded-[1vh] border-[0.3vh] px-[0.6vw] py-[0.3vh] font-semibold ${champion ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-gray-500'}`}
		>
			{match.board !== undefined && (
				<span className="block text-yellow-300">Board {match.board}</span>
			)}
			{line(match.players[0])}
			{line(match.players[1])}
		</div>
	);
};

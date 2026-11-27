import { useId, useRef } from 'react';
import {
	getShownRound,
	type BoardNumber,
	type BracketName,
	type MatchOnBoard,
	type MatchPlace,
	type Opponent,
	type Player,
	type Tournament,
} from '../tournament';
import {
	bracketTitles,
	describeBoardCount,
	describeRound,
	getPlayerName,
	joinInSentence,
} from '../wording';
import { BracketBadge } from './BracketBadge';
import { button, confirmButton, confirmColours, dialogBox } from './classes';
import { SwapButton, type SwapPicking } from './PlayerName';

/*
 * Each of a bracket's Matches on a Board with the name of its Round, worked out
 * once, and the names of the Rounds among them, earliest first: "Round 1", "Final".
 */
const nameRounds = (tournament: Tournament, matches: readonly MatchOnBoard[]) => {
	const namedMatches = matches.map((matchOnBoard) => {
		const shownRound = getShownRound(tournament, matchOnBoard.match);
		return { matchOnBoard, round: shownRound.round, roundName: describeRound(shownRound) };
	});
	const earliestFirst = [...namedMatches].sort((x, y) => x.round - y.round);
	const roundNames = [...new Set(earliestFirst.map((m) => m.roundName))];
	return { namedMatches, roundNames };
};

/*
 * One bracket's Matches holding a Board, in a panel of its own. Its header has the
 * bracket's badge and name, the Rounds its Matches are in and how many Boards they
 * hold. Each Match is a tile naming its Board and both Players, and once Started
 * records a winner or a Forfeit. A tile names its Round only when the panel holds
 * more than one. Hidden while the bracket has none. Named by its heading.
 */
export const BracketMatches = ({
	tournament,
	bracketName,
	matches,
	playing,
	swapPicking,
	onWin,
	onForfeit,
}: {
	tournament: Tournament;
	bracketName: BracketName;
	matches: readonly MatchOnBoard[];
	playing: boolean;
	// Set only in Swap mode.
	swapPicking?: SwapPicking;
	onWin: (match: MatchPlace, winner: Player, loser: Player) => void;
	onForfeit: (match: MatchPlace, player: Player) => void;
}) => {
	const headingId = useId();
	if (matches.length === 0) {
		return null;
	}
	const { namedMatches, roundNames } = nameRounds(tournament, matches);
	const isOneRound = roundNames.length === 1;
	const summary = `${joinInSentence(roundNames)} · ${describeBoardCount(matches.length)}`;
	return (
		<section
			aria-labelledby={headingId}
			className="border-divider bg-panel overflow-hidden rounded-2xl border"
		>
			<div
				className={`border-divider flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3 ${panelHeads[bracketName]}`}
			>
				<div className="flex items-center gap-2.5">
					<BracketBadge bracketName={bracketName} size="large" />
					<h2 id={headingId} className="text-lg font-extrabold">
						{bracketTitles[bracketName]}
					</h2>
				</div>
				<p className="text-muted text-sm font-semibold">{summary}</p>
			</div>
			<ul
				aria-labelledby={headingId}
				className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 p-3.5"
			>
				{namedMatches.map(({ matchOnBoard, roundName }) => (
					<MatchTile
						key={matchOnBoard.board}
						matchOnBoard={matchOnBoard}
						roundName={isOneRound ? undefined : roundName}
						playing={playing}
						swapPicking={swapPicking}
						onWin={onWin}
						onForfeit={onForfeit}
					/>
				))}
			</ul>
		</section>
	);
};

/*
 * A panel header's background: raised for the Winners
 * Bracket, the main one, and the panel's own for the Losers.
 */
const panelHeads: Record<BracketName, string> = {
	winners: 'bg-raised',
	losers: '',
};

/*
 * Asks which Player is forfeiting a Match before recording the Forfeit,
 * since the Players' buttons record a winner: the one picked here
 * loses. Quieter than those buttons, as a Forfeit is the rarer result.
 */
const ForfeitButton = ({
	board,
	players,
	onForfeit,
}: {
	board: BoardNumber;
	players: readonly [Player, Player];
	onForfeit: (player: Player) => void;
}) => {
	const dialog = useRef<HTMLDialogElement>(null);
	const messageId = useId();
	return (
		<>
			<button
				type="button"
				className="text-danger hover:bg-divider min-h-7 rounded-lg px-1.5 text-xs font-bold tracking-widest uppercase"
				onClick={() => dialog.current?.showModal()}
			>
				Forfeit
			</button>
			<dialog ref={dialog} aria-labelledby={messageId} className={dialogBox}>
				<p id={messageId} className="text-lg">
					Who is forfeiting the Match on Board {board}?
				</p>
				<div className="mt-6 flex justify-end gap-2">
					<button
						type="button"
						className={button}
						onClick={() => dialog.current?.close()}
					>
						Cancel
					</button>
					{players.map((player) => (
						<button
							key={player.id}
							type="button"
							className={`${confirmButton} ${confirmColours.destructive}`}
							onClick={() => {
								dialog.current?.close();
								onForfeit(player);
							}}
						>
							{player.name}
						</button>
					))}
				</div>
			</dialog>
		</>
	);
};

/*
 * The box each Player takes in a Match tile, whether a button to record a winner, a seat to tap in
 * Swap mode or their name: the same height, and the name in the same place, every way, so neither
 * Swap mode nor Start moves a name or a tile. A name that can't be tapped is boxed too, filled but
 * with no outline, so it reads as the Player's place in the Match without looking like a button.
 */
const playerSlot = 'flex min-h-11.5 w-full items-center rounded-lg border text-lg font-semibold';
const playerSlots = {
	winnerButton: `${playerSlot} border-line bg-panel px-3.5 text-left hover:bg-divider`,
	name: `${playerSlot} border-transparent bg-panel px-3.5`,
	seat: `${playerSlot} px-3.5 text-left`,
};

/*
 * One Match's tile: a narrow column with its Board, a label above its large number,
 * then its Round, in smaller type, when given, and at the foot the Forfeit, once the
 * Match can be forfeited; beside it, the Players one above the other. Once Started,
 * a Match with both Players known can be won by tapping either. The Forfeit comes
 * after the Players in the tile's own order, so it is read and tabbed to last.
 */
const MatchTile = ({
	matchOnBoard: {
		board,
		match,
		players: [playerA, playerB],
	},
	roundName,
	playing,
	swapPicking,
	onWin,
	onForfeit,
}: {
	matchOnBoard: MatchOnBoard;
	roundName?: string;
	playing: boolean;
	swapPicking?: SwapPicking;
	onWin: (match: MatchPlace, winner: Player, loser: Player) => void;
	onForfeit: (match: MatchPlace, player: Player) => void;
}) => {
	// Only a Match with both Players known can be won: each one's loss is the other's win.
	const knownPlayerB = 'name' in playerB ? playerB : undefined;
	const canWin = playing && knownPlayerB !== undefined;
	const winForA = () => knownPlayerB && onWin(match, playerA, knownPlayerB);
	const winForB = () => knownPlayerB && onWin(match, knownPlayerB, playerA);
	const forfeitMatch = (player: Player) => onForfeit(match, player);
	return (
		/*
		 * The Board's column has two rows beside the Players: the Board and its Round at the
		 * top, the Forfeit at the foot, level with the foot of the second Player, so the Board
		 * stays put when Start brings the Forfeit. A tile stretches to the tallest in its line,
		 * such as one whose Player waits on a winner named over two lines; its rows keep their
		 * own height at the top, so the Forfeit stays beside the second Player and the space
		 * left is below. Relative, so the "vs" read out between the Players, drawn nowhere,
		 * stays inside the tile rather than stretching the page below the list it scrolls in.
		 */
		<li className="border-divider bg-raised relative grid grid-cols-[3.5rem_minmax(0,1fr)] grid-rows-[auto_auto] content-start gap-x-3 rounded-xl border p-3">
			<span className="col-start-1 row-start-1 flex flex-col items-center">
				<span className="text-muted text-xs font-bold tracking-widest uppercase">
					Board
				</span>{' '}
				<span className="text-card-number text-4xl leading-none font-extrabold">
					{board}
				</span>
				{roundName && (
					<span className="text-muted mt-1 text-xs font-semibold whitespace-nowrap">
						{roundName}
					</span>
				)}
			</span>
			<div className="col-start-2 row-span-2 row-start-1 flex flex-col gap-2">
				<MatchPlayer
					player={playerA}
					match={match}
					canWin={canWin}
					swapPicking={swapPicking}
					onWin={winForA}
				/>
				<span className="sr-only"> vs </span>
				<MatchPlayer
					player={playerB}
					match={match}
					canWin={canWin}
					swapPicking={swapPicking}
					onWin={winForB}
				/>
			</div>
			{canWin && (
				<div className="col-start-1 row-start-2 flex justify-center self-end">
					<ForfeitButton
						board={board}
						players={[playerA, knownPlayerB]}
						onForfeit={forfeitMatch}
					/>
				</div>
			)}
		</li>
	);
};

/*
 * One Player in a Match tile: a button to tap once the Match can be won, a
 * seat to tap in Swap mode, otherwise their name. The seat fills the Player's
 * slot, its name where the plain name and the winner's button put it.
 */
const MatchPlayer = ({
	player,
	match,
	canWin,
	swapPicking,
	onWin,
}: {
	player: Opponent;
	match: MatchPlace;
	canWin: boolean;
	swapPicking?: SwapPicking;
	onWin: () => void;
}) =>
	canWin && 'name' in player ? (
		<button type="button" className={playerSlots.winnerButton} onClick={onWin}>
			{player.name}
		</button>
	) : swapPicking && 'name' in player ? (
		<SwapButton
			player={player}
			match={match}
			swapPicking={swapPicking}
			shape={playerSlots.seat}
		/>
	) : (
		<span className={playerSlots.name}>{getPlayerName(player)}</span>
	);

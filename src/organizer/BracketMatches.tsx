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
import { bracketTitles, describeBoardCount, describeRound, joinNames } from '../wording';
import { BracketBadge } from './BracketBadge';
import { button, confirmButton, confirmColours, dialogBox } from './classes';
import { PlayerName, type SwapPicking } from './PlayerName';

// The Rounds a bracket's Matches on a Board are in, by name, earliest first: "Round 1", "Final".
const listRoundNames = (tournament: Tournament, matches: readonly MatchOnBoard[]): string[] => {
	const shownRounds = matches.map(({ match }) => getShownRound(tournament, match));
	const sorted = [...shownRounds].sort((x, y) => x.round - y.round);
	const names = sorted.map(describeRound);
	return [...new Set(names)];
};

/*
 * One bracket's Matches holding a Board, in a panel of its own. Its header has the bracket's badge and name,
 * the Rounds its Matches are in and how many Boards they hold. Each Match is a tile naming its Board and both
 * Players, and once Started records a winner or a Forfeit. A tile names its Round only when the panel holds
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
	const roundNames = listRoundNames(tournament, matches);
	const isOneRound = roundNames.length === 1;
	const summary = `${joinNames(roundNames)} · ${describeBoardCount(matches.length)}`;
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
				{matches.map((matchOnBoard) => (
					<MatchTile
						key={matchOnBoard.board}
						matchOnBoard={matchOnBoard}
						roundName={
							isOneRound
								? undefined
								: describeRound(getShownRound(tournament, matchOnBoard.match))
						}
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

// A panel header's background: raised for the Winners Bracket, the main one, and the panel's own for the Losers.
const panelHeads: Record<BracketName, string> = {
	winners: 'bg-raised',
	losers: '',
};

/*
 * Asks which Player is forfeiting a Match before recording the Forfeit, since the Players' buttons record a
 * winner: the one picked here loses. Quieter than those buttons, as a Forfeit is the rarer result.
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
				className="text-danger hover:bg-divider -mr-1.5 min-h-8 rounded-lg px-1.5 text-xs font-bold tracking-widest uppercase"
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
 * The box each Player takes in a Match tile, whether a button to tap or their name: the same height either
 * way, so Start turns names into buttons without moving a tile.
 */
const playerSlot = 'flex min-h-11.5 w-full items-center rounded-lg border text-lg font-semibold';
const playerSlots = {
	winnerButton: `${playerSlot} border-line bg-panel px-3.5 text-left hover:bg-divider`,
	name: `${playerSlot} border-transparent px-0.5`,
};

/*
 * One Match's tile. Its top line holds the Round, when given, and at its end the Forfeit, once the Match can be
 * forfeited; the line keeps its height without them, so Start moves nothing. Beneath, the Players one above the
 * other. Beside both lines, the Board, its label close above its large number, sits in the middle of the tile.
 * Once Started, a Match with both Players known can be won by tapping either. The Forfeit comes after the
 * Players in the tile's own order, so it is read and tabbed to last.
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
		 * Relative, so the "vs" read out between the Players, drawn nowhere, stays inside the tile rather than
		 * stretching the page below the list it scrolls in.
		 */
		<li className="border-divider bg-raised relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto] grid-rows-[minmax(2rem,auto)_auto] gap-x-3 gap-y-1 rounded-xl border p-3">
			<span className="col-start-1 row-span-2 row-start-1 flex flex-col items-center self-center">
				<span className="text-muted text-xs font-bold tracking-widest uppercase">
					Board
				</span>{' '}
				<span className="text-board-number text-4xl leading-none font-extrabold">
					{board}
				</span>
			</span>
			{roundName && (
				<span className="text-muted col-start-2 row-start-1 self-center text-sm font-semibold">
					{roundName}
				</span>
			)}
			<div className="col-span-2 col-start-2 row-start-2 flex flex-col gap-2">
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
				<div className="col-start-3 row-start-1 self-center">
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
 * One Player in a Match tile: a button to tap once the Match can be won, otherwise their name, which is a
 * button of its own in Swap mode.
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
	) : (
		<span className={playerSlots.name}>
			<PlayerName player={player} match={match} swapPicking={swapPicking} />
		</span>
	);

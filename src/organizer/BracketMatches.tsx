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
import { bracketTitles, describeRound, getPlayerName } from '../wording';
import { button, confirmButton, confirmColours, dangerButton, dialogBox } from './classes';

/*
 * One bracket's Matches holding a Board, under the bracket's title: each row names its Board, its Round and
 * both Players, and once Started records a winner or a Forfeit. Hidden while the bracket has none.
 */
export const BracketMatches = ({
	tournament,
	bracketName,
	matches,
	playing,
	onWin,
	onForfeit,
}: {
	tournament: Tournament;
	bracketName: BracketName;
	matches: readonly MatchOnBoard[];
	playing: boolean;
	onWin: (match: MatchPlace, winner: Player, loser: Player) => void;
	onForfeit: (match: MatchPlace, player: Player) => void;
}) => {
	const headingId = useId();
	if (matches.length === 0) {
		return null;
	}
	return (
		<>
			<h3 id={headingId} className="mt-4 text-lg font-bold first:mt-0">
				{bracketTitles[bracketName]}
			</h3>
			<ul aria-labelledby={headingId}>
				{matches.map((matchOnBoard) => (
					<MatchRow
						key={matchOnBoard.board}
						matchOnBoard={matchOnBoard}
						roundName={describeRound(getShownRound(tournament, matchOnBoard.match))}
						playing={playing}
						onWin={onWin}
						onForfeit={onForfeit}
					/>
				))}
			</ul>
		</>
	);
};

/*
 * Asks which Player is forfeiting a Match before recording the Forfeit, since the names in the row record a
 * winner: the one picked here loses.
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
				className={dangerButton}
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
 * Fixed columns, so each Board, its Round and both Players line up down the list however long the names. The first
 * Player sits against the "vs", like a scoreboard, so it is as close to one name as to the other.
 */
const matchRow =
	'grid grid-cols-[6rem_6rem_11rem_3rem_1fr_auto] items-center border-b border-gray-300 py-1.5 text-lg';

/*
 * One Match's row: its Board, its Round and both Players. Once Started, a Match with both Players known can be won by
 * tapping either, or forfeited.
 */
const MatchRow = ({
	matchOnBoard: {
		board,
		match,
		players: [a, b],
	},
	roundName,
	playing,
	onWin,
	onForfeit,
}: {
	matchOnBoard: MatchOnBoard;
	roundName: string;
	playing: boolean;
	onWin: (match: MatchPlace, winner: Player, loser: Player) => void;
	onForfeit: (match: MatchPlace, player: Player) => void;
}) => {
	// Only a Match with both Players known can be won: each one's loss is the other's win.
	const knownSecondPlayer = 'name' in b ? b : undefined;
	const canWin = playing && knownSecondPlayer !== undefined;
	const winForFirst = () => knownSecondPlayer && onWin(match, a, knownSecondPlayer);
	const winForSecond = () => knownSecondPlayer && onWin(match, knownSecondPlayer, a);
	const forfeitMatch = (player: Player) => onForfeit(match, player);
	return (
		<li className={matchRow}>
			<span className="font-semibold">Board {board}</span>
			<span className="text-gray-700">{roundName}</span>
			<div className="text-right">
				<MatchPlayer player={a} canWin={canWin} onWin={winForFirst} />
			</div>
			<span className="text-center"> vs </span>
			<div>
				<MatchPlayer player={b} canWin={canWin} onWin={winForSecond} />
			</div>
			{canWin && (
				<ForfeitButton
					board={board}
					players={[a, knownSecondPlayer]}
					onForfeit={forfeitMatch}
				/>
			)}
		</li>
	);
};

// One Player in a Match row: a button to tap once the Match can be won, otherwise their name.
const MatchPlayer = ({
	player,
	canWin,
	onWin,
}: {
	player: Opponent;
	canWin: boolean;
	onWin: () => void;
}) =>
	canWin && 'name' in player ? (
		<WinnerButton player={player} onWin={onWin} />
	) : (
		// Padded as a button is, so names line up whether they can be tapped or not.
		<span className="border border-transparent px-3">{getPlayerName(player)}</span>
	);

const WinnerButton = ({ player, onWin }: { player: Player; onWin: () => void }) => (
	<button type="button" className={button} onClick={onWin}>
		{player.name}
	</button>
);

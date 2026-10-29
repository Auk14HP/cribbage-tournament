import { useId, useRef, useState } from 'react';
import {
	getMatchesOnBoards,
	getBracketPicture,
	isLosersBracketOpenTo,
	recordForfeit,
	recordWinner,
	start,
	type BoardNumber,
	type MatchOnBoard,
	type MatchPlace,
	type Opponent,
	type Player,
	type StayingAnswer,
	type Tournament,
} from '../tournament';
import { getPlayerName } from '../wording';
import {
	button,
	confirmButton,
	confirmColours,
	dangerButton,
	dialogBox,
	primaryButton,
} from './classes';
import { Refusal, type Apply } from './controls';
import { Results } from './Results';
import { ScreenTiming } from './ScreenTiming';
import { StayingDialog } from './StayingDialog';
import { WaitingForBoard } from './WaitingForBoard';

// A result waiting on the loser's answer to whether they are staying for the Losers Bracket.
interface Asking {
	readonly loser: Player;
	readonly record: (answer: StayingAnswer) => void;
}

/*
 * The Matches holding a Board: the ones the Draw seats while the TV holds Tonight’s Draw, then the ones
 * being played. Once Started, tapping a Player's name records them as the winner, and a Forfeit records
 * their opponent's. A Player losing their first Match is asked first whether they are staying for the
 * Losers Bracket. Matches waiting for a Board are listed beneath. Results that can still be undone are
 * listed, latest first, to correct a mistake.
 */
export const Draw = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const matches = getMatchesOnBoards(tournament);
	const { champion } = getBracketPicture(tournament, 'winners')!;
	const losersChampion = getBracketPicture(tournament, 'losers')?.champion;
	const playing = tournament.phase === 'inProgress';
	const [refusal, setRefusal] = useState('');
	const [asking, setAsking] = useState<Asking>();
	const stayingDialog = useRef<HTMLDialogElement>(null);
	// Records the result at once, or once the loser has said whether they are staying.
	const recordOrAsk = (loser: Player, record: (answer?: StayingAnswer) => void) => {
		if (!isLosersBracketOpenTo(tournament, loser.id)) {
			record();
			return;
		}
		setAsking({ loser, record });
		stayingDialog.current?.showModal();
	};
	const recordWinnerOf = (match: MatchPlace, winner: Player, loser: Player) => {
		recordOrAsk(loser, (answer) => {
			const reason = apply(recordWinner(tournament, match, winner.id, answer));
			setRefusal(reason);
		});
	};
	const recordForfeitBy = (match: MatchPlace, leaver: Player) => {
		recordOrAsk(leaver, (answer) => {
			const reason = apply(recordForfeit(tournament, match, leaver.id, answer));
			setRefusal(reason);
		});
	};
	const pressStart = () => {
		const reason = apply(start(tournament));
		setRefusal(reason);
	};
	return (
		<div className="mt-6 flex items-start gap-12">
			<section className="flex-1">
				{champion && (
					<p className="text-2xl font-bold text-green-800">Champion: {champion.name}</p>
				)}
				{losersChampion && (
					<p className="text-2xl font-bold text-green-800">
						Losers Bracket champion: {losersChampion.name}
					</p>
				)}
				{matches.length > 0 && (
					<>
						<h2 className="text-xl font-bold">Matches</h2>
						{playing && <p className="mt-1 text-gray-700">Tap a Match’s winner.</p>}
						<ul aria-label="Matches" className="mt-2">
							{matches.map((matchOnBoard) => (
								<MatchRow
									key={matchOnBoard.board}
									matchOnBoard={matchOnBoard}
									playing={playing}
									onWin={recordWinnerOf}
									onForfeit={recordForfeitBy}
								/>
							))}
						</ul>
					</>
				)}
				{playing && <Refusal reason={refusal} />}
				<WaitingForBoard tournament={tournament} />
				<StayingDialog
					ref={stayingDialog}
					loser={asking?.loser}
					onAnswer={(answer) => asking?.record(answer)}
				/>
			</section>
			<section className="w-80">
				{tournament.phase === 'drawShown' && (
					<>
						<p>
							The TV holds Tonight’s Draw until you press Start, so everyone can find
							their Board.
						</p>
						<button
							type="button"
							className={`${primaryButton} mt-2 w-full`}
							onClick={pressStart}
						>
							Start
						</button>
						<Refusal reason={refusal} />
					</>
				)}
				{/* Below the TV screens box, so the list growing never moves that box. */}
				<ScreenTiming tournament={tournament} apply={apply} />
				<Results tournament={tournament} apply={apply} />
			</section>
		</div>
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
 * Fixed columns, so each Board and both Players line up down the list however long the names. The first
 * Player sits against the "vs", like a scoreboard, so it is as close to one name as to the other.
 */
const matchRow =
	'grid grid-cols-[6rem_11rem_3rem_1fr_auto] items-center border-b border-gray-300 py-1.5 text-lg';

/*
 * One Match's row: its Board and both Players. Once Started, a Match with both Players known can be won by
 * tapping either, or forfeited.
 */
const MatchRow = ({
	matchOnBoard: {
		board,
		match,
		players: [a, b],
	},
	playing,
	onWin,
	onForfeit,
}: {
	matchOnBoard: MatchOnBoard;
	playing: boolean;
	onWin: (match: MatchPlace, winner: Player, loser: Player) => void;
	onForfeit: (match: MatchPlace, player: Player) => void;
}) => {
	// Only a Match with both Players known can be won: each one's loss is the other's win.
	const opponent = 'name' in b ? b : undefined;
	const canWin = playing && opponent !== undefined;
	const winForFirst = () => opponent && onWin(match, a, opponent);
	const winForSecond = () => opponent && onWin(match, opponent, a);
	const forfeitMatch = (player: Player) => onForfeit(match, player);
	return (
		<li className={matchRow}>
			<span className="font-semibold">Board {board}</span>
			<div className="text-right">
				<MatchPlayer player={a} canWin={canWin} onWin={winForFirst} />
			</div>
			<span className="text-center"> vs </span>
			<div>
				<MatchPlayer player={b} canWin={canWin} onWin={winForSecond} />
			</div>
			{canWin && (
				<ForfeitButton board={board} players={[a, opponent]} onForfeit={forfeitMatch} />
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

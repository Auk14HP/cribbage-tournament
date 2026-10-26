/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useId, useRef, useState, type RefObject, type SubmitEvent } from 'react';
import type { Result } from './result';
import type { Store } from './storage';
import {
	makeDraw,
	getMatchesOnBoards,
	createTournament,
	recordWinner,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	start,
	getWinnersBracketPicture,
	type MatchPlace,
	type Phase,
	type Player,
	type PlayerId,
	type Tournament,
	type WinnerOf,
} from './tournament';
import { useTournament } from './useTournament';
import { getPlayerName, describePlayersRegistered } from './wording';

const button = 'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200';
const dangerButton = `${button} text-red-700`;
const primaryButton =
	'rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white hover:bg-blue-800';
const confirmButton = 'rounded px-3 py-1.5 font-semibold text-white';
const textInput = 'rounded border border-gray-400 px-3 py-1.5';

const headings: Record<Phase, string> = {
	registration: 'Register Players',
	drawShown: 'Tonight’s Draw',
	inProgress: 'Now playing',
};

// Saves the change if the core accepted it. Returns the reason it was refused, or '' if accepted.
type Apply = (outcome: Result<Tournament>) => string;

export const Organizer = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	// Bumped by a new Tournament, so registration starts afresh: empty boxes, nothing being renamed.
	const [newTournaments, setNewTournaments] = useState(0);

	const apply: Apply = (outcome) => {
		if (!outcome.ok) {
			return outcome.reason;
		}
		store.save(outcome.value);
		return '';
	};

	const newTournamentDialog = useRef<HTMLDialogElement>(null);

	const startNewTournament = () => {
		store.save(createTournament());
		setNewTournaments((count) => count + 1);
	};

	return (
		<main className="px-8 py-6">
			<header className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">{headings[tournament.phase]}</h1>
				<nav className="flex items-center gap-4">
					<a
						href="/display"
						target="cribbage-display"
						className="text-blue-700 underline"
					>
						Open TV display
					</a>
					<button
						type="button"
						className={dangerButton}
						onClick={() => newTournamentDialog.current?.showModal()}
					>
						Start a new Tournament
					</button>
				</nav>
			</header>
			<ConfirmDialog
				ref={newTournamentDialog}
				message="Start a new Tournament? Every Player, Board and the Draw will be cleared."
				confirmLabel="Start a new Tournament"
				isDestructive
				onConfirm={startNewTournament}
			/>
			{tournament.phase === 'registration' ? (
				<Registration key={newTournaments} tournament={tournament} apply={apply} />
			) : (
				<Draw tournament={tournament} apply={apply} />
			)}
		</main>
	);
};

const Registration = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [name, setName] = useState('');
	const [boardCount, setTypedBoardCount] = useState(
		tournament.boards.length > 0 ? String(tournament.boards.length) : '',
	);
	const [renaming, setRenaming] = useState<PlayerId>();
	// Each refusal shows beside the controls that caused it.
	const [playersRefusal, setPlayersRefusal] = useState('');
	const [boardsRefusal, setBoardsRefusal] = useState('');
	const nameInput = useRef<HTMLInputElement>(null);
	const drawDialog = useRef<HTMLDialogElement>(null);

	const register = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const refusal = apply(registerPlayer(tournament, name));
		setPlayersRefusal(refusal);
		if (!refusal) {
			setName('');
		}
		nameInput.current?.focus();
	};

	const startRenaming = (playerId: PlayerId) => {
		setRenaming(playerId);
		setPlayersRefusal('');
	};

	const stopRenaming = () => {
		setRenaming(undefined);
		setPlayersRefusal('');
	};

	// Saved as it is typed, so the Draw always uses the number on screen.
	const changeBoardCount = (typed: string) => {
		setTypedBoardCount(typed);
		const refusal = apply(setBoardCount(tournament, typed));
		setBoardsRefusal(refusal);
	};

	const draw = () => {
		const refusal = apply(makeDraw(tournament, Math.random));
		setBoardsRefusal(refusal);
	};

	const remove = (playerId: PlayerId) => {
		const refusal = apply(removePlayer(tournament, playerId));
		setPlayersRefusal(refusal);
	};

	return (
		<div className="mt-6 flex items-start gap-12">
			<section aria-label="Players" className="flex-1">
				<form onSubmit={register} className="flex items-center gap-2">
					<label className="flex items-center gap-2">
						Player name
						<input
							ref={nameInput}
							type="text"
							placeholder="Name the room knows them by"
							autoComplete="off"
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							className={`${textInput} w-80`}
						/>
					</label>
					<button type="submit" className={button}>
						Register
					</button>
				</form>
				<Refusal reason={playersRefusal} />
				<p className="mt-2">{describePlayersRegistered(tournament.players.length)}</p>
				<ul aria-label="Players" className="mt-2">
					{tournament.players.map((player) =>
						player.id === renaming ? (
							<RenameRow
								key={player.id}
								player={player}
								onSave={(newName) => {
									const refusal = apply(
										renamePlayer(tournament, player.id, newName),
									);
									if (refusal) {
										setPlayersRefusal(refusal);
									} else {
										stopRenaming();
									}
								}}
								onCancel={stopRenaming}
							/>
						) : (
							<li
								key={player.id}
								className="flex items-center gap-2 border-b border-gray-300 py-1.5"
							>
								<span className="flex-1 text-lg">{player.name}</span>
								<button
									type="button"
									className={button}
									onClick={() => startRenaming(player.id)}
								>
									Rename
								</button>
								<button
									type="button"
									className={dangerButton}
									onClick={() => remove(player.id)}
								>
									Remove
								</button>
							</li>
						),
					)}
				</ul>
			</section>
			<section aria-label="Boards and the Draw" className="w-80">
				<h2 className="text-xl font-bold">Boards</h2>
				<label className="mt-2 flex items-center gap-2">
					Number of Boards
					<input
						type="text"
						inputMode="numeric"
						autoComplete="off"
						value={boardCount}
						onChange={(event) => changeBoardCount(event.target.value)}
						className={`${textInput} w-20`}
					/>
				</label>
				{!boardsRefusal && tournament.boards.length > 0 && (
					<p className="mt-2 text-gray-700">Placards 1 to {tournament.boards.length}</p>
				)}
				<button
					type="button"
					className={`${primaryButton} mt-8 w-full`}
					onClick={() => drawDialog.current?.showModal()}
				>
					Make the Draw
				</button>
				<ConfirmDialog
					ref={drawDialog}
					message="Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards."
					confirmLabel="Make the Draw"
					onConfirm={draw}
				/>
				<Refusal reason={boardsRefusal} />
			</section>
		</div>
	);
};

/*
 * The Matches holding a Board: the ones the Draw seats while the TV holds Tonight’s Draw, then the ones
 * being played. Once Started, tapping a Player's name records them as the winner.
 */
const Draw = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const matches = getMatchesOnBoards(tournament);
	const { champion } = getWinnersBracketPicture(tournament)!;
	const playing = tournament.phase === 'inProgress';
	const [refusal, setRefusal] = useState('');
	const recordWinnerOf = (match: MatchPlace, player: Player) => {
		const reason = apply(recordWinner(tournament, match, player.id));
		setRefusal(reason);
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
				{matches.length > 0 && (
					<>
						<h2 className="text-xl font-bold">Matches</h2>
						{playing && <p className="mt-1 text-gray-700">Tap a Match’s winner.</p>}
						<ul aria-label="Matches" className="mt-2">
							{matches.map(({ board, match, players: [a, b] }) => {
								// Once Started, a Match with both Players known can be won by tapping either.
								const canWin = playing && 'name' in b;
								const onWin = (player: Player) => recordWinnerOf(match, player);
								return (
									<li key={board} className={matchRow}>
										<span className="font-semibold">Board {board}</span>
										<div className="text-right">
											<MatchPlayer player={a} canWin={canWin} onWin={onWin} />
										</div>
										<span className="text-center"> vs </span>
										<div>
											<MatchPlayer player={b} canWin={canWin} onWin={onWin} />
										</div>
									</li>
								);
							})}
						</ul>
					</>
				)}
				{playing && <Refusal reason={refusal} />}
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
			</section>
		</div>
	);
};

/*
 * Fixed columns, so each Board and both Players line up down the list however long the names. The first
 * Player sits against the "vs", like a scoreboard, so it is as close to one name as to the other.
 */
const matchRow =
	'grid grid-cols-[6rem_11rem_3rem_1fr] items-center border-b border-gray-300 py-1.5 text-lg';

// One Player in a Match row: a button to tap once the Match can be won, otherwise their name.
const MatchPlayer = ({
	player,
	canWin,
	onWin,
}: {
	player: Player | WinnerOf;
	canWin: boolean;
	onWin: (player: Player) => void;
}) =>
	canWin && 'name' in player ? (
		<WinnerButton player={player} onWin={() => onWin(player)} />
	) : (
		// Padded as a button is, so names line up whether they can be tapped or not.
		<span className="border border-transparent px-3">{getPlayerName(player)}</span>
	);

const WinnerButton = ({ player, onWin }: { player: Player; onWin: () => void }) => (
	<button type="button" className={button} onClick={onWin}>
		{player.name}
	</button>
);

/*
 * Asks the Organizer to confirm an action before it is taken: open it with `showModal()` on its ref.
 * Cancel or Escape closes it and nothing happens. A destructive action gets a red confirm button. Being the browser's modal <dialog>, it takes focus
 * when it opens (on Cancel, the safe answer) and gives it back to the page when it closes.
 */
const ConfirmDialog = ({
	ref,
	message,
	confirmLabel,
	isDestructive = false,
	onConfirm,
}: {
	ref: RefObject<HTMLDialogElement | null>;
	message: string;
	confirmLabel: string;
	isDestructive?: boolean;
	onConfirm: () => void;
}) => {
	const messageId = useId();
	return (
		<dialog
			ref={ref}
			aria-labelledby={messageId}
			className="m-auto max-w-lg rounded-lg p-6 shadow-xl backdrop:bg-black/40"
		>
			<p id={messageId} className="text-lg">
				{message}
			</p>
			<div className="mt-6 flex justify-end gap-2">
				<button type="button" className={button} onClick={() => ref.current?.close()}>
					Cancel
				</button>
				<button
					type="button"
					className={`${confirmButton} ${isDestructive ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'}`}
					onClick={() => {
						ref.current?.close();
						onConfirm();
					}}
				>
					{confirmLabel}
				</button>
			</div>
		</dialog>
	);
};

const Refusal = ({ reason }: { reason: string }) => (
	<p role="alert" className="mt-2 min-h-6 font-semibold text-red-700">
		{reason}
	</p>
);

const RenameRow = ({
	player,
	onSave,
	onCancel,
}: {
	player: Player;
	onSave: (name: string) => void;
	onCancel: () => void;
}) => {
	const [name, setName] = useState(player.name);
	return (
		<li className="border-b border-gray-300 py-1.5">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onSave(name);
				}}
				className="flex items-center gap-2"
			>
				<input
					type="text"
					aria-label={`New name for ${player.name}`}
					autoComplete="off"
					autoFocus
					value={name}
					onChange={(event) => setName(event.target.value)}
					className={`${textInput} flex-1 text-lg`}
				/>
				<button type="submit" className={button}>
					Save
				</button>
				<button type="button" className={button} onClick={onCancel}>
					Cancel
				</button>
			</form>
		</li>
	);
};

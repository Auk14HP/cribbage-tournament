// Registration: Players registered, renamed and removed, the Boards set out, then the Draw made.
import { useRef, useState, type SubmitEvent } from 'react';
import type { Result } from '../result';
import {
	clearHomeBoard,
	makeDraw,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	setHomeBoard,
	type BoardNumber,
	type Player,
	type PlayerId,
	type Tournament,
} from '../tournament';
import { describePlayersRegistered } from '../wording';
import { button, dangerButton, primaryButton, textInput } from './classes';
import { ConfirmDialog, NumberBox, Refusal, type Apply } from './controls';
import { ScreenTiming } from './ScreenTiming';

export const Registration = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [name, setName] = useState('');
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

	// The Boards, the Home Board and the Draw share one refusal line, below Make the Draw.
	const applyToBoards = (outcome: Result<Tournament>) => {
		const refusal = apply(outcome);
		setBoardsRefusal(refusal);
	};

	const saveBoardCount = (typed: string) => {
		applyToBoards(setBoardCount(tournament, typed));
	};

	const draw = () => {
		applyToBoards(makeDraw(tournament, Math.random));
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
			<div className="w-80">
				<section aria-label="Boards and the Draw">
					<h2 className="text-xl font-bold">Boards</h2>
					<NumberBox
						label="Number of Boards"
						saved={tournament.boards.length > 0 ? String(tournament.boards.length) : ''}
						onSave={saveBoardCount}
					/>
					{/*
					 * Its line is kept even when empty, so saving the Boards as the Organizer leaves the box for
					 * Make the Draw doesn't move the button out from under their click.
					 */}
					<p className="mt-2 min-h-6 text-gray-700">
						{!boardsRefusal &&
							tournament.boards.length > 0 &&
							`Placards 1 to ${tournament.boards.length}`}
					</p>
					<HomeBoardPicker tournament={tournament} onChange={applyToBoards} />
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
				<ScreenTiming tournament={tournament} apply={apply} />
			</div>
		</div>
	);
};

/*
 * Gives one Player a Home Board: a Player, or Nobody, and a Board from those set out. Picking another
 * Player moves the Home Board to them. A Board picked while Nobody has it is kept here for when a Player is
 * picked. Always shown, so Make the Draw below never moves as the Boards are set out.
 */
const HomeBoardPicker = ({
	tournament,
	onChange,
}: {
	tournament: Tournament;
	onChange: (outcome: Result<Tournament>) => void;
}) => {
	const [pickedBoard, setPickedBoard] = useState<BoardNumber>(1);
	const { boards } = tournament;
	const [home] = tournament.homeBoards;
	const isPickedSetOut = boards.includes(pickedBoard);
	const board = home?.board ?? (isPickedSetOut ? pickedBoard : boards[0]);

	const pickPlayer = (value: string) => {
		const unchanged: Result<Tournament> = { ok: true, value: tournament };
		const cleared = home ? clearHomeBoard(tournament, home.player) : unchanged;
		if (!cleared.ok || value === '') {
			onChange(cleared);
			return;
		}
		const playerId = Number(value);
		// With no Boards set out there is no Board to pick, and the Tournament says why.
		onChange(setHomeBoard(cleared.value, playerId, board ?? 1));
	};

	const pickBoard = (value: string) => {
		const picked = Number(value);
		setPickedBoard(picked);
		if (home) {
			onChange(setHomeBoard(tournament, home.player, picked));
		}
	};

	return (
		<>
			<label className="mt-2 flex items-center gap-2">
				Home Board for
				<select
					value={home?.player ?? ''}
					onChange={(event) => pickPlayer(event.target.value)}
					className={`${textInput} flex-1`}
				>
					<option value="">Nobody</option>
					{tournament.players.map((player) => (
						<option key={player.id} value={player.id}>
							{player.name}
						</option>
					))}
				</select>
			</label>
			<label className="mt-2 flex items-center gap-2">
				Board
				<select
					value={board ?? ''}
					disabled={boards.length === 0}
					onChange={(event) => pickBoard(event.target.value)}
					className={textInput}
				>
					{boards.map((number) => (
						<option key={number} value={number}>
							{number}
						</option>
					))}
				</select>
			</label>
		</>
	);
};

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

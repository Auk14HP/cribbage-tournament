// Registration: Players registered, renamed and removed, and the Boards set out, before the House Rules.
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { Result } from '../result';
import {
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	showHouseRules,
	type Player,
	type PlayerId,
	type Tournament,
} from '../tournament';
import { describePlayersRegistered } from '../wording';
import { button, dangerButton, panel, primaryButton, textInput, windowFilling } from './classes';
import { NumberBox, Refusal, type Apply } from './controls';
import { HomeBoardPicker } from './HomeBoardPicker';
import { TvDisplay } from './TvDisplay';

export const Registration = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [name, setName] = useState('');
	const [renaming, setRenaming] = useState<PlayerId>();
	// Each refusal shows beside the controls that caused it.
	const [playersRefusal, setPlayersRefusal] = useState('');
	const [boardsRefusal, setBoardsRefusal] = useState('');
	const nameInput = useRef<HTMLInputElement>(null);
	const playersList = useRef<HTMLUListElement>(null);
	const playerCount = tournament.players.length;
	const shownPlayerCount = useRef(playerCount);

	/*
	 * Scrolls the Players list to its end when a Player is registered, so the new Player's row, added last,
	 * is in view however long the list.
	 */
	useEffect(() => {
		const list = playersList.current;
		if (list && playerCount > shownPlayerCount.current) {
			list.scrollTop = list.scrollHeight;
		}
		shownPlayerCount.current = playerCount;
	}, [playerCount]);

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

	// The Boards, the Home Board and Show House Rules share one refusal line, below Show House Rules.
	const applyToBoards = (outcome: Result<Tournament>) => {
		const refusal = apply(outcome);
		setBoardsRefusal(refusal);
	};

	const saveBoardCount = (typed: string) => {
		applyToBoards(setBoardCount(tournament, typed));
	};

	const goToHouseRules = () => {
		applyToBoards(showHouseRules(tournament));
	};

	const remove = (playerId: PlayerId) => {
		const refusal = apply(removePlayer(tournament, playerId));
		setPlayersRefusal(refusal);
	};

	return (
		<div className={windowFilling.row}>
			<div className={windowFilling.mainColumn}>
				<section aria-label="Players" className={`${panel} ${windowFilling.column}`}>
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
					<ul
						ref={playersList}
						aria-label="Players"
						className={`${windowFilling.scrollingArea} mt-2`}
					>
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
									className="border-divider flex items-center gap-2 border-b py-1.5"
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
			</div>
			<div className={windowFilling.sideColumn}>
				{/* First in the side column on every step, so it stays in one place all night. */}
				<TvDisplay tournament={tournament} apply={apply} />
				<section aria-label="Boards" className={panel}>
					<h2 className="text-xl font-bold">Boards</h2>
					<NumberBox
						label="Number of Boards"
						saved={tournament.boards.length > 0 ? String(tournament.boards.length) : ''}
						onSave={saveBoardCount}
					/>
					{/*
					 * Its line is kept even when empty, so saving the Boards as the Organizer leaves the box for
					 * Show House Rules doesn't move the button out from under their click.
					 */}
					<p className="text-muted mt-2 min-h-6">
						{!boardsRefusal &&
							tournament.boards.length > 0 &&
							`Placards 1 to ${tournament.boards.length}`}
					</p>
					<HomeBoardPicker tournament={tournament} onChange={applyToBoards} />
					<button
						type="button"
						className={`${primaryButton} mt-8 w-full`}
						onClick={goToHouseRules}
					>
						Show House Rules
					</button>
					<Refusal reason={boardsRefusal} />
				</section>
			</div>
		</div>
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
	const row = useRef<HTMLLIElement>(null);
	// Brings the whole row into view in the Players list, its Save and Cancel too, however far down it is.
	useEffect(() => {
		row.current?.scrollIntoView({ block: 'nearest' });
	}, []);
	return (
		<li ref={row} className="border-divider border-b py-1.5">
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

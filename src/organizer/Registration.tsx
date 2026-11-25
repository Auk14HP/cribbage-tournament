// Registration: Players registered, renamed and removed, and the Boards set out, before the House Rules.
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { Result } from '../result';
import {
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	showHouseRules,
	type PlayerId,
	type Tournament,
} from '../tournament';
import { describePlayersRegistered } from '../wording';
import { panel, primaryButton, textInput, windowFilling } from './classes';
import { NumberBox, Refusal, type Apply } from './controls';
import { HomeBoardPicker } from './HomeBoardPicker';
import { PlayerCell } from './PlayerCell';
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
					<form onSubmit={register} className="flex items-end gap-2.5">
						<label className="text-muted flex flex-1 flex-col gap-1.5 text-sm">
							Player name
							<input
								ref={nameInput}
								type="text"
								placeholder="Name the room knows them by"
								autoComplete="off"
								autoFocus
								value={name}
								onChange={(event) => setName(event.target.value)}
								className={`${textInput} min-h-13 text-xl`}
							/>
						</label>
						<button type="submit" className={`${primaryButton} min-h-13 px-6`}>
							Register
						</button>
					</form>
					<Refusal reason={playersRefusal} />
					<div className="flex items-baseline justify-between">
						<h2 className="text-muted text-sm font-bold tracking-widest uppercase">
							Players
						</h2>
						<p className="font-bold">
							{describePlayersRegistered(tournament.players.length)}
						</p>
					</div>
					<ul
						ref={playersList}
						aria-label="Players"
						className={`${windowFilling.scrollingArea} mt-2 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] content-start gap-x-4 gap-y-1`}
					>
						{tournament.players.map((player) => (
							<PlayerCell
								key={player.id}
								player={player}
								homeBoard={findHomeBoard(tournament, player.id)}
								isRenaming={player.id === renaming}
								onRename={() => startRenaming(player.id)}
								onRemove={() => remove(player.id)}
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
						))}
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

// The Board a Player has as their Home Board, if they have one.
const findHomeBoard = (tournament: Tournament, playerId: PlayerId) =>
	tournament.homeBoards.find((homeBoard) => homeBoard.player === playerId)?.board;

/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useRef, useState, type SubmitEvent } from 'react';
import type { Result } from './result';
import type { Store } from './storage';
import {
	makeDraw,
	newTournament,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	start,
	tonightsDraw,
	type Phase,
	type Player,
	type PlayerId,
	type Tournament,
} from './tournament';
import { useTournament } from './useTournament';
import { playerName, playersRegistered } from './wording';

const button = 'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200';
const dangerButton = `${button} text-red-700`;
const primaryButton =
	'rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white hover:bg-blue-800';
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

	const startNewTournament = () => {
		if (!confirm('Start a new Tournament? Every Player, Board and the Draw will be cleared.')) {
			return;
		}
		store.save(newTournament());
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
					<button type="button" className={dangerButton} onClick={startNewTournament}>
						Start a new Tournament
					</button>
				</nav>
			</header>
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
		setBoardsRefusal(apply(setBoardCount(tournament, typed)));
	};

	const draw = () => {
		if (
			confirm(
				'Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards.',
			)
		) {
			setBoardsRefusal(apply(makeDraw(tournament, Math.random)));
		}
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
				<p className="mt-2">{playersRegistered(tournament.players.length)}</p>
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
									onClick={() =>
										setPlayersRefusal(
											apply(removePlayer(tournament, player.id)),
										)
									}
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
				<button type="button" className={`${primaryButton} mt-8 w-full`} onClick={draw}>
					Make the Draw
				</button>
				<Refusal reason={boardsRefusal} />
			</section>
		</div>
	);
};

// The Matches the Draw seats: shown while the TV holds Tonight’s Draw, and after Start.
const Draw = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const matches = tonightsDraw(tournament)!;
	const [refusal, setRefusal] = useState('');
	return (
		<div className="mt-6 flex items-start gap-12">
			<section className="flex-1">
				<h2 className="text-xl font-bold">Matches</h2>
				<ul aria-label="Matches" className="mt-2">
					{matches.map((match) => (
						<li key={match.board} className="border-b border-gray-300 py-1.5 text-lg">
							<span className="inline-block w-24 font-semibold">
								Board {match.board}
							</span>
							{match.players[0].name} v {playerName(match.players[1])}
						</li>
					))}
				</ul>
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
							onClick={() => setRefusal(apply(start(tournament)))}
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

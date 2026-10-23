/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useRef, useState, type FormEvent } from 'react';
import type { Result } from './result';
import type { Store } from './storage';
import {
	addBoard,
	makeDraw,
	newTournament,
	registerPlayer,
	removeBoard,
	removePlayer,
	renamePlayer,
	roundOneDraw,
	start,
	type Phase,
	type Player,
	type PlayerId,
	type Tournament,
} from './tournament';
import { useTournament } from './useTournament';
import { playersRegistered } from './wording';

const button = 'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200';
const dangerButton = `${button} text-red-700`;
const primaryButton =
	'rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white hover:bg-blue-800';
const textInput = 'rounded border border-gray-400 px-3 py-1.5';

const headings: Record<Phase, string> = {
	registration: 'Register Players',
	drawShown: 'Round 1 draw',
	inProgress: 'Round 1',
};

// Returns whether the core accepted the change.
type Apply = (outcome: Result<Tournament>) => boolean;

export const Organizer = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	const [refusal, setRefusal] = useState('');
	// Bumped by a new Tournament, so registration starts afresh: empty boxes, nothing being renamed.
	const [newTournaments, setNewTournaments] = useState(0);

	const apply: Apply = (outcome) => {
		if (!outcome.ok) {
			setRefusal(outcome.reason);
			return false;
		}
		setRefusal('');
		store.save(outcome.value);
		return true;
	};

	const startNewTournament = () => {
		if (!confirm('Start a new Tournament? Every Player, Board and the Draw will be cleared.')) {
			return;
		}
		setRefusal('');
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
			<p role="alert" className="mt-4 min-h-6 font-semibold text-red-700">
				{refusal}
			</p>
			{tournament.phase === 'registration' ? (
				<Registration
					key={newTournaments}
					tournament={tournament}
					apply={apply}
					clearRefusal={() => setRefusal('')}
				/>
			) : (
				<FirstRound tournament={tournament} apply={apply} />
			)}
		</main>
	);
};

const Registration = ({
	tournament,
	apply,
	clearRefusal,
}: {
	tournament: Tournament;
	apply: Apply;
	clearRefusal: () => void;
}) => {
	const [name, setName] = useState('');
	const [board, setBoard] = useState('');
	const [renaming, setRenaming] = useState<PlayerId>();
	const nameInput = useRef<HTMLInputElement>(null);
	const boardInput = useRef<HTMLInputElement>(null);

	const register = (event: FormEvent) => {
		event.preventDefault();
		if (apply(registerPlayer(tournament, name))) {
			setName('');
		}
		nameInput.current?.focus();
	};

	const enterBoard = (event: FormEvent) => {
		event.preventDefault();
		if (apply(addBoard(tournament, board))) {
			setBoard('');
		}
		boardInput.current?.focus();
	};

	const startRenaming = (playerId: PlayerId) => {
		setRenaming(playerId);
		clearRefusal();
	};

	const stopRenaming = () => {
		setRenaming(undefined);
		clearRefusal();
	};

	const draw = () => {
		if (
			confirm(
				'Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards.',
			)
		) {
			apply(makeDraw(tournament, Math.random));
		}
	};

	return (
		<div className="mt-2 flex items-start gap-12">
			<section className="flex-1">
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
				<p className="mt-4">{playersRegistered(tournament.players.length)}</p>
				<ul aria-label="Players" className="mt-2">
					{tournament.players.map((player) =>
						player.id === renaming ? (
							<RenameRow
								key={player.id}
								player={player}
								onSave={(newName) => {
									if (apply(renamePlayer(tournament, player.id, newName))) {
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
									onClick={() => apply(removePlayer(tournament, player.id))}
								>
									Remove
								</button>
							</li>
						),
					)}
				</ul>
			</section>
			<section className="w-80">
				<button type="button" className={`${primaryButton} w-full`} onClick={draw}>
					Make the Draw
				</button>
				<h2 className="mt-8 text-xl font-bold">Boards</h2>
				<form onSubmit={enterBoard} className="mt-2 flex items-center gap-2">
					<label className="flex items-center gap-2">
						Board number
						<input
							ref={boardInput}
							type="text"
							inputMode="numeric"
							autoComplete="off"
							value={board}
							onChange={(event) => setBoard(event.target.value)}
							className={`${textInput} w-20`}
						/>
					</label>
					<button type="submit" className={button}>
						Add Board
					</button>
				</form>
				<ul aria-label="Boards" className="mt-2">
					{tournament.boards.map((b) => (
						<li
							key={b}
							className="flex items-center gap-2 border-b border-gray-300 py-1.5"
						>
							<span className="flex-1 text-lg">Board {b}</span>
							<button
								type="button"
								className={dangerButton}
								onClick={() => apply(removeBoard(tournament, b))}
							>
								Remove
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
};

// The first Round as drawn: shown while the TV holds the Round 1 draw screen, and after Start.
const FirstRound = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const draw = roundOneDraw(tournament)!;
	return (
		<div className="mt-2 flex items-start gap-12">
			<section className="flex-1">
				<h2 className="text-xl font-bold">Matches</h2>
				<ul aria-label="Matches" className="mt-2">
					{draw.matches.map((match) => (
						<li key={match.board} className="border-b border-gray-300 py-1.5 text-lg">
							<span className="inline-block w-24 font-semibold">
								Board {match.board}
							</span>
							{match.players[0].name} v {match.players[1].name}
						</li>
					))}
				</ul>
			</section>
			<section className="w-80">
				{draw.byes.length > 0 && (
					<>
						<h2 className="text-xl font-bold">Byes</h2>
						<ul aria-label="Byes" className="mt-2">
							{draw.byes.map((player) => (
								<li
									key={player.id}
									className="border-b border-gray-300 py-1.5 text-lg"
								>
									{player.name}
								</li>
							))}
						</ul>
					</>
				)}
				{tournament.phase === 'drawShown' && (
					<>
						<p className="mt-8">
							The TV holds the Round 1 draw until you press Start, so everyone can
							find their Board.
						</p>
						<button
							type="button"
							className={`${primaryButton} mt-2 w-full`}
							onClick={() => apply(start(tournament))}
						>
							Start
						</button>
					</>
				)}
			</section>
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

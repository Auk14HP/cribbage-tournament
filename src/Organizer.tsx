/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useRef, useState, type FormEvent } from 'react';
import type { Result } from './result';
import type { Store } from './storage';
import {
	newTournament,
	registerPlayer,
	removePlayer,
	renamePlayer,
	type Player,
	type PlayerId,
	type Tournament,
} from './tournament';
import { useTournament } from './useTournament';
import { playersRegistered } from './wording';

const button = 'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200';
const dangerButton = `${button} text-red-700`;
const textInput = 'rounded border border-gray-400 px-3 py-1.5';

export const Organizer = ({ store }: { store: Store<Tournament> }) => {
	const tournament = useTournament(store);
	const [name, setName] = useState('');
	const [refusal, setRefusal] = useState('');
	const [renaming, setRenaming] = useState<PlayerId>();
	const nameInput = useRef<HTMLInputElement>(null);

	// Returns whether the core accepted the change.
	const apply = (outcome: Result<Tournament>): boolean => {
		if (!outcome.ok) {
			setRefusal(outcome.reason);
			return false;
		}
		setRefusal('');
		store.save(outcome.value);
		return true;
	};

	const register = (event: FormEvent) => {
		event.preventDefault();
		if (apply(registerPlayer(tournament, name))) {
			setName('');
		}
		nameInput.current?.focus();
	};

	const startRenaming = (playerId: PlayerId) => {
		setRenaming(playerId);
		setRefusal('');
	};

	const stopRenaming = () => {
		setRenaming(undefined);
		setRefusal('');
	};

	const startNewTournament = () => {
		if (!confirm('Start a new Tournament? Every registered Player will be cleared.')) {
			return;
		}
		stopRenaming();
		store.save(newTournament());
		nameInput.current?.focus();
	};

	return (
		<main className="px-8 py-6">
			<header className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">Register Players</h1>
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
			<form onSubmit={register} className="mt-6 flex items-center gap-2">
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
			<p role="alert" className="mt-4 min-h-6 font-semibold text-red-700">
				{refusal}
			</p>
			<p className="mt-2">{playersRegistered(tournament.players.length)}</p>
			<ul className="mt-2">
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
		</main>
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

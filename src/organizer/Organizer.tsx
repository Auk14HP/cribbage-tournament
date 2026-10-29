/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useRef, useState } from 'react';
import type { Store } from '../storage';
import { createTournament, type Phase, type Tournament } from '../tournament';
import { useTournament } from '../useTournament';
import { dangerButton } from './classes';
import { ConfirmDialog, type Apply } from './controls';
import { Draw } from './Draw';
import { Registration } from './Registration';

const headings: Record<Phase, string> = {
	registration: 'Register Players',
	drawShown: 'Tonight’s Draw',
	inProgress: 'Now playing',
	finished: 'Tournament finished',
};

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

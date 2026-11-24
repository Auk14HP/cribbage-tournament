/*
 * The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
 * saves accepted changes through the store, and shows the core's reason when a change is refused.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { makeDisplayPath } from '../routes';
import type { Store } from '../storage';
import { createTournament, restartTvCycleIfDue, type Phase, type Tournament } from '../tournament';
import { useTournament } from '../useTournament';
import { quietButtons } from './classes';
import { ConfirmDialog, type Apply } from './controls';
import { Draw } from './Draw';
import { HouseRules } from './HouseRules';
import { Registration } from './Registration';
import { StepBar } from './StepBar';
import { ThemeMenu } from './ThemeMenu';
import { useTheme, type ThemeChoice } from './themes';

const headings: Record<Phase, string> = {
	registration: 'Register Players',
	houseRules: 'House Rules',
	drawShown: 'Tonight’s Draw',
	inProgress: 'Now playing',
	finished: 'Tournament finished',
};

export const Organizer = ({
	store,
	themeStore,
}: {
	store: Store<Tournament>;
	themeStore: Store<ThemeChoice>;
}) => {
	const tournament = useTournament(store);
	const { choice: themeChoice, theme } = useTheme(themeStore);

	/*
	 * The theme goes on the page's root, not only this screen, so the window's own edges and scrollbar take its
	 * colours too. Before paint, so the screen never shows a frame in the wrong theme.
	 */
	useLayoutEffect(() => {
		document.documentElement.dataset.theme = theme;
		return () => {
			delete document.documentElement.dataset.theme;
		};
	}, [theme]);
	// Bumped by a new Tournament, so registration starts afresh: empty boxes, nothing being renamed.
	const [newTournaments, setNewTournaments] = useState(0);

	const apply: Apply = (outcome) => {
		if (!outcome.ok) {
			return outcome.reason;
		}
		/*
		 * Starts Auto's TV cycle again now if the command calls for it, so every window works out the same screen.
		 * Every save of a Started Tournament goes through here: docs/adr/0003-tv-cycle-runs-from-the-clock.md.
		 */
		const now = Date.now();
		store.save(restartTvCycleIfDue({ before: tournament, after: outcome.value, now }));
		return '';
	};

	const newTournamentDialog = useRef<HTMLDialogElement>(null);

	const startNewTournament = () => {
		store.save(createTournament());
		setNewTournaments((count) => count + 1);
	};

	return (
		/*
		 * Fills the window and never scrolls as a page: a long list scrolls on its own inside it, so the controls
		 * around the list stay on screen. A band of the theme's yellow along its top edge matches the TV's.
		 */
		<main className="border-fill bg-canvas font-organizer text-ink flex h-dvh flex-col border-t-4 px-8 py-6">
			<header className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold">{headings[tournament.phase]}</h1>
				{/*
				 * Stretched to one height, so the palette button, holding an icon rather than a line of text, is as
				 * tall as the buttons beside it.
				 */}
				<nav className="flex items-stretch gap-2">
					{/*
					 * Outlined on the canvas, not filled like the buttons the night runs on, so it doesn't draw the
					 * Organizer's eye. Its dialog still asks before anything is cleared.
					 */}
					<button
						type="button"
						className={quietButtons.danger}
						onClick={() => newTournamentDialog.current?.showModal()}
					>
						Start a new Tournament
					</button>
					<a
						href={makeDisplayPath(import.meta.env.BASE_URL)}
						target="cribbage-display"
						className={quietButtons.plain}
					>
						Open TV display
					</a>
					<ThemeMenu choice={themeChoice} onChoose={themeStore.save} />
				</nav>
			</header>
			<StepBar phase={tournament.phase} />
			<ConfirmDialog
				ref={newTournamentDialog}
				message="Start a new Tournament? Every Player, Board and the Draw will be cleared."
				confirmLabel="Start a new Tournament"
				isDestructive
				onConfirm={startNewTournament}
			/>
			{tournament.phase === 'registration' && (
				<Registration key={newTournaments} tournament={tournament} apply={apply} />
			)}
			{tournament.phase === 'houseRules' && (
				<HouseRules tournament={tournament} apply={apply} />
			)}
			{tournament.phase !== 'registration' && tournament.phase !== 'houseRules' && (
				<Draw tournament={tournament} apply={apply} />
			)}
		</main>
	);
};

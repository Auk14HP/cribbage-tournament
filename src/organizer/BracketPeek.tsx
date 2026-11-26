import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Bracket } from '../display/Bracket';
import { tvSafeArea } from '../display/tvSafeArea';
import { countdownRing } from '../display/tvScreenOnShow';
import { TvThemeBorder } from '../display/TvThemeArt';
import { findTvThemeToday, TvThemeContext } from '../display/tvThemeContext';
import { getBracketPicture, type BracketName, type Tournament } from '../tournament';
import { bracketTitles } from '../wording';
import { tvPicture } from './classes';

/*
 * The brackets drawn as the TV draws them, full size on the laptop, in a dialog. Tabs switch between the
 * Winners Bracket and, once there is one, the Losers Bracket. The bracket on show is the one given; the close
 * button closes the dialog. Looking changes nothing the TV shows. The brackets are drawn in the TV Theme, its
 * artwork still.
 */
export const BracketPeek = ({
	ref,
	tournament,
	bracketName,
	onChooseBracket,
}: {
	ref: RefObject<HTMLDialogElement | null>;
	tournament: Tournament;
	bracketName: BracketName | undefined;
	onChooseBracket: (bracketName: BracketName) => void;
}) => {
	const tabs = useRef(new Map<BracketName, HTMLButtonElement>());
	const idPrefix = useId();
	const panelId = `${idPrefix}-panel`;
	// Returns the id of a bracket's tab, which names the panel it shows.
	const makeTabId = (name: BracketName) => `${idPrefix}-${name}`;
	const bracketNames = listBracketNames(tournament);
	const tvTheme = findTvThemeToday(tournament);
	// The arrow keys move between the tabs, choosing each as they reach it, as between radio buttons.
	const moveBetweenTabs = (event: KeyboardEvent, from: BracketName) => {
		const step = tabSteps[event.key];
		if (step === undefined) {
			return;
		}
		event.preventDefault();
		const fromIndex = bracketNames.indexOf(from);
		const nextIndex = (fromIndex + step + bracketNames.length) % bracketNames.length;
		const nextBracketName = bracketNames[nextIndex];
		onChooseBracket(nextBracketName);
		tabs.current.get(nextBracketName)?.focus();
	};
	return (
		<dialog ref={ref} aria-label="The brackets" className={peekBox}>
			<div className="flex items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Brackets"
					className="bg-raised flex gap-1 rounded-xl p-1"
				>
					{bracketNames.map((name) => (
						<BracketTab
							key={name}
							bracketName={name}
							isChosen={name === bracketName}
							tabId={makeTabId(name)}
							panelId={panelId}
							onMount={(tab) => tabs.current.set(name, tab)}
							onChoose={onChooseBracket}
							onKeyDown={(event) => moveBetweenTabs(event, name)}
						/>
					))}
				</div>
				<button
					type="button"
					aria-label="Close the brackets"
					onClick={() => ref.current?.close()}
					className="border-line hover:bg-raised grid size-11 place-items-center rounded-lg border"
				>
					<svg
						aria-hidden
						className="size-[1.125rem]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.2"
						strokeLinecap="round"
					>
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
			</div>
			{bracketName && (
				<div
					role="tabpanel"
					id={panelId}
					aria-labelledby={makeTabId(bracketName)}
					data-tv-theme={tvTheme}
					className={`mx-auto mt-4 w-full ${peekFrameWidth} ${tvPicture.frame}`}
				>
					<div className={`relative h-full ${tvSafeArea.page}`}>
						<TvThemeContext value={{ tvTheme, isMoving: false }}>
							<TvThemeBorder />
							{/* The same clearance as the TV's, so the bracket is laid out just as the TV lays it out. */}
							<div className={countdownRing.clearance}>
								<Bracket tournament={tournament} bracketName={bracketName} />
							</div>
						</TvThemeContext>
					</div>
				</div>
			)}
		</dialog>
	);
};

/*
 * One bracket's tab, filled when chosen. Only the chosen tab is reached with the Tab key; the arrow keys move
 * between the tabs.
 */
const BracketTab = ({
	bracketName,
	isChosen,
	tabId,
	panelId,
	onMount,
	onChoose,
	onKeyDown,
}: {
	bracketName: BracketName;
	isChosen: boolean;
	tabId: string;
	panelId: string;
	onMount: (tab: HTMLButtonElement) => void;
	onChoose: (bracketName: BracketName) => void;
	onKeyDown: (event: KeyboardEvent) => void;
}) => (
	<button
		ref={(tab) => {
			if (tab) {
				onMount(tab);
			}
		}}
		type="button"
		role="tab"
		id={tabId}
		aria-selected={isChosen}
		aria-controls={panelId}
		tabIndex={isChosen ? 0 : -1}
		onClick={() => onChoose(bracketName)}
		onKeyDown={onKeyDown}
		className={`min-h-10 rounded-lg px-4 font-bold ${isChosen ? tabColours.chosen : tabColours.plain}`}
	>
		{bracketTitles[bracketName]}
	</button>
);

// Returns the brackets drawn so far: the Winners Bracket from the Draw, and the Losers Bracket once it has one.
const listBracketNames = (tournament: Tournament): BracketName[] =>
	getBracketPicture(tournament, 'losers') ? ['winners', 'losers'] : ['winners'];

// How far each arrow key moves along the tabs.
const tabSteps: Partial<Record<string, number>> = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1,
};

/*
 * The dialog is as wide as the window allows, up to the size of the TV picture the laptop's screen can show in
 * full; the bracket's frame shrinks to fit the window's height as well, keeping the TV's 16:9.
 */
const peekBox =
	'm-auto w-[min(72rem,calc(100vw-3rem))] max-w-none rounded-2xl border border-divider bg-panel p-5 text-ink shadow-xl backdrop:bg-scrim';
const peekFrameWidth = 'max-w-[calc((100dvh-10rem)*16/9)]';

// A tab's colours: filled with the theme's fill when chosen, plain otherwise.
const tabColours = {
	chosen: 'bg-fill text-on-fill',
	plain: 'text-ink hover:bg-divider',
};

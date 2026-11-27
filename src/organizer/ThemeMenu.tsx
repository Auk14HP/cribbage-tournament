/*
 * The palette button in the Organizer screen's header and the menu it opens, in two sections, each ticking its
 * choice: This screen, the Organizer screen's Theme (Same as laptop, Light and Dark), and TV, the Tournament's
 * TV Theme (Classic, then the months' in calendar order). Every choice shows a swatch of its colours.
 * It works by keyboard as a menu button does: Enter, Space or the down arrow opens it on the chosen Theme, the
 * arrow keys, Home and End move through both sections as one list, Enter or Space picks one, and Escape closes
 * it, focus back on the button. Tab, a click elsewhere or a pick closes it too. Pointing at a choice moves focus
 * to it, so only one choice is ever highlighted, and it is the one Enter would pick.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { listTvThemes, tvThemeMonths, tvThemeNames, type TvTheme } from '../tournament';
import { quietButtons } from './classes';
import { themeChoices, type Theme, type ThemeChoice } from './themes';

/*
 * The menu floats below the button, over the screen, so opening it moves nothing. The focused theme is highlighted and
 * outlined, the outline drawn inside its own box so the theme below it can't cover its edge.
 */
const menuClasses = {
	menu: 'absolute top-full right-0 z-10 mt-2 flex min-w-48 flex-col rounded-lg border border-divider bg-panel p-1 shadow-xl',
	item: 'flex items-center gap-2 rounded px-3 py-2 text-left focus:bg-raised focus:outline-2 focus:-outline-offset-2 focus:outline-accent',
	heading: 'px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted uppercase',
	separator: 'mx-1 my-1 h-px bg-divider',
	month: 'ml-auto pl-4 text-sm text-muted',
};

/*
 * A swatch: a circle split corner to corner between a choice's ground and its bright colour. Each swatch takes
 * its colours from its own theme attribute, so it shows the Theme or TV Theme it stands for whatever the
 * screen is drawn in.
 */
const swatchShape = 'size-4 shrink-0 rounded-full border border-line bg-linear-135 from-50% to-50%';

const ThemeSwatch = ({ theme }: { theme: Theme }) => (
	<span aria-hidden data-theme={theme} className={`${swatchShape} from-canvas to-fill`} />
);

const TvThemeSwatch = ({ tvTheme }: { tvTheme: TvTheme }) => (
	<span
		aria-hidden
		data-tv-theme={tvTheme}
		className={`${swatchShape} from-tv-ground to-tv-highlight`}
	/>
);

// Returns a month's short name, 1 for "Jan" to 12 for "Dec".
const nameMonthShort = (month: number) =>
	new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });

// One choice in the menu: its name, its swatch, whether it is chosen, and what picking it does.
interface MenuChoice {
	readonly key: string;
	readonly label: string;
	// The TV Theme's month's short name, shown after its name.
	readonly month?: string;
	readonly swatch: ReactNode;
	readonly isChosen: boolean;
	readonly pick: () => void;
}

// Where each arrow key, Home and End moves focus in a list of the given length, wrapping round at the ends.
const findNextIndex = (key: string, index: number, count: number) => {
	switch (key) {
		case 'ArrowDown':
			return (index + 1) % count;
		case 'ArrowUp':
			return (index - 1 + count) % count;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return undefined;
	}
};

const PaletteIcon = () => (
	<svg
		aria-hidden="true"
		className="size-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z" />
		<circle cx="7.5" cy="11" r="1" />
		<circle cx="10" cy="7" r="1" />
		<circle cx="14.5" cy="7" r="1" />
	</svg>
);

const CheckIcon = ({ isShown }: { isShown: boolean }) => (
	<svg
		aria-hidden="true"
		className={`size-4 ${isShown ? '' : 'invisible'}`}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

/*
 * One choice in the menu: ticked if chosen, its swatch, its name and, for a month's TV Theme, the month. Reached
 * by the arrow keys rather than Tab; pointing at it moves focus to it.
 */
const MenuItem = ({
	choice,
	onMount,
	onPick,
	onKeyDown,
}: {
	choice: MenuChoice;
	onMount: (item: HTMLButtonElement | null) => void;
	onPick: () => void;
	onKeyDown: (event: KeyboardEvent) => void;
}) => (
	<button
		ref={onMount}
		type="button"
		role="menuitemradio"
		aria-checked={choice.isChosen}
		tabIndex={-1}
		className={menuClasses.item}
		onClick={onPick}
		onPointerMove={(event) => event.currentTarget.focus()}
		onKeyDown={onKeyDown}
	>
		<CheckIcon isShown={choice.isChosen} />
		{choice.swatch}
		{choice.label}
		{/* A space between the name and the month, so a screen reader says them apart. */}
		{choice.month && (
			<>
				{' '}
				<span className={menuClasses.month}>{choice.month}</span>
			</>
		)}
	</button>
);

/*
 * Same as laptop's swatch is the Theme the laptop is on now. The Tournament's TV Theme is the one ticked in the
 * TV section.
 */
export const ThemeMenu = ({
	choice,
	laptopTheme,
	onChoose,
	tvTheme,
	onChooseTvTheme,
}: {
	choice: ThemeChoice;
	laptopTheme: Theme;
	onChoose: (choice: ThemeChoice) => void;
	tvTheme: TvTheme;
	onChooseTvTheme: (tvTheme: TvTheme) => void;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuId = useId();
	const menuButton = useRef<HTMLButtonElement>(null);
	const menuItems = useRef<(HTMLButtonElement | null)[]>([]);

	const closeAndFocusButton = () => {
		setIsOpen(false);
		menuButton.current?.focus();
	};

	const screenChoices: MenuChoice[] = themeChoices.map((option) => ({
		key: option.choice,
		label: option.label,
		swatch: <ThemeSwatch theme={option.choice === 'laptop' ? laptopTheme : option.choice} />,
		isChosen: option.choice === choice,
		pick: () => onChoose(option.choice),
	}));
	const tvChoices: MenuChoice[] = listTvThemes().map((tvThemeOption) => ({
		key: tvThemeOption,
		label: tvThemeNames[tvThemeOption],
		month:
			tvThemeOption === 'classic' ? undefined : nameMonthShort(tvThemeMonths[tvThemeOption]),
		swatch: <TvThemeSwatch tvTheme={tvThemeOption} />,
		isChosen: tvThemeOption === tvTheme,
		pick: () => onChooseTvTheme(tvThemeOption),
	}));
	const sections = [
		{ name: 'This screen', choices: screenChoices },
		{ name: 'TV', choices: tvChoices },
	];
	// Every choice in both sections, in order, as the arrow keys move through them.
	const allChoices = [...screenChoices, ...tvChoices];
	const chosenIndex = screenChoices.findIndex((c) => c.isChosen);

	// Opening the menu puts focus on the chosen Theme, so the arrow keys start from it.
	useEffect(() => {
		if (isOpen) {
			menuItems.current[chosenIndex]?.focus();
		}
	}, [isOpen, chosenIndex]);

	const choose = (picked: MenuChoice) => {
		picked.pick();
		closeAndFocusButton();
	};

	const answerItemKey = (event: KeyboardEvent, index: number) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeAndFocusButton();
			return;
		}
		if (event.key === 'Tab') {
			setIsOpen(false);
			return;
		}
		const nextIndex = findNextIndex(event.key, index, allChoices.length);
		if (nextIndex !== undefined) {
			event.preventDefault();
			menuItems.current[nextIndex]?.focus();
		}
	};

	const openFromKeyboard = (event: KeyboardEvent) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setIsOpen(true);
		}
	};

	return (
		/*
		 * Closes the menu when focus leaves it and its button, as a click elsewhere on the screen moves it. A
		 * click on the button itself keeps focus inside, so the button's own toggle decides.
		 */
		<div
			// A flex box, so the button stretches to whatever height its container gives the menu.
			className="relative flex"
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setIsOpen(false);
				}
			}}
		>
			<button
				ref={menuButton}
				type="button"
				aria-label="Theme"
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-controls={isOpen ? menuId : undefined}
				className={quietButtons.plain}
				onClick={() => setIsOpen((wasOpen) => !wasOpen)}
				onKeyDown={openFromKeyboard}
			>
				<PaletteIcon />
			</button>
			{isOpen && (
				<div id={menuId} role="menu" aria-label="Theme" className={menuClasses.menu}>
					{sections.map((section, sectionIndex) => (
						/*
						 * Each section a group of its own, named by its heading. The heading is drawn for the eye and
						 * the group's name says it to a screen reader, as a menu holds only groups and choices.
						 */
						<div key={section.name} className="contents">
							{sectionIndex > 0 && (
								<div role="separator" className={menuClasses.separator} />
							)}
							<div role="group" aria-label={section.name} className="flex flex-col">
								<div aria-hidden className={menuClasses.heading}>
									{section.name}
								</div>
								{section.choices.map((menuChoice) => (
									<MenuItem
										key={menuChoice.key}
										choice={menuChoice}
										onMount={(item) => {
											menuItems.current[allChoices.indexOf(menuChoice)] =
												item;
										}}
										onPick={() => choose(menuChoice)}
										onKeyDown={(event) =>
											answerItemKey(event, allChoices.indexOf(menuChoice))
										}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

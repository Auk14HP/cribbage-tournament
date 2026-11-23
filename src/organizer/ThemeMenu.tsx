/*
 * The palette button in the Organizer screen's header and the menu it opens: Same as laptop, Light and Dark,
 * the chosen one ticked. It works by keyboard as a menu button does: Enter, Space or the down arrow opens it
 * on the chosen theme, the arrow keys, Home and End move between the themes, Enter or Space picks one, and
 * Escape closes it, focus back on the button. Tab, a click elsewhere or a pick closes it too. Pointing at a
 * theme moves focus to it, so only one theme is ever highlighted, and it is the one Enter would pick.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { quietButtons } from './classes';
import { themeChoices, type ThemeChoice } from './themes';

/*
 * The menu floats below the button, over the screen, so opening it moves nothing. The focused theme is highlighted and
 * outlined, the outline drawn inside its own box so the theme below it can't cover its edge.
 */
const menuClasses = {
	menu: 'absolute top-full right-0 z-10 mt-2 flex min-w-48 flex-col rounded-lg border border-divider bg-panel p-1 shadow-xl',
	item: 'flex items-center gap-2 rounded px-3 py-2 text-left focus:bg-raised focus:outline-2 focus:-outline-offset-2 focus:outline-accent',
};

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

export const ThemeMenu = ({
	choice,
	onChoose,
}: {
	choice: ThemeChoice;
	onChoose: (choice: ThemeChoice) => void;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuId = useId();
	const menuButton = useRef<HTMLButtonElement>(null);
	const themeItems = useRef<(HTMLButtonElement | null)[]>([]);
	const chosenIndex = themeChoices.findIndex((c) => c.choice === choice);

	// Opening the menu puts focus on the chosen theme, so the arrow keys start from it.
	useEffect(() => {
		if (isOpen) {
			themeItems.current[chosenIndex]?.focus();
		}
	}, [isOpen, chosenIndex]);

	const closeAndFocusButton = () => {
		setIsOpen(false);
		menuButton.current?.focus();
	};

	const choose = (picked: ThemeChoice) => {
		onChoose(picked);
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
		const nextIndex = findNextIndex(event.key, index, themeChoices.length);
		if (nextIndex !== undefined) {
			event.preventDefault();
			themeItems.current[nextIndex]?.focus();
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
		 * click on the button itself keeps focus inside, so the button's own toggle decides. A flex box, so the
		 * button stretches to whatever height the header gives it.
		 */
		<div
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
					{themeChoices.map((option, index) => (
						<button
							key={option.choice}
							ref={(item) => {
								themeItems.current[index] = item;
							}}
							type="button"
							role="menuitemradio"
							aria-checked={option.choice === choice}
							tabIndex={-1}
							className={menuClasses.item}
							onClick={() => choose(option.choice)}
							onPointerMove={(event) => event.currentTarget.focus()}
							onKeyDown={(event) => answerItemKey(event, index)}
						>
							<CheckIcon isShown={option.choice === choice} />
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

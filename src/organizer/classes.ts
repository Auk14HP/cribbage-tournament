// The organizer route's shared Tailwind classes: buttons, text boxes and dialogs.

import { tvFrame } from '../display/tvScreenOnShow';

/*
 * Every colour below is a theme colour (`src/style.css`), so each class reads well in Light and in Dark. A button
 * the Organizer can't use right now is faded, and doesn't light up under the pointer.
 */
// A button's own colours, apart from its shape, for a button that changes colour in place, such as Swap Players.
const buttonColours = 'border-line bg-raised hover:bg-divider';
export const button = `rounded border ${buttonColours} px-3 py-1.5 disabled:opacity-50 disabled:hover:bg-raised`;
export const dangerButton = `${button} text-danger`;
/*
 * The header's buttons: an outline on the canvas, with no fill until the pointer is over them, so they stay
 * quieter than the buttons in the panels below. One that clears the Tournament has the danger colour's text.
 */
// A header button's shape, shared by every look it takes, so the header keeps its height as a button changes.
const headerButtonShape = 'rounded border px-3 py-1.5';
const quietButton = `${headerButtonShape} border-line hover:bg-raised`;
export const quietButtons = {
	plain: quietButton,
	danger: `${quietButton} text-danger`,
};
// A header button made the screen's main button, filled in the theme's yellow like Start.
export const mainHeaderButton = `${headerButtonShape} border-fill bg-fill font-semibold text-on-fill hover:brightness-95`;
export const primaryButton =
	'rounded bg-fill px-4 py-2 text-lg font-semibold text-on-fill hover:brightness-95 disabled:opacity-50 disabled:hover:brightness-100';
export const confirmButton = 'rounded px-3 py-1.5 font-semibold';
// A confirm button's colour: red for an action that can't simply be taken back, the theme's fill otherwise.
export const confirmColours = {
	destructive: 'bg-danger text-on-danger hover:brightness-95',
	safe: 'bg-fill text-on-fill hover:brightness-95',
};
export const textInput = 'rounded border border-line bg-canvas px-3 py-1.5 text-ink';

export const dialogBox =
	'm-auto max-w-lg rounded-lg bg-panel p-6 text-ink shadow-xl backdrop:bg-scrim';

/*
 * The window-filling layout every phase shares, below the step bar: a main column and a narrower side column,
 * side by side, each a stack of panels. The row takes the height left below the step bar. A long list in a
 * panel scrolls in an area of its own: the area shrinks to fit the space left, so it never pushes the controls
 * after it off screen, and its panel and column shrink with it. A short list keeps its own height. Two lists
 * one above the other share one area, so neither is squeezed to make room for the other. min-h-0 lets each
 * box between the row and the list shrink below the height of what it holds. The side column's panels keep
 * their whole height instead, Results included: in a window too short for them, such as the TV Display above
 * the Boards, the side column scrolls as a whole, so the page itself still never scrolls.
 */
export const windowFilling = {
	row: 'mt-6 flex min-h-0 flex-1 gap-6',
	mainColumn: 'flex min-h-0 flex-1 flex-col gap-4',
	sideColumn: 'flex min-h-0 w-96 shrink-0 flex-col gap-4 overflow-y-auto',
	// A panel holding a list that scrolls, its parts stacked so the list's area can shrink.
	column: 'flex min-h-0 flex-col',
	scrollingArea: 'min-h-0 overflow-y-auto',
};

/*
 * The row above the Matches, on Tonight’s Draw and once Started: at least tall enough for a button with room to
 * spare at any text size, so Start, which swaps Swap Players for a line of text, moves no Match below it. Only
 * Swap mode's line, wrapping in a narrow window, makes it taller. Its border is always there, so it keeps its
 * size: clear while the row is bare, and with the highlight's background, the theme's fill while it is Swap
 * mode's banner.
 */
export const rowAboveMatches = {
	frame: 'flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4',
	bare: 'border-transparent',
	banner: 'border-fill bg-highlight',
};

/*
 * The button in the row above the Matches: Swap Players, in a plain button's colours, then Done, filled in the
 * theme's fill. Its shape, border and weight never change, so its box stays put as its label changes.
 */
export const swapToggle = {
	shape: 'grid shrink-0 rounded border px-3 py-1.5 text-center font-semibold whitespace-nowrap',
	off: buttonColours,
	on: `border-fill ${confirmColours.safe}`,
};

// A box on the screen's canvas holding one part of a phase, such as the Players or the Boards.
export const panel = 'rounded-xl border border-divider bg-panel p-4';

/*
 * The box round a Player's name in a listed Match. In Swap mode the name is a button to tap, a seat with a dashed
 * edge that lights up in the theme's accent under the pointer, so it never looks like the plain buttons that
 * record a winner once Started. The Player picked is outlined in the accent on the highlight's ground, and
 * tagged PICKED on the seat's top edge (`pickedTag`), where the tag takes no room from the name. Otherwise the
 * name keeps the same box, its border clear. The box adds no height to the name, and the picked outline's inner
 * ring adds no size, so turning Swap mode on or off, or picking a Player, moves nothing.
 */
export const playerNameBox = {
	shape: 'inline-block rounded border px-3',
	plain: 'border-transparent',
	swappable: 'border-dashed border-faint hover:border-accent',
	picked: 'border-accent bg-highlight ring-1 ring-accent ring-inset',
};

/*
 * The PICKED tag, centred on the top edge of the picked Player's seat at its right end: small enough to sit in
 * the gap between two seats in a Match tile without touching the seat above.
 */
export const pickedTag =
	'absolute -top-1.5 right-2 rounded bg-highlight px-1 text-[0.625rem] leading-3 font-extrabold tracking-widest text-accent';

/*
 * A TV screen drawn on the laptop: a black 16:9 box in the TV's own colours rather than the theme's, and the
 * TV screen's frame, so every size on the screen scales with the box.
 */
export const tvPicture = {
	frame: `aspect-video overflow-hidden bg-black font-sans text-white ${tvFrame}`,
};

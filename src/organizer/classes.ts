// The organizer route's shared Tailwind classes: buttons, text boxes and dialogs.

/*
 * Every colour below is a theme colour (`src/style.css`), so each class reads well in Light and in Dark. A button
 * the Organizer can't use right now is faded, and doesn't light up under the pointer.
 */
export const button =
	'rounded border border-line bg-raised px-3 py-1.5 hover:bg-divider disabled:opacity-50 disabled:hover:bg-raised';
export const dangerButton = `${button} text-danger`;
/*
 * The header's buttons: an outline on the canvas, with no fill until the pointer is over them, so they stay
 * quieter than the buttons in the panels below. One that clears the Tournament has the danger colour's text.
 */
const quietButton = 'rounded border border-line px-3 py-1.5 hover:bg-raised';
export const quietButtons = {
	plain: quietButton,
	danger: `${quietButton} text-danger`,
};
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

// A box on the screen's canvas holding one part of a phase, such as the Players or the Boards.
export const panel = 'rounded-xl border border-divider bg-panel p-4';

/*
 * The box round a Player's name in a listed Match. In Swap mode the name is a button to tap, outlined dashed in
 * the theme's accent so it never looks like the plain buttons that record a winner once Started, and the Player
 * tapped first is filled with the theme's fill. Otherwise the name keeps the same box, its border clear. The box
 * adds no height to the name, so turning Swap mode on or off moves nothing.
 */
export const playerNameBox = {
	shape: 'inline-block rounded border px-3',
	plain: 'border-transparent',
	swappable: 'border-dashed border-accent text-accent hover:bg-raised',
	picked: 'border-fill bg-fill text-on-fill',
};

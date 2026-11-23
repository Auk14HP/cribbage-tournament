// The organizer route's shared Tailwind classes: buttons, text boxes and dialogs.

/*
 * Every colour below is a theme colour (`src/style.css`), so a class reads the same in Light and Dark. A button
 * the Organizer can't use right now is faded, and doesn't light up under the pointer.
 */
export const button =
	'rounded border border-line bg-raised px-3 py-1.5 hover:bg-divider disabled:opacity-50 disabled:hover:bg-raised';
export const dangerButton = `${button} text-danger`;
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
 * The window-filling layout. A screen's row of columns takes the height left below the page's heading, each
 * column stacks its parts, and a long list in a column scrolls in an area of its own: the area shrinks to fit
 * the space left, so it never pushes the controls after it off screen. A short list keeps its own height.
 * Two lists one above the other share one area, so neither is squeezed to make room for the other. min-h-0
 * lets each of them shrink below the height of what it holds.
 */
export const windowFilling = {
	row: 'flex min-h-0 flex-1 gap-12',
	column: 'flex min-h-0 flex-col',
	scrollingArea: 'min-h-0 overflow-y-auto',
};

/*
 * The box round a Player's name in a listed Match. In Swap mode the name is a button to tap, outlined in dashed
 * in the theme's accent so it never looks like the plain buttons that record a winner once Started, and the Player
 * tapped first is filled with the theme's fill. Otherwise the name keeps the same box, its border clear. The box adds no height to the name,
 * so turning Swap mode on or off moves nothing.
 */
export const playerNameBox = {
	shape: 'inline-block rounded border px-3',
	plain: 'border-transparent',
	swappable: 'border-dashed border-accent text-accent hover:bg-raised',
	picked: 'border-fill bg-fill text-on-fill',
};

// The organizer route's shared Tailwind classes: buttons, text boxes and dialogs.

// A button the Organizer can't use right now is faded, and doesn't light up under the pointer.
export const button =
	'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100';
export const dangerButton = `${button} text-red-700`;
export const primaryButton =
	'rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-blue-700';
export const confirmButton = 'rounded px-3 py-1.5 font-semibold text-white';
// A confirm button's colour: red for an action that can't simply be taken back, blue otherwise.
export const confirmColours = {
	destructive: 'bg-red-700 hover:bg-red-800',
	safe: 'bg-blue-700 hover:bg-blue-800',
};
export const textInput = 'rounded border border-gray-400 px-3 py-1.5';

export const dialogBox = 'm-auto max-w-lg rounded-lg p-6 shadow-xl backdrop:bg-black/40';

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
 * blue so it never looks like the grey buttons that record a winner once Started, and the Player tapped first is
 * filled in blue. Otherwise the name keeps the same box, its border clear. The box adds no height to the name,
 * so turning Swap mode on or off moves nothing.
 */
export const playerNameBox = {
	shape: 'inline-block rounded border px-3',
	plain: 'border-transparent',
	swappable: 'border-dashed border-blue-600 text-blue-800 hover:bg-blue-50',
	picked: 'border-blue-700 bg-blue-700 text-white',
};

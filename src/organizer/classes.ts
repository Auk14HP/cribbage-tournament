// The organizer route's shared Tailwind classes: buttons, text boxes and dialogs.

export const button = 'rounded border border-gray-400 bg-gray-100 px-3 py-1.5 hover:bg-gray-200';
export const dangerButton = `${button} text-red-700`;
export const primaryButton =
	'rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white hover:bg-blue-800';
export const confirmButton = 'rounded px-3 py-1.5 font-semibold text-white';
// A confirm button's colour: red for an action that can't simply be taken back, blue otherwise.
export const confirmColours = {
	destructive: 'bg-red-700 hover:bg-red-800',
	safe: 'bg-blue-700 hover:bg-blue-800',
};
export const textInput = 'rounded border border-gray-400 px-3 py-1.5';

export const dialogBox = 'm-auto max-w-lg rounded-lg p-6 shadow-xl backdrop:bg-black/40';

/*
 * The Organizer screen's themes. Each theme is a set of colours in `src/style.css`, chosen by the screen's
 * `data-theme` attribute. The Organizer picks one from the theme menu, or Same as laptop, which follows the
 * laptop's light or dark setting. The choice belongs to the laptop, not the Tournament, so it is saved under
 * its own key and outlasts a new Tournament.
 */
import { useSyncExternalStore } from 'react';
import type { Store } from '../storage';

export type Theme = 'light' | 'dark';
export type ThemeChoice = 'laptop' | Theme;

export const themeChoiceVersion = 1;

// The theme menu's choices, in the order it lists them.
export const themeChoices: { choice: ThemeChoice; label: string }[] = [
	{ choice: 'laptop', label: 'Same as laptop' },
	{ choice: 'light', label: 'Light' },
	{ choice: 'dark', label: 'Dark' },
];

/*
 * The laptop is set either light or dark, so asking whether it is dark answers both: not dark is light. Only
 * Same as laptop asks; Light and Dark draw their own theme whatever the laptop is set to.
 */
const darkSchemeQuery = '(prefers-color-scheme: dark)';

const subscribeToLaptopScheme = (listener: () => void) => {
	const query = window.matchMedia(darkSchemeQuery);
	query.addEventListener('change', listener);
	return () => query.removeEventListener('change', listener);
};

const findLaptopTheme = (): Theme =>
	window.matchMedia(darkSchemeQuery).matches ? 'dark' : 'light';

// Whether a saved choice is one the theme menu still offers: a theme since dropped is not.
const isOffered = (saved: ThemeChoice | undefined): saved is ThemeChoice =>
	themeChoices.some((c) => c.choice === saved);

/*
 * The Organizer's saved theme choice, Same as laptop until they pick another or if the saved one is no longer
 * offered, the theme it draws the screen in, and the theme the laptop is on now: re-renders when the choice changes, or when the laptop turns
 * light or dark while the screen is open.
 */
export const useTheme = (store: Store<ThemeChoice>) => {
	const choice = useSyncExternalStore(store.subscribe, () => {
		const saved = store.load();
		return isOffered(saved) ? saved : 'laptop';
	});
	const laptopTheme = useSyncExternalStore(subscribeToLaptopScheme, findLaptopTheme);
	const theme: Theme = choice === 'laptop' ? laptopTheme : choice;
	return { choice, theme, laptopTheme };
};

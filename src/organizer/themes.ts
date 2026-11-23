/*
 * The Organizer screen's themes. Each theme is a set of colours in `src/style.css`, chosen by the screen's
 * `data-theme` attribute. The Organizer picks one from the theme menu, or Match laptop, which follows the
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
	{ choice: 'laptop', label: 'Match laptop' },
	{ choice: 'light', label: 'Light' },
	{ choice: 'dark', label: 'Dark' },
];

const darkSchemeQuery = '(prefers-color-scheme: dark)';

const subscribeToLaptopScheme = (listener: () => void) => {
	const query = window.matchMedia(darkSchemeQuery);
	query.addEventListener('change', listener);
	return () => query.removeEventListener('change', listener);
};

const findLaptopTheme = (): Theme =>
	window.matchMedia(darkSchemeQuery).matches ? 'dark' : 'light';

/*
 * The Organizer's saved theme choice, Match laptop until they pick another, and the theme it draws the screen
 * in: re-renders when the choice changes, or when the laptop turns light or dark while the screen is open.
 */
export const useTheme = (store: Store<ThemeChoice>) => {
	const choice = useSyncExternalStore(store.subscribe, () => store.load() ?? 'laptop');
	const laptopTheme = useSyncExternalStore(subscribeToLaptopScheme, findLaptopTheme);
	const theme: Theme = choice === 'laptop' ? laptopTheme : choice;
	return { choice, theme };
};

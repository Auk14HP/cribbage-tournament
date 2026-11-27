/*
 * Checks the style sheet gives every TV Theme the core lists a value for every TV colour, so a new TV Theme
 * whose colours are missing fails `npm run check`, not only the browser tests. Read as text, since a test can't
 * load the style sheet as styles.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listTvThemes } from '../src/tournament';

const styleSheet = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

// Every TV colour the TV's classes read, such as --tv-ground for bg-tv-ground.
const tvColours = [...styleSheet.matchAll(/--color-tv-[\w-]+: var\((--tv-[\w-]+)\)/g)].map(
	([, property]) => property,
);

// The custom properties a TV Theme's block in the style sheet sets, such as --tv-ground.
const listTvThemeProperties = (tvTheme: string): string[] => {
	const blockStart = styleSheet.indexOf(`[data-tv-theme='${tvTheme}'] {`);
	if (blockStart === -1) {
		return [];
	}
	const blockEnd = styleSheet.indexOf('}', blockStart);
	const block = styleSheet.slice(blockStart, blockEnd);
	return [...block.matchAll(/(--tv-[\w-]+):/g)].map(([, property]) => property);
};

describe('the TV Themes’ colours', () => {
	it('give every TV colour a value in every TV Theme, so none draws a colour of nothing', () => {
		expect(tvColours.length).toBeGreaterThan(0);

		const missingColours = listTvThemes().flatMap((tvTheme) => {
			const properties = listTvThemeProperties(tvTheme);
			const missing = tvColours.filter((colour) => !properties.includes(colour));
			return missing.map((colour) => `${tvTheme} ${colour}`);
		});

		expect(missingColours).toEqual([]);
	});
});

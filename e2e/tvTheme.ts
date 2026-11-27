import { expect, type Locator, type Page } from '@playwright/test';
import { listTvThemes, tvThemeNames as namesByTvTheme } from '../src/tournament';

// The TV Themes the browser tests draw the TV in, by the names the menu shows: Classic and every month's.
export const tvThemeNames = listTvThemes().map((tvTheme) => namesByTvTheme[tvTheme]);

/*
 * The TV Themes a layout is measured in: Classic, and one TV Theme with a border standing in for all of them,
 * since every TV Theme but Classic takes the same band from the screens (--tv-border-band in src/style.css).
 */
export const layoutTvThemeNames = tvThemeNames.slice(0, 2);

// Picks a TV Theme from the TV section of the palette menu in the Organizer screen's header.
export const chooseTvTheme = async (organizer: Page, tvThemeName: string) => {
	await organizer.getByRole('button', { name: 'Theme' }).click();
	const tvSection = organizer.getByRole('group', { name: 'TV' });
	await tvSection.getByRole('menuitemradio', { name: tvThemeName }).click();
};

// The TV Theme's artwork inside the frame given: the TV's window, the thumbnail or the peek.
export const findArtwork = (frame: Page | Locator) => frame.getByTestId('tv theme art');

// How many of the artwork's animations are running inside the frame given.
export const countMovingArtwork = (frame: Page | Locator) =>
	findArtwork(frame).evaluateAll(
		(pieces) =>
			pieces
				.flatMap((piece) => piece.getAnimations({ subtree: true }))
				.filter((animation) => animation.playState === 'running').length,
	);

/*
 * Fails, naming each piece of text, if any text on the TV reads below its contrast with what is behind it:
 * 7:1 for names, headings and bracket text, and 4.5:1 for secondary text: the TV Theme's muted, Fun Fact and
 * held-place colours, and a Match's loser, faded below the names.
 * Each colour is read as the browser draws it, through a one-pixel canvas, so any colour format compares.
 */
export const expectTvTextReadable = async (tv: Page, moment: string) => {
	const hardToRead = await tv.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true })!;
		const readRgba = (colour: string) => {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = colour;
			context.fillRect(0, 0, 1, 1);
			return context.getImageData(0, 0, 1, 1).data;
		};
		// WCAG's relative luminance of an sRGB colour.
		const measureLuminance = (colour: string) => {
			const [red, green, blue] = [...readRgba(colour)].slice(0, 3).map((channel) => {
				const share = channel / 255;
				return share <= 0.04045 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
		};
		// The colour behind an element: its own background, or the nearest drawn behind it.
		const findGround = (element: Element) => {
			for (let box: Element | null = element; box; box = box.parentElement) {
				const ground = getComputedStyle(box).backgroundColor;
				if (readRgba(ground)[3] > 0) {
					return ground;
				}
			}
			return 'white';
		};
		const tvScreen = document.querySelector('main')!;
		// Each named TV colour as the browser writes an element's colour, to compare with the text's.
		const probe = document.createElement('span');
		tvScreen.append(probe);
		const readTvColour = (role: string) => {
			probe.style.color = `var(--tv-${role})`;
			return getComputedStyle(probe).color;
		};
		const secondaryColours = ['muted', 'fun-fact', 'held', 'lost', 'on-champion-lost'].map(
			readTvColour,
		);
		probe.remove();
		const failures: string[] = [];
		const walker = document.createTreeWalker(tvScreen, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.textContent!.trim();
			const element = node.parentElement!;
			const colour = getComputedStyle(element).color;
			if (text === '') {
				continue;
			}
			const needed = secondaryColours.includes(colour) ? 4.5 : 7;
			const [lighter, darker] = [
				measureLuminance(colour),
				measureLuminance(findGround(element)),
			].sort((a, b) => b - a);
			const ratio = (lighter + 0.05) / (darker + 0.05);
			if (ratio < needed) {
				failures.push(
					`“${text.slice(0, 40)}” reads at ${ratio.toFixed(2)}:1, not ${needed}:1`,
				);
			}
		}
		return failures;
	});
	expect(hardToRead, moment).toEqual([]);
};

/*
 * Fails, naming the text, if any piece of the TV Theme's artwork overlaps a line of text or the countdown
 * ring. Text is measured line by line as the browser draws it, not by the box of its element, which may
 * stretch across the TV beside a short line.
 */
export const expectArtworkClearOfText = async (tv: Page) => {
	const { artworkCount, overlaps } = await tv.evaluate(() => {
		const tvScreen = document.querySelector('main')!;
		const artwork = [...tvScreen.querySelectorAll('[data-testid="tv theme art"]')].map(
			(piece) => piece.getBoundingClientRect(),
		);
		const isOverlapping = (box: DOMRect, other: DOMRect) =>
			box.left < other.right &&
			other.left < box.right &&
			box.top < other.bottom &&
			other.top < box.bottom;
		const found: string[] = [];
		const ring = tvScreen.querySelector('[data-testid="countdown ring"]');
		if (ring && artwork.some((piece) => isOverlapping(piece, ring.getBoundingClientRect()))) {
			found.push('the countdown ring');
		}
		const walker = document.createTreeWalker(tvScreen, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const range = document.createRange();
			range.selectNodeContents(node);
			const lines = [...range.getClientRects()];
			if (lines.some((line) => artwork.some((piece) => isOverlapping(piece, line)))) {
				found.push(`“${node.textContent!.trim().slice(0, 40)}”`);
			}
		}
		return { artworkCount: artwork.length, overlaps: found };
	});
	expect(artworkCount, 'no artwork drawn to measure').toBeGreaterThan(0);
	expect(overlaps, 'the artwork covers').toEqual([]);
};

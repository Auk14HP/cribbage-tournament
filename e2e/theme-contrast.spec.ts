import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import {
	confirmDrawFromHouseRules,
	findMatchesOnBoards,
	openTv,
	playToFinal,
	showHouseRules,
	test,
	tvSizes,
} from './setUpTournament';

/*
 * The Organizer screen's themes, in a real browser: every phase's text is readable in Light, Dark, and Match
 * laptop with the laptop set light or dark; the screen draws in Inter served with the app; and the TV keeps
 * its own look whatever the Organizer's theme.
 */

// Picks a theme from the palette menu in the Organizer screen's header.
const chooseTheme = async (page: Page, themeName: 'Match laptop' | 'Light' | 'Dark') => {
	await page.getByRole('button', { name: 'Theme' }).click();
	await page.getByRole('menuitemradio', { name: themeName }).click();
};

/*
 * Fails, naming each piece of text, if any text on screen reads below WCAG's 4.5:1 contrast with what is behind
 * it (3:1 for large text), as axe's color-contrast rule measures it.
 */
const expectReadableText = async (page: Page, moment: string) => {
	const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
	const hardToRead = results.violations.flatMap((violation) =>
		violation.nodes.map((node) => `${node.html}: ${node.failureSummary}`),
	);
	expect(hardToRead, moment).toEqual([]);
};

/*
 * Walks a Tournament from registration to its champion, checking the text at each phase and at the moments
 * that add colours of their own: the theme menu open, a House Rule shown with the rest still to come, a
 * confirmation dialog, Swap mode with a Player picked, a refusal, and the question whether a loser is staying.
 */
const expectEveryPhaseReadable = async (page: Page) => {
	await page.goto('/?players=9&boards=4');
	await page.getByRole('button', { name: 'Theme' }).click();
	await expectReadableText(page, 'registration, theme menu open');
	await page.keyboard.press('Escape');
	await page.getByLabel('Player name').fill('Dave K.');
	await page.getByLabel('Player name').press('Enter');
	await expect(page.getByRole('alert').first()).not.toBeEmpty();
	await expectReadableText(page, 'registration, a name refused');

	await showHouseRules(page);
	await page.getByRole('button', { name: 'Next' }).click();
	await expectReadableText(page, 'House Rules, one shown');
	await page.getByRole('button', { name: 'Make the Draw' }).click();
	await expectReadableText(page, 'House Rules, Make the Draw dialog');
	await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

	await confirmDrawFromHouseRules(page);
	await expectReadableText(page, 'Tonight’s Draw');
	await page.getByRole('button', { name: 'Swap Players' }).click();
	await findMatchesOnBoards(page).getByRole('button').first().click();
	await expectReadableText(page, 'Tonight’s Draw, Swap mode, a Player picked');
	await page.getByRole('button', { name: 'Done' }).click();

	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expectReadableText(page, 'Now playing');
	await findMatchesOnBoards(page).getByRole('button').first().click();
	await expectReadableText(page, 'Now playing, asking whether the loser is staying');
	await page.getByRole('dialog').getByRole('button', { name: 'Leaving' }).click();
	await expectReadableText(page, 'Now playing, a result recorded');

	await playToFinal(page);
	await expect(page.getByRole('heading', { name: 'Tournament finished' })).toBeVisible();
	await expectReadableText(page, 'Tournament finished');
};

test.describe('every phase reads at 4.5:1 or more', () => {
	for (const themeName of ['Light', 'Dark'] as const) {
		test(`in ${themeName}`, async ({ page }) => {
			await page.goto('/');
			await chooseTheme(page, themeName);
			await expectEveryPhaseReadable(page);
		});
	}

	for (const laptopScheme of ['light', 'dark'] as const) {
		test(`in Match laptop, the laptop set ${laptopScheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: laptopScheme });
			await expectEveryPhaseReadable(page);
		});
	}
});

test('turns with the laptop on Match laptop while the screen is open', async ({ page }) => {
	// The theme is set on the page's root element, which no role or label finds.
	const screenRoot = page.locator('html');
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await expect(screenRoot).toHaveAttribute('data-theme', 'light');

	await page.emulateMedia({ colorScheme: 'dark' });

	await expect(screenRoot).toHaveAttribute('data-theme', 'dark');
});

test('draws the Organizer screen in Inter from the app itself, not from a font site such as Google Fonts', async ({
	page,
	baseURL,
}) => {
	const requestedOrigins = new Set<string>();
	page.on('request', (request) => {
		const origin = new URL(request.url()).origin;
		requestedOrigins.add(origin);
	});

	await page.goto('/');
	const isInterLoaded = await page.evaluate(async () => {
		await document.fonts.ready;
		return [...document.fonts].some(
			(font) => font.family.includes('Inter Variable') && font.status === 'loaded',
		);
	});

	expect(isInterLoaded).toBe(true);
	await expect(page.getByRole('main')).toHaveCSS('font-family', /^"Inter Variable"/);
	expect([...requestedOrigins]).toEqual([new URL(baseURL!).origin]);
});

test('keeps the TV’s look despite the Organizer screen’s current theme', async ({ page }) => {
	await page.goto('/?players=9&boards=4');
	await chooseTheme(page, 'Dark');
	const tv = await openTv(page, tvSizes[0]);
	const tvScreen = tv.getByRole('main');

	await expect(tv.locator('html')).not.toHaveAttribute('data-theme');
	await expect(tvScreen).toHaveCSS('background-color', 'rgb(0, 0, 0)');
	await expect(tvScreen).toHaveCSS('color', 'rgb(255, 255, 255)');
	await expect(tvScreen).not.toHaveCSS('font-family', /Inter/);
});

test('moves nothing in the header when the theme menu opens or closes', async ({ page }) => {
	await page.goto('/');
	const header = page.getByRole('banner');
	const headerParts = [
		header.getByRole('heading'),
		header.getByRole('link', { name: 'Open TV display' }),
		header.getByRole('button', { name: 'Theme' }),
		header.getByRole('button', { name: 'Start a new Tournament' }),
		page.getByLabel('Player name'),
	];
	const themeMenu = page.getByRole('menu', { name: 'Theme' });

	await expectNothingMoves(headerParts, async () => {
		await page.getByRole('button', { name: 'Theme' }).click();
		await expect(themeMenu).toBeVisible();
	});
	await expectNothingMoves(headerParts, async () => {
		await page.keyboard.press('Escape');
		await expect(themeMenu).toBeHidden();
	});
});

import { expect, type Page } from '@playwright/test';
import {
	confirmDrawFromHouseRules,
	openTv,
	parkCycleOn,
	playFirstMatchesWithLosersStaying,
	playToFinal,
	showHouseRules,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';
import {
	chooseTvTheme,
	countMovingArtwork,
	expectArtworkClearOfText,
	expectTvTextReadable,
	findArtwork,
	tvThemeMenuNames,
} from './tvTheme';

/*
 * The TV Theme in a real browser: picking one in the Organizer's palette menu changes the TV in its own window
 * at once; every TV screen's text reads well in every TV Theme; and the artwork moves only on the TV, and not
 * there when the TV asks for reduced motion.
 */

// The field the walk through every TV screen plays: enough for a Losers Bracket, quick to play out.
const playerCount = 8;
const firstMatchCount = playerCount / 2;

const narrowerTv = tvSizes[1];

// The TV's screen, which carries the TV Theme it is drawn in.
const findTvScreen = (tv: Page) => tv.getByRole('main');

test('changes the TV at once when the Organizer picks a TV Theme', async ({ page: organizer }) => {
	await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
	const tv = await openTv(organizer, tvSizes[0]);

	await chooseTvTheme(organizer, 'Christmas');
	await expect(findTvScreen(tv)).toHaveAttribute('data-tv-theme', 'christmas');

	await chooseTvTheme(organizer, 'Classic');
	await expect(findTvScreen(tv)).toHaveAttribute('data-tv-theme', 'classic');
	await expect(findTvScreen(tv)).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

/*
 * Checks a TV screen in the TV Theme given reads well: its text at 7:1 or 4.5:1, everything inside the safe
 * area, and the TV Theme's artwork, if it has any, clear of every line of text and the countdown ring.
 */
const expectScreenDrawnWell = async (tv: Page, tvThemeName: string, moment: string) => {
	await expectTvTextReadable(tv, moment);
	await expectInsideTvSafeArea(tv);
	if (tvThemeName !== 'Classic') {
		await expectArtworkClearOfText(tv);
	}
};

/*
 * Every TV Theme, on every TV screen: each draws its own colours and artwork, so each is walked. On the narrower
 * TV, where the artwork has least room beside the text. The layout that every TV Theme with a border shares is
 * measured at its fullest fields in tv-safe-area.spec.ts and bracket-layout.spec.ts.
 */
for (const tvThemeName of tvThemeMenuNames) {
	test(`draws every TV screen well in ${tvThemeName}: text at 7:1 or 4.5:1, artwork clear of it, all inside the safe area`, async ({
		page: organizer,
	}) => {
		// Playing to the champions and parking the cycle on each screen takes longer than a test's usual 30 seconds.
		test.setTimeout(120_000);
		await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
		await chooseTvTheme(organizer, tvThemeName);
		const tv = await openTv(organizer, narrowerTv);
		// The Fun Fact fades in at the start of its time, so the screen is measured once it is fully shown.
		await expect(tv.getByText(/^Fun fact: /)).toHaveCSS('opacity', '1');
		await expectScreenDrawnWell(tv, tvThemeName, 'Tonight’s Players');

		await showHouseRules(organizer);
		await organizer.getByRole('button', { name: 'Show all' }).click();
		await tv.getByRole('heading', { name: 'House Rules' }).waitFor();
		await expectScreenDrawnWell(tv, tvThemeName, 'House Rules, every one shown');

		await confirmDrawFromHouseRules(organizer);
		await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
		await expectScreenDrawnWell(tv, tvThemeName, 'Tonight’s Draw');

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await expectScreenDrawnWell(tv, tvThemeName, 'Winners Bracket');

		await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount });
		await parkCycleOn(organizer, tv, 'Losers Bracket');
		await expectScreenDrawnWell(tv, tvThemeName, 'Losers Bracket');

		await playToFinal(organizer);
		await parkCycleOn(organizer, tv, 'Tonight’s Champions');
		await expectScreenDrawnWell(tv, tvThemeName, 'Tonight’s Champions');
		await parkCycleOn(organizer, tv, 'Winners Bracket');
		await expectScreenDrawnWell(tv, tvThemeName, 'Winners Bracket, its champion found');
	});
}

test('moves the artwork gently on the TV, and stills it when the TV asks for reduced motion', async ({
	page: organizer,
}) => {
	await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
	await chooseTvTheme(organizer, 'Christmas');
	const tv = await openTv(organizer, tvSizes[0]);
	await expect(findArtwork(tv).first()).toBeVisible();
	expect(await countMovingArtwork(tv), 'artwork moving on the TV').toBeGreaterThan(0);

	await tv.emulateMedia({ reducedMotion: 'reduce' });

	expect(await countMovingArtwork(tv), 'artwork moving under reduced motion').toBe(0);
});

test('shows the artwork still in the TV Display’s thumbnail and the Bracket peek', async ({
	page: organizer,
}) => {
	await startTournament(organizer, { players: playerCount });
	await chooseTvTheme(organizer, 'Christmas');
	const thumbnail = organizer.getByTestId('tv thumbnail');
	await expect(findArtwork(thumbnail).first()).toBeVisible();
	expect(await countMovingArtwork(thumbnail), 'artwork moving in the thumbnail').toBe(0);

	await organizer.getByRole('button', { name: 'Look at the brackets here' }).click();
	const peek = organizer.getByRole('dialog', { name: 'The brackets' });
	await expect(findArtwork(peek).first()).toBeVisible();

	expect(await countMovingArtwork(peek), 'artwork moving in the Bracket peek').toBe(0);
});

import { expect, type Page } from '@playwright/test';
import {
	confirmDrawFromHouseRules,
	parkCycleOn,
	openTv,
	playFirstMatchesWithLosersStaying,
	playToFinal,
	showHouseRules,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';
import { chooseTvTheme, expectArtworkClearOfText, tvThemeNames } from './tvTheme';
import { expectWhollyOnScreen } from './whollyOnScreen';

// The field that fills the most of each TV screen.
const playerCount = 32;

// A field with no Byes opens a first Match for every two Players.
const firstMatchCount = playerCount / 2;

/*
 * Every TV screen keeps its content, the countdown ring and the TV Theme's artwork included, inside the safe
 * area a TV that overscans leaves uncropped, and the artwork clear of every line of text and the ring. With the
 * field that fills the most of each screen, on a 16:9 TV and on a narrower one, in every TV Theme.
 */

// Checks the TV screen sits inside the safe area, and its TV Theme's artwork covers nothing.
const expectScreenFits = async (tv: Page, tvThemeName: string) => {
	await expectInsideTvSafeArea(tv);
	if (tvThemeName !== 'Classic') {
		await expectArtworkClearOfText(tv);
	}
};

for (const [tvSize, tvThemeName] of tvSizes.flatMap((size) =>
	tvThemeNames.map((name) => [size, name] as const),
)) {
	test.describe(`on a ${tvSize.width}×${tvSize.height} TV with ${playerCount} Players in ${tvThemeName}`, () => {
		test('Tonight’s Players, every name wholly shown, the House Rules and Tonight’s Draw sit inside the safe area', async ({
			page: organizer,
		}) => {
			await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
			await chooseTvTheme(organizer, tvThemeName);
			const tv = await openTv(organizer, tvSize);
			await tv
				.getByRole('heading', { name: 'Farmstrong Brewery Cribbage Tournament' })
				.waitFor();
			await expectScreenFits(tv, tvThemeName);

			/*
			 * Every Player's name wholly on screen, too. The safe-area check measures only the part of each
			 * element its list leaves visible, so a name the list clips out of sight would still pass it.
			 */
			const playersList = tv.getByRole('list', { name: 'Players' });
			const playerNameItems = playersList.getByRole('listitem');
			await expect(playerNameItems).toHaveCount(playerCount);
			await expectWhollyOnScreen(await playerNameItems.all());

			// Every House Rule shown, the most the House Rules screen holds, down to the last.
			await showHouseRules(organizer);
			await organizer.getByRole('button', { name: 'Show all' }).click();
			await tv.getByText('Tell the Organizer who won as soon as your game ends.').waitFor();
			await expectScreenFits(tv, tvThemeName);

			await confirmDrawFromHouseRules(organizer);
			await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
			await expectScreenFits(tv, tvThemeName);
		});

		test('the Winners Bracket sits inside the safe area at Start', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await chooseTvTheme(organizer, tvThemeName);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expectScreenFits(tv, tvThemeName);
		});

		test('the Losers Bracket and the countdown ring sit inside the safe area once drawn', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await chooseTvTheme(organizer, tvThemeName);
			await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount });
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectScreenFits(tv, tvThemeName);

			await parkCycleOn(organizer, tv, 'Losers Bracket');
			await expectScreenFits(tv, tvThemeName);
		});

		test('the champion and the countdown ring sit inside the safe area once finished', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await chooseTvTheme(organizer, tvThemeName);
			await playToFinal(organizer);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Tonight’s Champion' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectScreenFits(tv, tvThemeName);
		});
	});
}

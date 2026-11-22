import { expect, type Page } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDrawFromHouseRules,
	findMatchesOnBoards,
	holdScreen,
	openTv,
	playToFinal,
	showHouseRules,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';
import { expectWhollyOnScreen } from './whollyOnScreen';

// The field that fills the most of each TV screen.
const playerCount = 32;

// A field with no Byes opens a first Match for every two Players.
const firstMatchCount = playerCount / 2;

/*
 * Records results, each loser of a first Match staying for the Losers Bracket, until every first Match has
 * one. Counts the losers asked rather than clicks, since a click may record a later Match whose loser isn't
 * asked.
 */
const playFirstMatchesWithLosersStaying = async (organizer: Page) => {
	const nextWinnerButton = findMatchesOnBoards(organizer).getByRole('button').first();
	let stayingCount = 0;
	while (stayingCount < firstMatchCount) {
		await nextWinnerButton.click();
		if (await answerIsLoserStayingDialogIfAsked(organizer, 'Staying')) {
			stayingCount++;
		}
	}
};

/*
 * Every TV screen keeps its content, the countdown ring included, inside the safe area a TV that overscans
 * leaves uncropped. With the field that fills the most of each screen, on a 16:9 TV and on a narrower one.
 */

for (const tvSize of tvSizes) {
	test.describe(`on a ${tvSize.width}×${tvSize.height} TV with ${playerCount} Players`, () => {
		test('Tonight’s Players, every name wholly shown, the House Rules and Tonight’s Draw sit inside the safe area', async ({
			page: organizer,
		}) => {
			await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
			const tv = await openTv(organizer, tvSize);
			await tv
				.getByRole('heading', { name: 'Farmstrong Brewery Cribbage Tournament' })
				.waitFor();
			await expectInsideTvSafeArea(tv);

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
			await expectInsideTvSafeArea(tv);

			await confirmDrawFromHouseRules(organizer);
			await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
			await expectInsideTvSafeArea(tv);
		});

		test('the Winners Bracket sits inside the safe area at Start', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expectInsideTvSafeArea(tv);
		});

		test('the Losers Bracket and the countdown ring sit inside the safe area once drawn', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await playFirstMatchesWithLosersStaying(organizer);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectInsideTvSafeArea(tv);

			await holdScreen(organizer, tv, 'Losers Bracket');
			await expectInsideTvSafeArea(tv);
		});

		test('the champion and the countdown ring sit inside the safe area once finished', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await playToFinal(organizer);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Tonight’s Champion' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectInsideTvSafeArea(tv);
		});
	});
}

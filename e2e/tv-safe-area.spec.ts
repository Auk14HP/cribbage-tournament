import { expect, type Page } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDraw,
	findMatchesOnBoards,
	holdScreen,
	openTv,
	playToFinal,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';

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
		test('Tonight’s Players and Tonight’s Draw sit inside the safe area', async ({
			page: organizer,
		}) => {
			await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Tonight’s Players' }).waitFor();
			await expectInsideTvSafeArea(tv);

			await confirmDraw(organizer);
			await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
			await expectInsideTvSafeArea(tv);
		});

		test('the Winners Bracket, its countdown ring and Now playing sit inside the safe area at Start', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectInsideTvSafeArea(tv);

			await holdScreen(organizer, tv, 'Now playing');
			await expectInsideTvSafeArea(tv);
		});

		test('the Losers Bracket sits inside the safe area once drawn', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: playerCount });
			await playFirstMatchesWithLosersStaying(organizer);
			const tv = await openTv(organizer, tvSize);
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

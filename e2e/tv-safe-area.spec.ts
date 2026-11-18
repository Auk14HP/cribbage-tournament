import { expect, type Page } from '@playwright/test';
import {
	answerIsLoserStayingDialogIfAsked,
	confirmDraw,
	holdScreen,
	openTv,
	playToFinal,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';

// 32 Players open 16 first Matches, so 16 losers staying draw the largest Losers Bracket.
const firstMatchCount = 16;

/*
 * Records results until every first Match has one, each loser staying, so the Losers Bracket is drawn.
 * Counts the losers asked rather than clicks, since a click may record a later Match whose loser isn't asked.
 */
const playFirstMatchesWithLosersStaying = async (organizer: Page) => {
	const nextWinnerButton = organizer
		.getByRole('list', { name: 'Matches' })
		.getByRole('button')
		.first();
	const stayingDialog = organizer.getByRole('dialog', {
		name: /staying for the Losers Bracket/,
	});
	for (let staying = 0; staying < firstMatchCount;) {
		await nextWinnerButton.click();
		if (await stayingDialog.isVisible()) {
			await answerIsLoserStayingDialogIfAsked(organizer, 'Staying');
			staying++;
		}
	}
};

/*
 * Every TV screen keeps its content, the countdown ring included, inside the safe area a TV that overscans
 * leaves uncropped. With 32 Players, the field that fills the most of each screen, on a 16:9 TV and on a
 * narrower one.
 */

for (const tvSize of tvSizes) {
	test.describe(`on a ${tvSize.width}×${tvSize.height} TV with 32 Players`, () => {
		test('Tonight’s Players and Tonight’s Draw sit inside the safe area', async ({
			page: organizer,
		}) => {
			await organizer.goto('/?players=32&boards=16');
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
			await startTournament(organizer, { players: 32 });
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
			await startTournament(organizer, { players: 32 });
			await playFirstMatchesWithLosersStaying(organizer);
			const tv = await openTv(organizer, tvSize);
			await holdScreen(organizer, tv, 'Losers Bracket');
			await expectInsideTvSafeArea(tv);
		});

		test('the champion and the countdown ring sit inside the safe area once finished', async ({
			page: organizer,
		}) => {
			await startTournament(organizer, { players: 32 });
			await playToFinal(organizer);
			const tv = await openTv(organizer, tvSize);
			await tv.getByRole('heading', { name: 'Tonight’s Champion' }).waitFor();
			await expect(tv.getByTestId('countdown ring')).toBeAttached();
			await expectInsideTvSafeArea(tv);
		});
	});
}

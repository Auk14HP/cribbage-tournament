import { expect } from '@playwright/test';
import {
	confirmDraw,
	holdScreen,
	openTv,
	playToFinal,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';

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

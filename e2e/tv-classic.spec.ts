import { expect, type Page } from '@playwright/test';
import {
	confirmDrawFromHouseRules,
	openTv,
	parkCycleOn,
	playFirstMatchesWithLosersStaying,
	playToFinal,
	showHouseRules,
	test,
	tvSizes,
} from './setUpTournament';
import { chooseTvTheme } from './tvTheme';

/*
 * Classic, the TV's plain black look, drawn the same from one change to the next: every TV screen compared with
 * a saved picture of it, pixel by pixel. A change that alters Classic fails here with a picture of the
 * difference in test-results/. When Classic is meant to change, save the new pictures with
 * `npx playwright test tv-classic --update-snapshots` and commit them; the pictures differ by system, since the
 * TV draws in the system's font, so CI's are saved from its own run (docs/tv-themes.md).
 */

// The field: enough for a Losers Bracket and two champions, quick to play out.
const playerCount = 12;
const firstMatchCount = playerCount / 2;

/*
 * What differs from one run to the next, covered in each picture: the night's date, the Fun Fact, chosen at
 * random, and the countdown ring, caught at whatever moment of its fill.
 */
const findChangingParts = (tv: Page) => [
	tv.getByText(/^\w+day, \w+ \d+, \d{4}$/),
	tv.getByText(/^Fun fact: /),
	tv.getByTestId('countdown ring'),
];

// Compares the TV with its saved picture of the screen named, the changing parts covered.
const expectScreenUnchanged = async (tv: Page, screenName: string) => {
	await expect(tv).toHaveScreenshot(`${screenName}.png`, {
		mask: findChangingParts(tv),
		/*
		 * Any shade of difference counts, so a grey a step lighter fails, with a few pixels' leeway for the edges
		 * of letters, which a browser can draw a shade differently run to run.
		 */
		threshold: 0,
		maxDiffPixels: 20,
	});
};

test('draws every TV screen in Classic just as its saved picture', async ({ page: organizer }) => {
	// Playing to the champions and parking the cycle on each screen takes longer than a test's usual 30 seconds.
	test.setTimeout(120_000);
	await organizer.goto(`/?players=${playerCount}&boards=${firstMatchCount}`);
	await chooseTvTheme(organizer, 'Classic');
	const tv = await openTv(organizer, tvSizes[0]);
	await tv.getByRole('list', { name: 'Players' }).waitFor();
	await expectScreenUnchanged(tv, 'tonights-players');

	await showHouseRules(organizer);
	await organizer.getByRole('button', { name: 'Show all' }).click();
	await tv.getByText('Tell the Organizer who won as soon as your game ends.').waitFor();
	await expectScreenUnchanged(tv, 'house-rules');

	await confirmDrawFromHouseRules(organizer);
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
	await expectScreenUnchanged(tv, 'tonights-draw');

	await organizer.getByRole('button', { name: 'Start', exact: true }).click();
	await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
	await expectScreenUnchanged(tv, 'winners-bracket');

	await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount });
	await parkCycleOn(organizer, tv, 'Losers Bracket');
	await expectScreenUnchanged(tv, 'losers-bracket');

	await playToFinal(organizer);
	await parkCycleOn(organizer, tv, 'Tonight’s Champions');
	await expectScreenUnchanged(tv, 'champions');
	await parkCycleOn(organizer, tv, 'Winners Bracket');
	await expectScreenUnchanged(tv, 'winners-bracket-finished');
});

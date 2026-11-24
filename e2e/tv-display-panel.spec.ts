import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import {
	openTv,
	playFirstMatchesWithLosersStaying,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';

/*
 * The TV Display panel's thumbnail beside the TV itself: two windows working out the screen on show each from
 * the clock, which must agree. jsdom has one window and no layout, so this runs in a real browser.
 */

test.use({ viewport: { width: 1280, height: 720 } });

// The thumbnail of the TV screen on show, named for that screen.
const findThumbnail = (organizer: Page) => organizer.getByRole('img', { name: /^The TV showing / });

// The TV's heading: the name of the bracket on show.
const findTvHeading = (tv: Page) => tv.getByRole('heading', { level: 1 });

/*
 * How long the second window may lag the first. Each window looks at the clock the moment its screen's time is
 * up, and a saved change reaches the TV through a storage event, so the two meet within moments.
 */
const sameMomentMs = 500;

// Clicks the named pill among the choices of what the TV shows, as the Organizer would.
const pickTvChoice = async (organizer: Page, choiceName: string) => {
	const choices = organizer.getByRole('group', { name: 'TV shows' });
	await choices.getByText(choiceName, { exact: true }).click();
};

// Saves the seconds per TV screen with Enter, as an Organizer would.
const enterScreenSeconds = async (organizer: Page, seconds: string) => {
	const secondsInput = organizer.getByLabel('Seconds per TV screen');
	await secondsInput.fill(seconds);
	await secondsInput.press('Enter');
};

/*
 * 6 Players, Started, and the Draw's three Matches played with every loser staying: the Losers Bracket is
 * drawn, so the TV cycles two screens. The TV opens beside the Organizer.
 */
const setUpTwoScreenCycle = async (organizer: Page) => {
	await startTournament(organizer, { players: 6 });
	await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount: 3 });
	return openTv(organizer, tvSizes[0]);
};

test('across a cycle, the thumbnail shows the screen the TV shows', async ({ page: organizer }) => {
	const tv = await setUpTwoScreenCycle(organizer);
	await enterScreenSeconds(organizer, '2');

	for (const screenName of ['Winners Bracket', 'Losers Bracket', 'Winners Bracket']) {
		await expect(findTvHeading(tv)).toHaveText(screenName, { timeout: 5000 });
		await expect(findThumbnail(organizer)).toHaveAccessibleName(
			`The TV showing ${screenName}`,
			{ timeout: sameMomentMs },
		);
	}
});

test('choosing a screen, or a new time, shows on the TV and the thumbnail at once', async ({
	page: organizer,
}) => {
	const tv = await setUpTwoScreenCycle(organizer);
	// Long enough that Auto's cycle doesn't move on by itself during the test.
	await enterScreenSeconds(organizer, '600');
	const heldScreen =
		(await findTvHeading(tv).textContent()) === 'Winners Bracket'
			? 'Losers Bracket'
			: 'Winners Bracket';

	await pickTvChoice(organizer, heldScreen);

	await expect(findThumbnail(organizer)).toHaveAccessibleName(`The TV showing ${heldScreen}`, {
		timeout: sameMomentMs,
	});
	await expect(findTvHeading(tv)).toHaveText(heldScreen, { timeout: sameMomentMs });
	await expect(organizer.getByTestId('countdown strip')).toHaveCount(0);
	await expect(tv.getByTestId('countdown ring')).toHaveCount(0);

	await pickTvChoice(organizer, 'Auto');
	await enterScreenSeconds(organizer, '45');

	await expect(organizer.getByTestId('countdown strip')).toHaveCSS(
		'--countdown-duration',
		'45s',
		{ timeout: sameMomentMs },
	);
	await expect(tv.getByTestId('countdown ring')).toHaveCSS('--countdown-duration', '45s', {
		timeout: sameMomentMs,
	});
});

test('moves nothing in the TV Display panel when the strip comes and goes with a Held screen', async ({
	page: organizer,
}) => {
	await setUpTwoScreenCycle(organizer);
	await enterScreenSeconds(organizer, '600');
	const panel = organizer.getByRole('region', { name: 'TV Display' });
	const parts = [
		panel.getByRole('heading', { name: 'TV Display' }),
		findThumbnail(organizer),
		// Each pill's radio button sits inside it, so a pill that moves moves its radio button.
		panel.getByRole('radio'),
		organizer.getByLabel('Seconds per TV screen'),
	];
	const strip = organizer.getByTestId('countdown strip');

	await expectNothingMoves(parts, async () => {
		await pickTvChoice(organizer, 'Losers Bracket');
		await expect(strip).toHaveCount(0);
	});
	await expectNothingMoves(parts, async () => {
		await pickTvChoice(organizer, 'Auto');
		await expect(strip).toBeVisible();
	});
});

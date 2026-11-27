import { expect, type Page } from '@playwright/test';
import {
	openTv,
	playFirstMatchesWithLosersStaying,
	startTournament,
	test,
	tvSizes,
} from './setUpTournament';
import { expectWhollyOnScreen } from './whollyOnScreen';

/*
 * Looking at the brackets on the laptop, in a real browser beside the TV: jsdom has no modal
 * dialogs, so Escape and where focus goes are checked here, and it has one window, so the TV's own
 * screen is too. The route tests cover which bracket the dialog opens on and its tabs.
 */

test.use({ viewport: { width: 1280, height: 720 } });

/*
 * 6 Players, Started, the Draw's three Matches played with every loser staying, and the TV held on
 * the Losers Bracket. The TV opens beside the Organizer.
 */
const setUpHeldOnLosersBracket = async (organizer: Page) => {
	await startTournament(organizer, { players: 6 });
	await playFirstMatchesWithLosersStaying(organizer, { firstMatchCount: 3 });
	const choices = organizer.getByRole('group', { name: 'TV shows' });
	await choices.getByText('Losers Bracket', { exact: true }).click();
	return openTv(organizer, tvSizes[0]);
};

// Checks the TV still holds the Losers Bracket, on the TV and in the Organizer's choice of it.
const expectTvStillHoldingLosersBracket = async (organizer: Page, tv: Page) => {
	await expect(tv.getByRole('heading', { level: 1 })).toHaveText('Losers Bracket');
	await expect(organizer.getByRole('radio', { name: 'Losers Bracket' })).toBeChecked();
};

test('Escape and the close button close the brackets, focus goes back to what opened them, and the TV holds its screen', async ({
	page: organizer,
}) => {
	const tv = await setUpHeldOnLosersBracket(organizer);
	const peek = organizer.getByRole('dialog', { name: 'The brackets' });
	const thumbnailButton = organizer.getByRole('button', {
		name: 'Look at the Losers Bracket full size',
	});
	const lookAtBracketsButton = organizer.getByRole('button', {
		name: 'Look at the brackets here',
	});

	await thumbnailButton.click();
	await expect(peek.getByRole('tab', { name: 'Losers Bracket' })).toHaveAttribute(
		'aria-selected',
		'true',
	);
	await organizer.keyboard.press('Escape');
	await expect(peek).toBeHidden();
	await expect(thumbnailButton).toBeFocused();
	await expectTvStillHoldingLosersBracket(organizer, tv);

	await lookAtBracketsButton.click();
	await peek.getByRole('tab', { name: 'Losers Bracket' }).focus();
	await organizer.keyboard.press('ArrowLeft');
	const winnersTab = peek.getByRole('tab', { name: 'Winners Bracket' });
	await expect(winnersTab).toBeFocused();
	await expect(winnersTab).toHaveAttribute('aria-selected', 'true');
	await expect(peek.getByRole('heading', { level: 1 })).toHaveText('Winners Bracket');
	await peek.getByRole('button', { name: 'Close the brackets' }).click();
	await expect(peek).toBeHidden();
	await expect(lookAtBracketsButton).toBeFocused();
	await expectTvStillHoldingLosersBracket(organizer, tv);
});

test('shows the whole bracket in a laptop window, its Final included', async ({
	page: organizer,
}) => {
	await setUpHeldOnLosersBracket(organizer);
	await organizer.getByRole('button', { name: 'Look at the brackets here' }).click();
	const peek = organizer.getByRole('dialog', { name: 'The brackets' });

	await expectWhollyOnScreen([
		peek.getByRole('tab', { name: 'Winners Bracket' }),
		peek.getByRole('button', { name: 'Close the brackets' }),
		peek.getByRole('tabpanel'),
		peek.getByRole('list', { name: 'Final' }),
	]);
});

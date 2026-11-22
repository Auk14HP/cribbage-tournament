import { expect, type Page } from '@playwright/test';
import { confirmDraw, openTv, test, tvSizes } from './setUpTournament';
import { expectInsideTvSafeArea } from './tvSafeArea';

/*
 * A Match waiting for a Board shows on the TV's bracket as a card with its Players and no Board, on Tonight's
 * Draw and once Started, and the bracket still fits inside the TV's safe area.
 */

// 32 Players open 16 Matches, and those without a Board wait for one.
const openingMatchCount = 16;

// A 16:9 TV, the one most rooms have.
const [sixteenByNineTv] = tvSizes;

const showDrawOnTv = async (organizer: Page, tv: Page) => {
	await confirmDraw(organizer);
	await tv.getByRole('heading', { name: 'Tonight’s Draw' }).waitFor();
};

/*
 * Checks the first Round's cards: as many name a Board as there are Boards, and the rest, waiting, name none.
 * Every card names its two Players. Then that the bracket fits inside the TV's safe area.
 */
const expectWaitingCardsFitTv = async (tv: Page, boardCount: number) => {
	const roundOneCards = tv.getByRole('list', { name: 'Round 1' }).getByTestId('match card');
	await expect(roundOneCards).toHaveCount(openingMatchCount);
	await expect(roundOneCards.filter({ hasText: /^Board \d+/ })).toHaveCount(boardCount);
	const waitingCards = roundOneCards.filter({ hasNotText: 'Board' });
	await expect(waitingCards).toHaveCount(openingMatchCount - boardCount);
	for (const card of await waitingCards.all()) {
		await expect(card.locator('span')).toHaveCount(2);
		await expect(card).not.toContainText('—');
	}
	await expectInsideTvSafeArea(tv);
};

const registerPlayers = async (organizer: Page, names: string[]) => {
	const playerName = organizer.getByLabel('Player name');
	for (const name of names) {
		await playerName.fill(name);
		await playerName.press('Enter');
	}
};

const makeLongNames = (playerCount: number) =>
	Array.from({ length: playerCount }, (_, index) => `Bartholomew Featherstonehaugh ${index + 1}`);

for (const boardCount of [2, 13]) {
	test(`Matches waiting for a Board show on the TV's bracket at 32 Players on ${boardCount} Boards`, async ({
		page: organizer,
	}) => {
		await organizer.goto(`/?players=32&boards=${boardCount}`);
		const tv = await openTv(organizer, sixteenByNineTv);

		await showDrawOnTv(organizer, tv);
		await expectWaitingCardsFitTv(tv, boardCount);

		await organizer.getByRole('button', { name: 'Start', exact: true }).click();
		await tv.getByRole('heading', { name: 'Winners Bracket' }).waitFor();
		await expectWaitingCardsFitTv(tv, boardCount);
	});
}

test('Long names keep Tonight’s Draw inside the TV', async ({ page: organizer }) => {
	const boardCount = 13;
	await organizer.goto(`/?players=0&boards=${boardCount}`);
	const tv = await openTv(organizer, sixteenByNineTv);
	await registerPlayers(organizer, makeLongNames(32));

	await showDrawOnTv(organizer, tv);

	await expectWaitingCardsFitTv(tv, boardCount);
});

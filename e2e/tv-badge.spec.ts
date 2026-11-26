import { expect, type Page } from '@playwright/test';
import { expectNothingMoves } from './screenStill';
import { test, tvClosingTimeout, tvSizes } from './setUpTournament';

/*
 * The badge in the Organizer screen's header, beside Open TV display, says whether the TV window is running, from the heartbeat the
 * TV's window saves while it is open. While the TV is closed, Open TV display is the screen's main button.
 */

const findTvBadge = (organizer: Page) => organizer.getByRole('status', { name: 'TV' });

const findOpenTvLink = (organizer: Page) =>
	organizer.getByRole('link', { name: 'Open TV display' });

// The background of Show House Rules, filled in the theme's yellow as a main button is.
const readMainButtonBackground = (organizer: Page) =>
	organizer
		.getByRole('button', { name: 'Show House Rules' })
		.evaluate((element) => getComputedStyle(element).backgroundColor);

const readOpenTvLinkBackground = (organizer: Page) =>
	findOpenTvLink(organizer).evaluate((element) => getComputedStyle(element).backgroundColor);

// The header, every part of it, and the box below it, which must all stay put as the badge changes.
const findHeaderParts = (organizer: Page) => [
	organizer.getByTestId('organizer header'),
	findTvBadge(organizer),
	organizer.getByRole('heading', { level: 1 }),
	organizer.getByRole('button', { name: 'Start a new Tournament' }),
	findOpenTvLink(organizer),
	organizer.getByRole('button', { name: 'Theme' }),
	organizer.getByLabel('Player name'),
];

test('reads TV open while the TV window is open and TV closed once it closes, with nothing in the header moving', async ({
	context,
	page: organizer,
}) => {
	await organizer.goto('/');
	const tvBadge = findTvBadge(organizer);
	await expect(tvBadge.getByText('TV closed')).toBeVisible();
	const mainButtonBackground = await readMainButtonBackground(organizer);
	expect(await readOpenTvLinkBackground(organizer)).toBe(mainButtonBackground);

	let tv: Page | undefined;
	await expectNothingMoves(findHeaderParts(organizer), async () => {
		tv = await context.newPage();
		await tv.setViewportSize(tvSizes[0]);
		await tv.goto('/display');
		await expect(tvBadge.getByText('TV open')).toBeVisible();
	});
	expect(await readOpenTvLinkBackground(organizer)).not.toBe(mainButtonBackground);

	await expectNothingMoves(findHeaderParts(organizer), async () => {
		await tv!.close();
		await expect(tvBadge.getByText('TV closed')).toBeVisible(tvClosingTimeout);
	});
	expect(await readOpenTvLinkBackground(organizer)).toBe(mainButtonBackground);
});

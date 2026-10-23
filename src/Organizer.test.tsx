// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';
import { localStorageStore } from './storage';
import type { Tournament } from './tournament';

const key = 'organizer-test';

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
});

const showOrganizer = () => {
	render(<Organizer store={localStorageStore<Tournament>(key)} />);
	return userEvent.setup();
};

const register = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
	await user.type(screen.getByLabelText('Player name'), `${name}{Enter}`);
};

const listedNames = () =>
	screen.queryAllByRole('listitem').map((item) => item.querySelector('span')?.textContent);

describe('the organizer route', () => {
	it('registers a Player, lists them with the running count, and clears the name box', async () => {
		const user = showOrganizer();

		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		expect(listedNames()).toEqual(['Dave K.', 'Big Dave']);
		expect(screen.getByText('2 Players registered')).toBeInTheDocument();
		expect(screen.getByLabelText('Player name')).toHaveValue('');
	});

	it('shows the reason when a name is refused, and keeps what was typed', async () => {
		const user = showOrganizer();
		await register(user, 'Big Dave');

		await register(user, 'Big Dave');

		expect(screen.getByRole('alert')).toHaveTextContent(
			'There is already a Player called "Big Dave".',
		);
		expect(screen.getByLabelText('Player name')).toHaveValue('Big Dave');
		expect(listedNames()).toEqual(['Big Dave']);
	});

	it('renames a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');

		await user.click(screen.getByRole('button', { name: 'Rename' }));
		await user.clear(screen.getByLabelText('New name for Dave K'));
		await user.type(screen.getByLabelText('New name for Dave K'), 'Dave K.{Enter}');

		expect(listedNames()).toEqual(['Dave K.']);
	});

	it('removes a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		const daveK = screen.getByText('Dave K.').closest('li')!;
		await user.click(within(daveK).getByRole('button', { name: 'Remove' }));

		expect(listedNames()).toEqual(['Big Dave']);
		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
	});

	it('starts a new Tournament only once the Organizer confirms', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		const confirm = vi.spyOn(window, 'confirm');

		confirm.mockReturnValueOnce(false);
		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		expect(listedNames()).toEqual(['Dave K.']);

		confirm.mockReturnValueOnce(true);
		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		expect(listedNames()).toEqual([]);
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listedNames()).toEqual(['Dave K.']);
	});
});

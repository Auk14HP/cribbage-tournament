// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';
import { localStorageStore } from './storage';
import { tournamentVersion, type Tournament } from './tournament';

const key = 'organizer-test';

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
});

const showOrganizer = () => {
	render(<Organizer store={localStorageStore<Tournament>(key, tournamentVersion)} />);
	return userEvent.setup();
};

const register = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
	await user.type(screen.getByLabelText('Player name'), `${name}{Enter}`);
};

const addBoard = async (user: ReturnType<typeof userEvent.setup>, board: string) => {
	await user.type(screen.getByLabelText('Board number'), `${board}{Enter}`);
};

const listed = (list: string) =>
	within(screen.getByRole('list', { name: list }))
		.queryAllByRole('listitem')
		.map((item) => item.querySelector('span')?.textContent);

const listedNames = () => listed('Players');

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
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('enters Boards, listed in number order, refusing a repeat, and takes one out', async () => {
		const user = showOrganizer();

		await addBoard(user, '3');
		await addBoard(user, '1');
		await addBoard(user, '12');
		await addBoard(user, '3');

		expect(screen.getByRole('alert')).toHaveTextContent('Board 3 is already entered.');
		expect(listed('Boards')).toEqual(['Board 1', 'Board 3', 'Board 12']);

		const board12 = screen.getByText('Board 12').closest('li')!;
		await user.click(within(board12).getByRole('button', { name: 'Remove' }));

		expect(listed('Boards')).toEqual(['Board 1', 'Board 3']);
	});

	it('shows why the Draw is refused', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');
		vi.spyOn(window, 'confirm').mockReturnValue(true);

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));

		expect(screen.getByRole('alert')).toHaveTextContent(
			'The Draw needs a Board for its first-Round Match, and none are entered.',
		);
	});

	it('makes the Draw once confirmed, closing registration and showing Round 1, then Starts', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await addBoard(user, '4');
		await addBoard(user, '2');
		const confirm = vi.spyOn(window, 'confirm');

		confirm.mockReturnValueOnce(false);
		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		expect(screen.getByLabelText('Player name')).toBeInTheDocument();

		confirm.mockReturnValueOnce(true);
		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Round 1 draw');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		// 3 Players: one first-Round Match, on the lowest-numbered Board, and one Bye.
		const matches = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		const byes = within(screen.getByRole('list', { name: 'Byes' })).getAllByRole('listitem');
		expect(matches).toHaveLength(1);
		expect(matches[0]).toHaveTextContent(/^Board 2/);
		expect(byes).toHaveLength(1);
		const drawnIntoTheMatch = ['Dave K.', 'Big Dave', 'Sue'].filter(
			(name) => name !== byes[0].textContent,
		);
		expect(drawnIntoTheMatch).toHaveLength(2);
		for (const name of drawnIntoTheMatch) {
			expect(matches[0]).toHaveTextContent(name);
		}

		await user.click(screen.getByRole('button', { name: 'Start' }));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Round 1$/);
		expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

		confirm.mockReturnValueOnce(true);
		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		expect(listedNames()).toEqual([]);
		expect(listed('Boards')).toEqual([]);
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listedNames()).toEqual(['Dave K.']);
	});
});

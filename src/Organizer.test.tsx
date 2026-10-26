// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Organizer } from './Organizer';
import { createLocalStorageStore } from './storage';
import { tournamentVersion, type Tournament } from './tournament';

const key = 'organizer-test';

/*
 * jsdom has no modal dialogs, so these stand in for the browser's, opening and closing only. Escape and
 * moving focus are the browser's, covered in e2e/.
 */
beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function () {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function () {
		this.open = false;
	};
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

const showOrganizer = () => {
	render(<Organizer store={createLocalStorageStore<Tournament>(key, tournamentVersion)} />);
	return userEvent.setup();
};

const register = async (user: User, name: string) => {
	await user.type(screen.getByLabelText('Player name'), `${name}{Enter}`);
};

const setBoardCount = async (user: User, count: string) => {
	await user.clear(screen.getByLabelText('Number of Boards'));
	await user.type(screen.getByLabelText('Number of Boards'), count);
};

// Answers the open confirmation dialog by pressing one of its buttons.
const answerDialog = async (user: User, button: string) => {
	await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: button }));
};

// A refusal shows beside the controls that caused it.
const getRefusalIn = (section: string) =>
	within(screen.getByRole('region', { name: section })).getByRole('alert');

const listPlayerNames = () =>
	within(screen.getByRole('list', { name: 'Players' }))
		.queryAllByRole('listitem')
		.map((item) => item.querySelector('span')?.textContent);

describe('the organizer route', () => {
	it('registers a Player, lists them with the running count, and clears the name box', async () => {
		const user = showOrganizer();

		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		expect(listPlayerNames()).toEqual(['Dave K.', 'Big Dave']);
		expect(screen.getByText('2 Players registered')).toBeInTheDocument();
		expect(screen.getByLabelText('Player name')).toHaveValue('');
	});

	it('shows the reason when a name is refused, and keeps what was typed', async () => {
		const user = showOrganizer();
		await register(user, 'Big Dave');

		await register(user, 'Big Dave');

		expect(getRefusalIn('Players')).toHaveTextContent(
			'There is already a Player called "Big Dave".',
		);
		expect(screen.getByLabelText('Player name')).toHaveValue('Big Dave');
		expect(listPlayerNames()).toEqual(['Big Dave']);
	});

	it('renames a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K');

		await user.click(screen.getByRole('button', { name: 'Rename' }));
		await user.clear(screen.getByLabelText('New name for Dave K'));
		await user.type(screen.getByLabelText('New name for Dave K'), 'Dave K.{Enter}');

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});

	it('removes a Player', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		const daveK = screen.getByText('Dave K.').closest('li')!;
		await user.click(within(daveK).getByRole('button', { name: 'Remove' }));

		expect(listPlayerNames()).toEqual(['Big Dave']);
		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
	});

	it('starts a new Tournament only once the Organizer confirms', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Start a new Tournament? Every Player, Board and the Draw will be cleared.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(listPlayerNames()).toEqual(['Dave K.']);

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		await answerDialog(user, 'Start a new Tournament');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(listPlayerNames()).toEqual([]);
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('numbers the Boards from 1 up to how many there are, and resumes with them', async () => {
		const user = showOrganizer();

		await setBoardCount(user, '12');

		expect(screen.getByText('Placards 1 to 12')).toBeInTheDocument();
		cleanup();
		showOrganizer();
		expect(screen.getByLabelText('Number of Boards')).toHaveValue('12');
	});

	it('shows why a number of Boards is refused, beside the Boards', async () => {
		const user = showOrganizer();

		await setBoardCount(user, '0');

		expect(getRefusalIn('Boards and the Draw')).toHaveTextContent(
			'The number of Boards is a whole number above zero, like 12.',
		);
		expect(getRefusalIn('Players')).toBeEmptyDOMElement();
	});

	it('shows why the Draw is refused', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		await register(user, 'Big Dave');

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		await answerDialog(user, 'Make the Draw');

		expect(getRefusalIn('Boards and the Draw')).toHaveTextContent(
			'The Draw seats every Player at a Board, so it needs 1 Board, and there are none.',
		);
	});

	it('makes the Draw once confirmed, closing registration and showing the Matches it seats, then Starts', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await setBoardCount(user, '2');

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards.',
		);
		await answerDialog(user, 'Cancel');
		expect(screen.getByLabelText('Player name')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		await answerDialog(user, 'Make the Draw');

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
		expect(screen.queryByLabelText('Player name')).not.toBeInTheDocument();
		// 3 Players: one first-Round Match on Board 1, and the Bye Player sits at Board 2 to wait for its winner.
		const matches = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(matches).toHaveLength(2);
		expect(matches[1]).toHaveTextContent(/^Board 2.+ vs Winner of Board 1$/);
		const waits = ['Dave K.', 'Big Dave', 'Sue'].find((name) =>
			matches[1].textContent!.includes(name),
		)!;
		for (const name of ['Dave K.', 'Big Dave', 'Sue'].filter((n) => n !== waits)) {
			expect(matches[0]).toHaveTextContent(name);
		}
		expect(matches[0]).toHaveTextContent(/^Board 1/);

		await user.click(screen.getByRole('button', { name: 'Start' }));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Now playing');
		expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Start a new Tournament' }));
		await answerDialog(user, 'Start a new Tournament');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Register Players');
		expect(listPlayerNames()).toEqual([]);
		expect(screen.getByLabelText('Number of Boards')).toHaveValue('');
		expect(screen.getByLabelText('Player name')).toHaveFocus();
	});

	it('records each Match’s winner with one tap, through to the champion', async () => {
		const user = showOrganizer();
		for (const name of ['Dave K.', 'Big Dave', 'Sue']) {
			await register(user, name);
		}
		await setBoardCount(user, '2');
		await user.click(screen.getByRole('button', { name: 'Make the Draw' }));
		await answerDialog(user, 'Make the Draw');
		// Each recorded winner re-renders the list, so it is looked up afresh after every tap.
		const listMatches = () =>
			within(screen.getByRole('list', { name: 'Matches' })).getAllByRole('listitem');
		const [first, waiting] = listMatches();
		const bye = waiting.textContent!.match(/^Board 2(.+) vs Winner of Board 1$/)![1];
		// Before Start, no winner can be recorded.
		expect(within(first).queryAllByRole('button')).toEqual([]);
		await user.click(screen.getByRole('button', { name: 'Start' }));

		// Board 2's Bye Player waits for Board 1's winner, so only Board 1 can be won yet.
		const [boardOne, boardTwo] = listMatches();
		expect(within(boardTwo).queryAllByRole('button')).toEqual([]);
		const [winner, loser] = within(boardOne)
			.getAllByRole('button')
			.map((b) => b.textContent!);
		await user.click(within(boardOne).getByRole('button', { name: winner }));

		// The winner joins the Bye Player at Board 2, and Board 1 frees.
		const matches = listMatches();
		expect(matches).toHaveLength(1);
		const [final] = matches;
		expect(final).toHaveTextContent(/^Board 2/);
		expect(final).toHaveTextContent(winner);
		expect(final).not.toHaveTextContent(loser);
		await user.click(within(final).getByRole('button', { name: bye }));

		expect(screen.queryByRole('list', { name: 'Matches' })).not.toBeInTheDocument();
		expect(screen.getByText(`Champion: ${bye}`)).toBeInTheDocument();
	});

	it('resumes the saved Tournament when reopened', async () => {
		const user = showOrganizer();
		await register(user, 'Dave K.');
		cleanup();

		showOrganizer();

		expect(listPlayerNames()).toEqual(['Dave K.']);
	});
});

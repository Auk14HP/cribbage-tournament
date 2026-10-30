// Helpers shared by the test files.
import { screen, within } from '@testing-library/react';
import type { MatchOnBoard } from './tournament';

// Whether both a Match's Players are known.
export const isReadyToPlay = (match: MatchOnBoard): boolean =>
	match.players.every((p) => 'name' in p);

// Each Match in the Waiting for a Board list, as the screen reads.
export const listWaitingText = () => {
	const list = within(screen.getByRole('list', { name: 'Waiting for a Board' }));
	return list.getAllByRole('listitem').map((item) => item.textContent);
};

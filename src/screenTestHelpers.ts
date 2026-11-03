// Helpers shared by the routes' tests.
import { screen, within } from '@testing-library/react';

// Each Match in the Waiting for a Board list, as the screen reads.
export const listWaitingText = () => {
	const list = within(screen.getByRole('list', { name: 'Waiting for a Board' }));
	return list.getAllByRole('listitem').map((item) => item.textContent);
};

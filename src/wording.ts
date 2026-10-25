// Wording shared by the organizer and display routes.
import type { Player, WinnerOf } from './tournament';

export const playersRegistered = (count: number): string =>
	`${count} ${count === 1 ? 'Player' : 'Players'} registered`;

// A Match's Player, or the winner they wait for: of the Match on a Board, or of one not yet started.
export const playerName = (player: Player | WinnerOf): string => {
	if ('name' in player) {
		return player.name;
	}
	return player.winnerOfBoard === undefined
		? 'Opponent to come'
		: `Winner of Board ${player.winnerOfBoard}`;
};

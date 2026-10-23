// Wording shared by the organizer and display routes.
import type { Player, WinnerOf } from './tournament';

export const playersRegistered = (count: number): string =>
	`${count} ${count === 1 ? 'Player' : 'Players'} registered`;

// A Match's Player, or the Match's winner they wait for.
export const playerName = (player: Player | WinnerOf): string =>
	'winnerOfBoard' in player ? `Winner of Board ${player.winnerOfBoard}` : player.name;

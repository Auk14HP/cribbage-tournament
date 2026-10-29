// Wording shared by the organizer and display routes.
import type { Opponent } from './tournament';

export const describePlayersRegistered = (count: number): string =>
	`${count} ${count === 1 ? 'Player' : 'Players'} registered`;

/*
 * A Match's Player, or who they wait for: the winner of the Match on a Board, or of one not yet started, or
 * the Bye Player a Losers Bracket place is held for.
 */
export const getPlayerName = (player: Opponent): string => {
	if ('name' in player) {
		return player.name;
	}
	if ('placeHeldFor' in player) {
		return `Place held for ${player.placeHeldFor.name}`;
	}
	return player.winnerOfBoard === undefined
		? 'Opponent to come'
		: `Winner of Board ${player.winnerOfBoard}`;
};

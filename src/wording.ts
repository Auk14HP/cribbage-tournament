// Wording shared by the organizer and display routes.
import type { BracketName, Opponent } from './tournament';

export const describePlayersRegistered = (count: number): string =>
	`${count} ${count === 1 ? 'Player' : 'Players'} registered`;

/*
 * A Match's Player, or who they wait for: the winner of a Match between two known Players, or of one not
 * yet set, or the Bye Player a Losers Bracket place is held for.
 */
export const getPlayerName = (player: Opponent): string => {
	if ('name' in player) {
		return player.name;
	}
	if ('placeHeldFor' in player) {
		return `Place held for ${player.placeHeldFor.name}`;
	}
	return player.winnerOf === undefined
		? 'Opponent to come'
		: `Winner of ${player.winnerOf[0].name} / ${player.winnerOf[1].name}`;
};

export const bracketTitles: Record<BracketName, string> = {
	winners: 'Winners Bracket',
	losers: 'Losers Bracket',
};

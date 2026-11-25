// Wording shared by the organizer and display routes.
import {
	getShownRound,
	type BracketName,
	type MatchPlace,
	type Opponent,
	type ShownRound,
	type Tournament,
} from './tournament';

// A number of Players, singular for one: "1 Player", "26 Players".
const describePlayerCount = (count: number): string =>
	`${count} ${count === 1 ? 'Player' : 'Players'}`;

export const describePlayersRegistered = (count: number): string =>
	`${describePlayerCount(count)} registered`;

export const describePlayersTonight = (count: number): string =>
	`${describePlayerCount(count)} tonight`;

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

// A Round's name, as the TV bracket heads its column: "Round 1", "Round 2", …, and "Final" for the last.
export const describeRound = ({ round, roundCount }: ShownRound): string =>
	round === roundCount ? 'Final' : `Round ${round}`;

// A number of Boards, singular for one: "1 Board", "3 Boards".
export const describeBoardCount = (count: number): string =>
	`${count} ${count === 1 ? 'Board' : 'Boards'}`;

// Names in a sentence: "Final", "Round 1 and Final", "Round 1, Round 2 and Final".
export const joinInSentence = (names: readonly string[]): string =>
	names.length <= 1
		? names.join('')
		: `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

// A Match's bracket and Round, for a list holding both brackets' Matches: "Losers Bracket · Round 1".
export const describeBracketRound = (tournament: Tournament, match: MatchPlace): string => {
	const roundName = describeRound(getShownRound(tournament, match));
	return `${bracketTitles[match.bracket]} · ${roundName}`;
};

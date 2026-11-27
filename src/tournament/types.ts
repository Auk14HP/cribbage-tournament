/*
 * The Tournament and the shapes every part of the core shares, with a blank
 * Tournament to start from.
 */

export type PlayerId = number;

export interface Player {
	readonly id: PlayerId;
	readonly name: string;
}

// The number on a Board's placard.
export type BoardNumber = number;

/*
 * Returns a number from 0 up to but not including 1, as Math.random does. Injected
 * so tests can repeat a Draw.
 */
export type Random = () => number;

/*
 * A place in the Losers Draw held for the Bye Player whose first Match is still to come: theirs if
 * they lose it and stay, a Bye for their opponent otherwise.
 */
export interface HeldPlace {
	readonly heldFor: PlayerId;
}

// Each side is who the Draw puts there: a Player, or a place held for one.
export interface FirstRoundMatch {
	readonly players: readonly [PlayerId | HeldPlace, PlayerId | HeldPlace];
}

export interface Bye {
	readonly bye: PlayerId;
}

export type BracketName = 'winners' | 'losers';

/*
 * Where a Match sits: its bracket, its Round, counted from 1, and its place down
 * that Round, counted from 0.
 */
export interface MatchPlace {
	readonly bracket: BracketName;
	readonly round: number;
	readonly place: number;
}

/*
 * A Board kept for one Player for as long as they are in the Tournament: every Match of theirs is
 * played there, and no other Match takes it.
 */
export interface HomeBoard {
	readonly player: PlayerId;
	readonly board: BoardNumber;
}

export interface MatchResult {
	readonly match: MatchPlace;
	readonly winner: PlayerId;
	readonly board: BoardNumber;
	// The loser left before finishing it.
	readonly isForfeit: boolean;
	/*
	 * Whether the loser is staying for the Losers Bracket, when they were asked:
	 * see isLosersBracketOpenTo.
	 */
	readonly loserAnswer?: StayingAnswer;
}

// A first-Match loser's answer to whether they are staying for the Losers Bracket.
export type StayingAnswer = 'staying' | 'leaving';

/*
 * A bracket's first Round, in bracket order. Each entry is a first-Round Match or a Bye, and sends
 * one Player on to Round 2, where each pair of neighbouring entries' Players meet. Every later
 * Round is worked out from it and the results recorded.
 */
export type Draw = readonly (FirstRoundMatch | Bye)[];

/*
 * A Match holding a Board: being played, or held for a Player who sits there
 * waiting for their opponent.
 */
export interface BoardTaken {
	readonly match: MatchPlace;
	readonly board: BoardNumber;
}

/*
 * registration: Players and Boards are being entered. houseRules: the Organizer announces the
 * House Rules, and the TV shows them one at a time. Going back to registration is still open.
 * drawShown: the Draw is made and the TV holds Tonight’s Draw screen until the Organizer presses
 * Start. inProgress: Matches are being played. finished: the final has a winner, and the TV
 * holds the champions screen.
 */
export type Phase = 'registration' | 'houseRules' | 'drawShown' | 'inProgress' | 'finished';

// A screen the TV cycles through once Started.
export type TvScreen = 'winnersBracket' | 'losersBracket' | 'champion';

/*
 * auto: the TV cycles the current phase's screens, each for the Tournament's
 * screenSeconds. Otherwise the Held screen: the screen the Organizer has chosen, which the
 * TV shows until they choose Auto.
 */
export type TvChoice = 'auto' | TvScreen;

// A TV Theme: Classic, the TV's plain black look, or one of the months'. Adding one: docs/tv-themes.md.
export type TvTheme = 'classic' | 'christmas';

/*
 * When Auto's current cycle started, in milliseconds since 1970 as Date.now() gives, and the screen
 * it started from. Every window works out the screen on show from it and the clock, so they agree.
 */
export interface TvCycleStart {
	readonly time: number;
	readonly screen: TvScreen;
}

export interface Tournament {
	readonly phase: Phase;
	readonly players: readonly Player[];
	readonly nextPlayerId: PlayerId;
	/*
	 * The night's date: the day the first Player registered, as YYYY-MM-DD in the laptop's
	 * time zone. Later registrations, even after midnight, don't change it. Undefined until
	 * the first Player registers.
	 */
	readonly date?: string;
	/*
	 * How many of the House Rules the TV shows on the House Rules step, from the first. Kept when
	 * the Organizer goes back to registration, so returning picks up where they left off.
	 */
	readonly shownHouseRuleCount: number;
	// In number order.
	readonly boards: readonly BoardNumber[];
	// One for each Player given a Home Board; for now no more than one Player has one.
	readonly homeBoards: readonly HomeBoard[];
	readonly winnersDraw?: Draw;
	/*
	 * Drawn with the Winners Bracket, from the same random source, so the Losers Draw needs none of
	 * its own: every Player in the order the Losers Draw takes those staying.
	 */
	readonly losersDrawOrder?: readonly PlayerId[];
	// Undefined until the Losers Draw is made; null once it found fewer than two Players staying.
	readonly losersDraw?: Draw | null;
	/*
	 * Each Match holding a Board: those at a Home Board, then the rest in the
	 * order they took their Boards.
	 */
	readonly onBoards: readonly BoardTaken[];
	// Each Match with a Player known but no Board free, in turn.
	readonly waitingForBoard: readonly MatchPlace[];
	/*
	 * Every Match's winner, in the order they were recorded, and the Board it was played at:
	 * undoing the result returns the Match there if it is still free.
	 */
	readonly results: readonly MatchResult[];
	// How long the TV shows each screen it cycles through once Started.
	readonly screenSeconds: number;
	// What the TV shows once Started: Auto, or the Held screen.
	readonly tvChoice: TvChoice;
	// Undefined until Start.
	readonly tvCycleStart?: TvCycleStart;
	/*
	 * The TV Theme the Organizer picked for tonight, over the month's. Undefined until they pick
	 * one, so a Tournament saved before TV Themes loads unchanged, in its month's.
	 */
	readonly tvTheme?: TvTheme;
}

/*
 * Bump whenever the Tournament's shape changes, so a Tournament saved in an
 * older shape loads as blank.
 */
export const tournamentVersion = 13;

export const createTournament = (): Tournament => ({
	phase: 'registration',
	players: [],
	nextPlayerId: 1,
	shownHouseRuleCount: 0,
	boards: [],
	homeBoards: [],
	onBoards: [],
	waitingForBoard: [],
	results: [],
	screenSeconds: 20,
	tvChoice: 'auto',
});

/*
 * The Tournament core: owns every rule, knows nothing about the UI or the browser.
 * A Tournament is plain, JSON-serialisable data; commands return a new Tournament or a reason for refusing.
 * How callers read it: CODING_STANDARDS.md, "The Tournament core".
 */
import type { Result } from './result';

export type PlayerId = number;

export interface Player {
	readonly id: PlayerId;
	readonly name: string;
}

// The number on a Board's placard.
export type BoardNumber = number;

// Returns a number from 0 up to but not including 1, as Math.random does. Injected so tests can repeat a Draw.
export type Random = () => number;

export interface FirstRoundMatch {
	readonly players: readonly [PlayerId, PlayerId];
}

export interface Bye {
	readonly bye: PlayerId;
}

const isBye = (entry: FirstRoundMatch | Bye): entry is Bye => 'bye' in entry;

// Where a Match sits in a bracket: its Round, counted from 1, and its place down that Round, counted from 0.
export interface MatchPlace {
	readonly round: number;
	readonly place: number;
}

export interface MatchResult {
	readonly match: MatchPlace;
	readonly winner: PlayerId;
	readonly board: BoardNumber;
	// The loser left before playing it.
	readonly isForfeit: boolean;
}

export interface WinnersBracket {
	/*
	 * The first Round, in bracket order. Each entry is a first-Round Match or a Bye, and sends one Player on
	 * to Round 2, where each pair of neighbouring entries' Players meet.
	 */
	readonly firstRound: readonly (FirstRoundMatch | Bye)[];
	/*
	 * Each Match holding a Board, in the order the Matches took their Boards: being played, or held for a
	 * Bye Player who sits there waiting for their opponent.
	 */
	readonly onBoards: readonly { readonly match: MatchPlace; readonly board: BoardNumber }[];
	/*
	 * Each Match's winner, in the order they were recorded, and the Board it was played at: undoing the
	 * result returns the Match there if it is still free.
	 */
	readonly results: readonly MatchResult[];
}

/*
 * registration: Players and Boards are being entered.
 * drawShown: the Draw is made and the TV holds Tonight’s Draw screen until the Organizer presses Start.
 * inProgress: Matches are being played.
 * finished: the final has a winner, and the TV holds the champions screen.
 */
export type Phase = 'registration' | 'drawShown' | 'inProgress' | 'finished';

export interface Tournament {
	readonly phase: Phase;
	readonly players: readonly Player[];
	readonly nextPlayerId: PlayerId;
	// In number order.
	readonly boards: readonly BoardNumber[];
	readonly winnersBracket?: WinnersBracket;
	// How long the TV shows each screen it cycles through once Started.
	readonly screenSeconds: number;
}

// Bump whenever the Tournament's shape changes, so a Tournament saved in an older shape loads as blank.
export const tournamentVersion = 6;

export const createTournament = (): Tournament => ({
	phase: 'registration',
	players: [],
	nextPlayerId: 1,
	boards: [],
	screenSeconds: 20,
});

export const registerPlayer = (tournament: Tournament, typedName: string): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return { ok: false, reason: 'Registration closed when the Draw was made.' };
	}
	const name = typedName.trim();
	const refusal = findNameRefusal(tournament, name);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const player = { id: tournament.nextPlayerId, name };
	return {
		ok: true,
		value: {
			...tournament,
			players: [...tournament.players, player],
			nextPlayerId: tournament.nextPlayerId + 1,
		},
	};
};

const noSuchPlayer: Result<Tournament> = {
	ok: false,
	reason: 'That Player is no longer registered.',
};

const playersDrawn: Result<Tournament> = {
	ok: false,
	reason: 'Players can’t be renamed or removed once the Draw is made.',
};

export const renamePlayer = (
	tournament: Tournament,
	playerId: PlayerId,
	typedName: string,
): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return playersDrawn;
	}
	if (!isRegistered(tournament, playerId)) {
		return noSuchPlayer;
	}
	const name = typedName.trim();
	const refusal = findNameRefusal(tournament, name, playerId);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	return {
		ok: true,
		value: {
			...tournament,
			players: tournament.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
		},
	};
};

export const removePlayer = (tournament: Tournament, playerId: PlayerId): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return playersDrawn;
	}
	if (!isRegistered(tournament, playerId)) {
		return noSuchPlayer;
	}
	return {
		ok: true,
		value: {
			...tournament,
			players: tournament.players.filter((p) => p.id !== playerId),
		},
	};
};

const isRegistered = (tournament: Tournament, playerId: PlayerId): boolean =>
	tournament.players.some((p) => p.id === playerId);

// Names must be unique so two Players can never be confused on the TV.
const findNameRefusal = (
	tournament: Tournament,
	name: string,
	exceptPlayerId?: PlayerId,
): string | undefined => {
	if (name === '') {
		return 'Type the Player’s name.';
	}
	if (tournament.players.some((p) => p.name === name && p.id !== exceptPlayerId)) {
		return `There is already a Player called "${name}".`;
	}
	return undefined;
};

// Boards are numbered from 1, as the placards set out on them are.
export const setBoardCount = (tournament: Tournament, typedCount: string): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return { ok: false, reason: 'The number of Boards can’t change once the Draw is made.' };
	}
	const count = parseCount(typedCount);
	if (count === 'blank') {
		return { ok: false, reason: 'Type how many Boards there are.' };
	}
	if (count === 'notCount') {
		return {
			ok: false,
			reason: 'The number of Boards is a whole number above zero, like 12.',
		};
	}
	return {
		ok: true,
		value: { ...tournament, boards: listIndexes(count).map((i) => i + 1) },
	};
};

// A typed whole number above zero, or why it isn't one: nothing typed, or something else.
const parseCount = (typed: string): number | 'blank' | 'notCount' => {
	const trimmed = typed.trim();
	if (trimmed === '') {
		return 'blank';
	}
	return /^[0-9]+$/.test(trimmed) && Number(trimmed) > 0 ? Number(trimmed) : 'notCount';
};

// Can change at any time: the TV picks it up at once, without a refresh.
export const setScreenSeconds = (
	tournament: Tournament,
	typedSeconds: string,
): Result<Tournament> => {
	const seconds = parseCount(typedSeconds);
	if (seconds === 'blank') {
		return { ok: false, reason: 'Type how many seconds the TV shows each screen.' };
	}
	if (seconds === 'notCount') {
		return {
			ok: false,
			reason: 'The TV shows each screen for a whole number of seconds above zero, like 20.',
		};
	}
	return { ok: true, value: { ...tournament, screenSeconds: seconds } };
};

export const makeDraw = (tournament: Tournament, random: Random): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return { ok: false, reason: 'The Draw has already been made.' };
	}
	const field = tournament.players.length;
	if (field < 2) {
		return { ok: false, reason: 'The Draw needs at least two Players.' };
	}
	let bracketSize = 2;
	while (bracketSize < field) {
		bracketSize *= 2;
	}
	const places = bracketSize / 2;
	const firstRoundMatches = field - places;
	const drawn = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	/*
	 * Each Bye takes a whole first-Round place, so no place is a Bye against a Bye. The first-Round Matches
	 * take neighbouring places at the top of the bracket, so Bye Players meet each other in Round 2 and
	 * play from the Start too. Only with an odd number of first-Round Matches does one Bye Player wait,
	 * for the last first-Round Match's winner. Every Round 2 Match with a Bye Player in it takes a Board
	 * at the Draw, so every Player has a seat.
	 */
	let next = 0;
	const firstRound = listIndexes(places).map((place): FirstRoundMatch | Bye =>
		place < firstRoundMatches
			? { players: [drawn[next++], drawn[next++]] }
			: { bye: drawn[next++] },
	);
	const opening: MatchPlace[] = [
		...listIndexes(firstRoundMatches).map((place) => ({ round: 1, place })),
		...listIndexes(Math.floor(places / 2))
			.filter((place) => isBye(firstRound[2 * place]) || isBye(firstRound[2 * place + 1]))
			.map((place) => ({ round: 2, place })),
	];
	const boardsRefusal = findBoardsShortRefusal(opening.length, tournament.boards.length);
	if (boardsRefusal) {
		return { ok: false, reason: boardsRefusal };
	}
	// Every Board is free at the Draw, so Matches take them lowest-numbered first, in bracket order.
	const onBoards = opening.map((match, i) => ({ match, board: tournament.boards[i] }));
	return {
		ok: true,
		value: {
			...tournament,
			phase: 'drawShown',
			winnersBracket: { firstRound, onBoards, results: [] },
		},
	};
};

export const start = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase === 'registration') {
		return { ok: false, reason: 'Make the Draw before starting.' };
	}
	if (tournament.phase !== 'drawShown') {
		return { ok: false, reason: 'The Tournament has already started.' };
	}
	return { ok: true, value: { ...tournament, phase: 'inProgress' } };
};

// Every Match the Draw seats needs a Board at the Draw: there is no waiting for one yet.
const findBoardsShortRefusal = (matches: number, boards: number): string | undefined => {
	if (boards >= matches) {
		return undefined;
	}
	const set =
		boards === 0 ? 'there are none' : `there ${boards === 1 ? 'is' : 'are'} only ${boards}`;
	return `The Draw seats every Player at a Board, so it needs ${matches} ${matches === 1 ? 'Board' : 'Boards'}, and ${set}.`;
};

/*
 * Records a Match's winner, who advances to the next Round. The Match's Board frees. The winner goes to
 * their next Match's Board, where their opponent already waits; or, if it has none yet, the next Match
 * takes the lowest-numbered free Board and the winner waits there for their opponent. That is often the
 * Board they just won at.
 */
export const recordWinner = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
): Result<Tournament> => {
	const refusal = findResultRefusal(tournament, match, winner);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	return { ok: true, value: settleMatch(tournament, match, winner, false) };
};

// Records a Forfeit: the Player leaves before playing the Match, and their opponent wins it.
export const recordForfeit = (
	tournament: Tournament,
	match: MatchPlace,
	leaver: PlayerId,
): Result<Tournament> => {
	const refusal = findResultRefusal(tournament, match, leaver);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const opponent = findOpponent(tournament.winnersBracket!, match, leaver);
	return { ok: true, value: settleMatch(tournament, match, opponent, true) };
};

// Why a result can't be recorded for that Player in that Match, or undefined if it can.
const findResultRefusal = (
	tournament: Tournament,
	match: MatchPlace,
	player: PlayerId,
): string | undefined => {
	if (tournament.phase === 'finished') {
		return 'The Tournament is finished.';
	}
	if (tournament.phase !== 'inProgress') {
		return 'Press Start before recording a winner.';
	}
	const bracket = tournament.winnersBracket!;
	if (findWinner(bracket, match) !== undefined) {
		return 'That Match already has a winner.';
	}
	const players = findPlayers(bracket, match);
	if (players.some((p) => typeof p !== 'number')) {
		return 'That Match is still waiting for a Player.';
	}
	if (!players.includes(player)) {
		return 'That Player isn’t in that Match.';
	}
	return undefined;
};

// Records the winner of a Match whose result can be recorded, moving them on to their next Match.
const settleMatch = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
	isForfeit: boolean,
): Tournament => {
	const bracket = tournament.winnersBracket!;
	const board = findBoard(bracket, match)!;
	let next: WinnersBracket = {
		...bracket,
		onBoards: bracket.onBoards.filter((on) => !isSameMatch(on.match, match)),
		results: [...bracket.results, { match, winner, board, isForfeit }],
	};
	const following = findFollowing(bracket, match);
	// The final's winner is the champion, and finishes the Tournament.
	if (!following) {
		return { ...tournament, phase: 'finished', winnersBracket: next };
	}
	if (findBoard(next, following) === undefined) {
		/*
		 * There is always a free Board: each winner recorded frees a Board and takes at most one, so
		 * no more Boards are ever in use than the Draw needed.
		 */
		const free = findFreeBoard(tournament, next)!;
		next = { ...next, onBoards: [...next.onBoards, { match: following, board: free }] };
	}
	return { ...tournament, winnersBracket: next };
};

/*
 * Undoes a Match's recorded result, so it can be played again or its winner corrected. The winner leaves
 * their next Match, which frees its Board unless their opponent already waits there, and the Match takes a
 * Board again.
 */
export const undoResult = (tournament: Tournament, match: MatchPlace): Result<Tournament> => {
	const bracket = tournament.winnersBracket;
	const result = bracket?.results.find((r) => isSameMatch(r.match, match));
	if (!bracket || !result) {
		return { ok: false, reason: 'That Match has no result to undo.' };
	}
	if (hasPlayedOn(bracket, match)) {
		return {
			ok: false,
			reason: 'That result can’t be undone: its winner has already played their next Match.',
		};
	}
	let next: WinnersBracket = {
		...bracket,
		results: bracket.results.filter((r) => !isSameMatch(r.match, match)),
	};
	const following = findFollowing(bracket, match);
	if (following && findPlayers(next, following).every((p) => typeof p !== 'number')) {
		next = {
			...next,
			onBoards: next.onBoards.filter((on) => !isSameMatch(on.match, following)),
		};
	}
	/*
	 * There is always a free Board: the Matches now hold Boards as if the result had never been recorded,
	 * and recording winners never needs more Boards than the Draw did.
	 */
	const isOwnBoardFree = !next.onBoards.some((on) => on.board === result.board);
	const board = isOwnBoardFree ? result.board : findFreeBoard(tournament, next)!;
	next = { ...next, onBoards: [...next.onBoards, { match, board }] };
	// Undoing the final takes the champion back out, so the Tournament is in progress again.
	return { ok: true, value: { ...tournament, phase: 'inProgress', winnersBracket: next } };
};

// Whether a Match's winner has played their next Match, so its result can no longer be undone.
const hasPlayedOn = (bracket: WinnersBracket, match: MatchPlace): boolean => {
	const following = findFollowing(bracket, match);
	return following !== undefined && findWinner(bracket, following) !== undefined;
};

// The Match a Match's winner goes on to, or undefined for the final.
const findFollowing = (bracket: WinnersBracket, match: MatchPlace): MatchPlace | undefined =>
	match.round === countRounds(bracket)
		? undefined
		: { round: match.round + 1, place: Math.floor(match.place / 2) };

// The lowest-numbered Board no Match holds, or undefined if every Board is taken.
const findFreeBoard = (tournament: Tournament, bracket: WinnersBracket): BoardNumber | undefined =>
	tournament.boards.find((b) => !bracket.onBoards.some((on) => on.board === b));

const isSameMatch = (a: MatchPlace, b: MatchPlace): boolean =>
	a.round === b.round && a.place === b.place;

// The bracket holds twice as many Players as its first Round has places, halving each Round to the final.
const countRounds = (bracket: WinnersBracket): number => Math.log2(2 * bracket.firstRound.length);

const findBoard = (bracket: WinnersBracket, match: MatchPlace): BoardNumber | undefined =>
	bracket.onBoards.find((on) => isSameMatch(on.match, match))?.board;

const findWinner = (bracket: WinnersBracket, match: MatchPlace): PlayerId | undefined =>
	bracket.results.find((r) => isSameMatch(r.match, match))?.winner;

/*
 * A Match's two Players, each known or still to come from the earlier Match that sends them. A Bye Player
 * comes into Round 2 straight from the first Round.
 */
const findPlayers = (
	bracket: WinnersBracket,
	{ round, place }: MatchPlace,
): readonly [PlayerId | MatchPlace, PlayerId | MatchPlace] => {
	if (round === 1) {
		return (bracket.firstRound[place] as FirstRoundMatch).players;
	}
	const findPlayerFrom = (side: number): PlayerId | MatchPlace => {
		const earlier = { round: round - 1, place: 2 * place + side };
		const entry = bracket.firstRound[earlier.place];
		if (round === 2 && isBye(entry)) {
			return entry.bye;
		}
		return findWinner(bracket, earlier) ?? earlier;
	};
	return [findPlayerFrom(0), findPlayerFrom(1)];
};

// The other Player in a Match whose two Players are known.
const findOpponent = (bracket: WinnersBracket, match: MatchPlace, player: PlayerId): PlayerId => {
	const players = findPlayers(bracket, match) as readonly PlayerId[];
	return players.find((p) => p !== player)!;
};

// A Player still to come: the winner of the Match on that Board, or of a Match not yet started.
export interface WinnerOf {
	readonly winnerOfBoard?: BoardNumber;
}

export interface MatchOnBoard {
	readonly board: BoardNumber;
	readonly match: MatchPlace;
	// The second may still be to come, while the first sits at the Board waiting.
	readonly players: readonly [Player, Player | WinnerOf];
}

/*
 * Every Match holding a Board, in Board order, so each Player can find their seat: on Tonight’s Draw
 * screen, and as the Matches being played once Started. None before the Draw.
 */
export const getMatchesOnBoards = (tournament: Tournament): readonly MatchOnBoard[] => {
	const bracket = tournament.winnersBracket;
	if (!bracket) {
		return [];
	}
	const findSeated = (from: PlayerId | MatchPlace): Player | WinnerOf =>
		typeof from === 'number'
			? findPlayer(tournament, from)
			: { winnerOfBoard: findBoard(bracket, from) };
	// A Match holds a Board once one of its Players is known, who is named first while they wait.
	return bracket.onBoards
		.map(({ match, board }): MatchOnBoard => {
			const [a, b] = findPlayers(bracket, match).map(findSeated);
			return { board, match, players: 'name' in a ? [a, b] : [b as Player, a] };
		})
		.sort((a, b) => a.board - b.board);
};

export interface MatchBeingPlayed {
	readonly board: BoardNumber;
	readonly players: readonly [Player, Player];
}

/*
 * Every Match being played, in Board order: both its Players are known and sit at its Board. A Player
 * waiting for their opponent is not playing yet. None before Start.
 */
export const getNowPlaying = (tournament: Tournament): readonly MatchBeingPlayed[] => {
	if (tournament.phase !== 'inProgress') {
		return [];
	}
	return getMatchesOnBoards(tournament).flatMap(({ board, players: [a, b] }) =>
		'name' in b ? [{ board, players: [a, b] as const }] : [],
	);
};

const findPlayer = (tournament: Tournament, id: PlayerId): Player =>
	tournament.players.find((p) => p.id === id)!;

// A Match in the Winners Bracket picture.
export interface BracketMatch {
	// Undefined while that Player is still to come.
	readonly players: readonly [Player | undefined, Player | undefined];
	// While the Match is being played, or held for a Bye Player waiting there.
	readonly board?: BoardNumber;
	readonly winner?: Player;
}

export interface WinnersBracketPicture {
	/*
	 * Each Round's Matches, in bracket order, from the first Round to the final. A Bye's place in the first
	 * Round is undefined: its Player is in Round 2.
	 */
	readonly rounds: readonly (readonly (BracketMatch | undefined)[])[];
	// The final's winner, once it is recorded.
	readonly champion?: Player;
}

// The whole Winners Bracket as it stands: who has advanced, who is still playing. Undefined before the Draw.
export const getWinnersBracketPicture = (
	tournament: Tournament,
): WinnersBracketPicture | undefined => {
	const bracket = tournament.winnersBracket;
	if (!bracket) {
		return undefined;
	}
	const findKnown = (from: PlayerId | MatchPlace): Player | undefined =>
		typeof from === 'number' ? findPlayer(tournament, from) : undefined;
	const pictureMatch = (match: MatchPlace): BracketMatch => {
		const [a, b] = findPlayers(bracket, match);
		const winner = findWinner(bracket, match);
		return {
			players: [findKnown(a), findKnown(b)],
			board: findBoard(bracket, match),
			winner: winner === undefined ? undefined : findPlayer(tournament, winner),
		};
	};
	const rounds = listIndexes(countRounds(bracket)).map((r) =>
		listIndexes(bracket.firstRound.length / 2 ** r).map((place) =>
			r === 0 && isBye(bracket.firstRound[place])
				? undefined
				: pictureMatch({ round: r + 1, place }),
		),
	);
	return { rounds, champion: rounds.at(-1)![0]!.winner };
};

/*
 * Whether a Player has lost a Match in the Winners Bracket, and so left it. A Bye is not a loss, and a
 * Player who has lost may still be playing in the Losers Bracket.
 */
export const hasLostInWinnersBracket = (tournament: Tournament, player: PlayerId): boolean => {
	const bracket = tournament.winnersBracket;
	if (!bracket) {
		return false;
	}
	return bracket.results.some(
		(r) => findPlayers(bracket, r.match).includes(player) && r.winner !== player,
	);
};

export interface RecordedResult {
	readonly match: MatchPlace;
	// Where it was played.
	readonly board: BoardNumber;
	readonly winner: Player;
	readonly loser: Player;
	readonly isForfeit: boolean;
}

/*
 * The results the Organizer can still undo, latest first: each one whose winner hasn't yet played their
 * next Match.
 */
export const getUndoableResults = (tournament: Tournament): readonly RecordedResult[] => {
	const bracket = tournament.winnersBracket;
	if (!bracket) {
		return [];
	}
	return bracket.results
		.filter((r) => !hasPlayedOn(bracket, r.match))
		.map(({ match, board, winner, isForfeit }) => {
			const loser = findOpponent(bracket, match, winner);
			return {
				match,
				board,
				winner: findPlayer(tournament, winner),
				loser: findPlayer(tournament, loser),
				isForfeit,
			};
		})
		.reverse();
};

const listIndexes = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

// Fisher–Yates: every order equally likely.
const shuffle = <T>(items: readonly T[], random: Random): T[] => {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

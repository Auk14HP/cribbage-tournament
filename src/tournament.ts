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

/*
 * A place in the Losers Draw held for the Bye Player whose first Match is still to come: theirs if they
 * lose it and stay, a Bye for their opponent otherwise.
 */
export interface HeldPlace {
	readonly heldFor: PlayerId;
}

// Who the Draw puts in a first-Round Match: a Player, or a place held for one.
type Entrant = PlayerId | HeldPlace;

export interface FirstRoundMatch {
	readonly players: readonly [Entrant, Entrant];
}

export interface Bye {
	readonly bye: PlayerId;
}

const isBye = (entry: FirstRoundMatch | Bye): entry is Bye => 'bye' in entry;

export type BracketName = 'winners' | 'losers';

// Where a Match sits: its bracket, its Round, counted from 1, and its place down that Round, counted from 0.
export interface MatchPlace {
	readonly bracket: BracketName;
	readonly round: number;
	readonly place: number;
}

export interface MatchResult {
	readonly match: MatchPlace;
	readonly winner: PlayerId;
	readonly board: BoardNumber;
	// The loser left before finishing it.
	readonly isForfeit: boolean;
	// Whether the loser is staying for the Losers Bracket, when they were asked: see isLosersBracketOpenTo.
	readonly loserAnswer?: StayingAnswer;
}

// A first-Match loser's answer to whether they are staying for the Losers Bracket.
export type StayingAnswer = 'staying' | 'leaving';

export interface Bracket {
	/*
	 * The first Round, in bracket order. Each entry is a first-Round Match or a Bye, and sends one Player on
	 * to Round 2, where each pair of neighbouring entries' Players meet.
	 */
	readonly firstRound: readonly (FirstRoundMatch | Bye)[];
}

// A Match holding a Board: being played, or held for a Player who sits there waiting for their opponent.
export interface BoardTaken {
	readonly match: MatchPlace;
	readonly board: BoardNumber;
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
	readonly winnersBracket?: Bracket;
	/*
	 * Drawn with the Winners Bracket, from the same random source, so the Losers Draw needs none of its
	 * own: every Player in the order the Losers Draw takes those staying.
	 */
	readonly losersDrawOrder?: readonly PlayerId[];
	// Undefined until the Losers Draw is made; null once it found fewer than two Players staying.
	readonly losersBracket?: Bracket | null;
	// Each Match holding a Board, in the order the Matches took their Boards.
	readonly onBoards: readonly BoardTaken[];
	// Each Match with a Player known but no Board free, in turn.
	readonly waitingForBoard: readonly MatchPlace[];
	/*
	 * Every Match's winner, in the order they were recorded, and the Board it was played at: undoing the
	 * result returns the Match there if it is still free.
	 */
	readonly results: readonly MatchResult[];
	// How long the TV shows each screen it cycles through once Started.
	readonly screenSeconds: number;
}

// Bump whenever the Tournament's shape changes, so a Tournament saved in an older shape loads as blank.
export const tournamentVersion = 7;

export const createTournament = (): Tournament => ({
	phase: 'registration',
	players: [],
	nextPlayerId: 1,
	boards: [],
	onBoards: [],
	waitingForBoard: [],
	results: [],
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
	if (tournament.players.length < 2) {
		return { ok: false, reason: 'The Draw needs at least two Players.' };
	}
	if (tournament.boards.length === 0) {
		return { ok: false, reason: 'The Draw needs at least one Board.' };
	}
	const drawn = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const winnersBracket = arrangeBracket(drawn);
	const losersDrawOrder = shuffle(
		tournament.players.map((p) => p.id),
		random,
	);
	const drawnTournament: Tournament = {
		...tournament,
		phase: 'drawShown',
		winnersBracket,
		losersDrawOrder,
	};
	// Every Board is free at the Draw, so Matches take them lowest-numbered first; the rest wait for one.
	return { ok: true, value: reseat(drawnTournament) };
};

/*
 * Arranges drawn Players into a bracket. Its size is the next power of two at or above the field, and Byes
 * fill the gap. Each Bye takes a whole first-Round place, so no place is a Bye against a Bye. The
 * first-Round Matches take neighbouring places at the top of the bracket, so Bye Players meet each other in
 * Round 2 and play from the Start too. Only with an odd number of first-Round Matches does one Bye Player
 * wait, for the last first-Round Match's winner.
 */
const arrangeBracket = (drawn: readonly Entrant[]): Bracket => {
	let bracketSize = 2;
	while (bracketSize < drawn.length) {
		bracketSize *= 2;
	}
	const places = bracketSize / 2;
	const firstRoundMatches = drawn.length - places;
	let next = 0;
	const firstRound = listIndexes(places).map((place): FirstRoundMatch | Bye =>
		place < firstRoundMatches
			? { players: [drawn[next++], drawn[next++]] }
			: // A Held Place is drawn first, so it is always in a Match.
				{ bye: drawn[next++] as PlayerId },
	);
	return { firstRound };
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

/*
 * Records a Match's winner, who advances to the next Round. The Match's Board frees. The winner goes to
 * their next Match's Board, where their opponent already waits; or, if it has none yet, the next Match
 * takes the lowest-numbered free Board and the winner waits there for their opponent. That is often the
 * Board they just won at. A loser the Losers Bracket is open to must say whether they are staying for it.
 */
export const recordWinner = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
	loserAnswer?: StayingAnswer,
): Result<Tournament> => {
	const refusal = findResultRefusal(tournament, match, winner);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const loser = findOpponent(tournament, match, winner);
	const answerRefusal = findAnswerRefusal(tournament, loser, loserAnswer);
	if (answerRefusal) {
		return { ok: false, reason: answerRefusal };
	}
	return { ok: true, value: settleMatch(tournament, match, winner, false, loserAnswer) };
};

/*
 * Records a Forfeit: the Player leaves before finishing the Match, and their opponent wins it. The Losers
 * Bracket is open to them as to any loser.
 */
export const recordForfeit = (
	tournament: Tournament,
	match: MatchPlace,
	leaver: PlayerId,
	leaverAnswer?: StayingAnswer,
): Result<Tournament> => {
	const refusal =
		findResultRefusal(tournament, match, leaver) ??
		findAnswerRefusal(tournament, leaver, leaverAnswer);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const opponent = findOpponent(tournament, match, leaver);
	return { ok: true, value: settleMatch(tournament, match, opponent, true, leaverAnswer) };
};

// A loser the Losers Bracket is open to must say whether they are staying for it.
const findAnswerRefusal = (
	tournament: Tournament,
	loser: PlayerId,
	answer: StayingAnswer | undefined,
): string | undefined =>
	answer === undefined && isLosersBracketOpenTo(tournament, loser)
		? `Say whether ${findPlayer(tournament, loser).name} is staying for the Losers Bracket.`
		: undefined;

/*
 * Whether a Player who loses their Match now is asked if they are staying for the Losers Bracket: it is
 * their first Match, and the Losers Draw is still to come or holds a place for them. A Bye is not a Match,
 * so a Bye Player's first Match is in Round 2.
 */
export const isLosersBracketOpenTo = (tournament: Tournament, player: PlayerId): boolean => {
	// A Player who has played no Winners Bracket Match has played none.
	if (listResultsOf(tournament, 'winners', player).length > 0) {
		return false;
	}
	const { losersBracket } = tournament;
	if (losersBracket === undefined) {
		return true;
	}
	return (
		losersBracket !== null &&
		losersBracket.firstRound.some(
			(entry) => !isBye(entry) && entry.players.some((e) => isHeldFor(e, player)),
		)
	);
};

const isHeldFor = (entrant: Entrant, player: PlayerId): boolean =>
	typeof entrant !== 'number' && entrant.heldFor === player;

/*
 * A first-Round entry as it stands. A Held Place is settled once its Player's first Match has a result:
 * to them if they lost it and stayed, and otherwise their opponent has a Bye.
 */
const findSettledEntry = (tournament: Tournament, match: MatchPlace): FirstRoundMatch | Bye => {
	const entry = getBracket(tournament, match.bracket)!.firstRound[match.place];
	if (isBye(entry)) {
		return entry;
	}
	const [a, b] = entry.players.map((e) => settleEntrant(tournament, e));
	if (a === 'bye' || b === 'bye') {
		return { bye: (a === 'bye' ? b : a) as PlayerId };
	}
	return { players: [a, b] };
};

// A Held Place's Player, a Bye if they aren't coming, or the place still held.
const settleEntrant = (tournament: Tournament, entrant: Entrant): Entrant | 'bye' => {
	if (typeof entrant === 'number') {
		return entrant;
	}
	const [firstMatch] = listResultsOf(tournament, 'winners', entrant.heldFor);
	if (!firstMatch) {
		return entrant;
	}
	const isStaying = firstMatch.winner !== entrant.heldFor && firstMatch.loserAnswer === 'staying';
	return isStaying ? entrant.heldFor : 'bye';
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
	if (findWinner(tournament, match) !== undefined) {
		return 'That Match already has a winner.';
	}
	const players = findPlayers(tournament, match);
	if (players.some((p) => typeof p !== 'number')) {
		return 'That Match is still waiting for a Player.';
	}
	if (!players.includes(player)) {
		return 'That Player isn’t in that Match.';
	}
	if (findBoard(tournament, match) === undefined) {
		const [a, b] = players.map((p) => findPlayer(tournament, p as PlayerId).name);
		return `${a} and ${b} are still waiting for a Board.`;
	}
	return undefined;
};

// Records the winner of a Match whose result can be recorded, moving them on to their next Match.
const settleMatch = (
	tournament: Tournament,
	match: MatchPlace,
	winner: PlayerId,
	isForfeit: boolean,
	loserAnswer: StayingAnswer | undefined,
): Tournament => {
	const board = findBoard(tournament, match)!;
	const loser = findOpponent(tournament, match, winner);
	// Kept only from a loser who was asked.
	const asked = isLosersBracketOpenTo(tournament, loser) ? { loserAnswer } : {};
	const recorded = drawLosersBracketIfDue({
		...tournament,
		results: [...tournament.results, { match, winner, board, isForfeit, ...asked }],
	});
	const settled = reseat(recorded);
	return isFinished(settled) ? { ...settled, phase: 'finished' } : settled;
};

/*
 * Makes the Losers Draw once every Match the Winners Draw started has a result, from the Players staying
 * for it: with fewer than two there is no Losers Bracket. It has its own random Byes, by the same rules.
 * The Bye Player whose first Match is still to come gets a place held open, in a first-Round Match, at the
 * top of the bracket. With one Player staying, the Draw waits for that Match: there may yet be two.
 */
const drawLosersBracketIfDue = (tournament: Tournament): Tournament => {
	if (tournament.losersBracket !== undefined) {
		return tournament;
	}
	const started = listStartedMatches(tournament);
	if (started.some((match) => findWinner(tournament, match) === undefined)) {
		return tournament;
	}
	const staying = tournament.losersDrawOrder!.filter((player) =>
		tournament.results.some(
			(r) =>
				r.loserAnswer === 'staying' &&
				findOpponent(tournament, r.match, r.winner) === player,
		),
	);
	const held = findByePlayerStillToPlay(tournament);
	const mayStay = staying.length + (held === undefined ? 0 : 1);
	if (mayStay < 2) {
		return { ...tournament, losersBracket: null };
	}
	if (staying.length < 2) {
		return tournament;
	}
	const entrants = held === undefined ? staying : [{ heldFor: held }, ...staying];
	return { ...tournament, losersBracket: arrangeBracket(entrants) };
};

/*
 * The Bye Player waiting for a first-Round Match's winner, while their own first Match has no result:
 * only with an odd number of first-Round Matches.
 */
const findByePlayerStillToPlay = (tournament: Tournament): PlayerId | undefined => {
	const { firstRound } = tournament.winnersBracket!;
	const place = listIndexes(Math.floor(firstRound.length / 2)).find(
		(p) => isBye(firstRound[2 * p]) !== isBye(firstRound[2 * p + 1]),
	);
	if (place === undefined) {
		return undefined;
	}
	const match: MatchPlace = { bracket: 'winners', round: 2, place };
	if (findWinner(tournament, match) !== undefined) {
		return undefined;
	}
	return (firstRound[2 * place + 1] as Bye).bye;
};

/*
 * The Matches the Winners Draw started: every first-Round Match, and every Round 2 Match between two Bye
 * Players.
 */
const listStartedMatches = (tournament: Tournament): MatchPlace[] => {
	const { firstRound } = tournament.winnersBracket!;
	return [
		...listIndexes(firstRound.length)
			.filter((place) => !isBye(firstRound[place]))
			.map((place): MatchPlace => ({ bracket: 'winners', round: 1, place })),
		...listIndexes(Math.floor(firstRound.length / 2))
			.filter((place) => isBye(firstRound[2 * place]) && isBye(firstRound[2 * place + 1]))
			.map((place): MatchPlace => ({ bracket: 'winners', round: 2, place })),
	];
};

// The Tournament is finished once every bracket played has a champion.
const isFinished = (tournament: Tournament): boolean => {
	const hasChampion = (bracket: BracketName) => {
		const rounds = countRounds(getBracket(tournament, bracket)!);
		return findWinner(tournament, { bracket, round: rounds, place: 0 }) !== undefined;
	};
	if (!hasChampion('winners')) {
		return false;
	}
	return tournament.losersBracket === null || hasChampion('losers');
};

// A bracket once drawn, or undefined: the Losers Bracket before its Draw, or with none played.
const getBracket = (tournament: Tournament, bracket: BracketName): Bracket | undefined =>
	bracket === 'winners' ? tournament.winnersBracket : (tournament.losersBracket ?? undefined);

/*
 * Undoes a Match's recorded result, so it can be played again or its winner corrected. The winner leaves
 * their next Match, which frees its Board unless their opponent already waits there, and the Match takes a
 * Board again: its own if it is still free. Undoing a first Match when no Losers Bracket was drawn leaves
 * the Losers Draw to be made again, once that Match has a result.
 */
export const undoResult = (tournament: Tournament, match: MatchPlace): Result<Tournament> => {
	const result = tournament.results.find((r) => isSameMatch(r.match, match));
	if (!result) {
		return { ok: false, reason: 'That Match has no result to undo.' };
	}
	const refusal = findUndoRefusal(tournament, match);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const isLosersDrawUndone = isFirstMatch(tournament, match) && tournament.losersBracket === null;
	const undone: Tournament = {
		...tournament,
		results: tournament.results.filter((r) => !isSameMatch(r.match, match)),
		losersBracket: isLosersDrawUndone ? undefined : tournament.losersBracket,
	};
	// Undoing the final takes the champion back out, so the Tournament is in progress again.
	return {
		ok: true,
		value: { ...reseat(undone, { match, board: result.board }), phase: 'inProgress' },
	};
};

/*
 * Why a Match's result can't be undone, or undefined if it can: its winner has played their next Match,
 * or it decided who could stay for a Losers Bracket now drawn.
 */
const findUndoRefusal = (tournament: Tournament, match: MatchPlace): string | undefined => {
	if (hasPlayedOn(tournament, match)) {
		return 'That result can’t be undone: its winner has already played their next Match.';
	}
	if (isFirstMatch(tournament, match) && tournament.losersBracket) {
		return 'That result can’t be undone: the Losers Bracket has been drawn.';
	}
	return undefined;
};

// Whether a Winners Bracket Match is the first Match either of its Players played.
const isFirstMatch = (tournament: Tournament, match: MatchPlace): boolean =>
	match.bracket === 'winners' &&
	// A Match with a result has both its Players known.
	(findPlayers(tournament, match) as readonly PlayerId[]).some(
		(player) =>
			!listResultsOf(tournament, 'winners', player).some((r) => r.match.round < match.round),
	);

// Whether a Match's winner has played their next Match, so its result can no longer be undone.
const hasPlayedOn = (tournament: Tournament, match: MatchPlace): boolean => {
	const following = findFollowing(tournament, match);
	return following !== undefined && findWinner(tournament, following) !== undefined;
};

/*
 * Brings the Boards in line with the Matches: each Match with a Player known and no winner yet holds a
 * Board, or waits for one. A Match that no longer needs one gives it up. A Match newly needing one joins
 * the end of the queue, in bracket order, and each free Board goes to the first, lowest-numbered first.
 * When there are too few free Boards for the queue, Matches ready to play, both Players known, go ahead of
 * those still waiting on a Player, and a Player waiting alone at a Board gives it up to one, latest seated
 * first, so a Board never sits idle while two Players are ready. A Match being re-opened may ask for its own
 * Board back, and gets it if it is free.
 */
const reseat = (tournament: Tournament, returning?: BoardTaken): Tournament => {
	const live = listLiveMatches(tournament);
	const isLive = (match: MatchPlace) => live.some((m) => isSameMatch(m, match));
	const onBoards = tournament.onBoards.filter((on) => isLive(on.match));
	const isFree = (board: BoardNumber) => !onBoards.some((on) => on.board === board);
	if (returning && isFree(returning.board)) {
		onBoards.push(returning);
	}
	const isSeated = (match: MatchPlace) => onBoards.some((on) => isSameMatch(on.match, match));
	const isAlreadyWaiting = (match: MatchPlace) =>
		tournament.waitingForBoard.some((m) => isSameMatch(m, match));
	const inTurn = [
		...tournament.waitingForBoard.filter((match) => isLive(match) && !isSeated(match)),
		...live.filter((match) => !isSeated(match) && !isAlreadyWaiting(match)),
	];
	const isReady = (match: MatchPlace) => isReadyToPlay(tournament, match);
	const readyWithoutBoard =
		inTurn.filter(isReady).length - tournament.boards.filter(isFree).length;
	const seatedAlone = onBoards.filter((on) => !isReady(on.match));
	const givingUp = seatedAlone.slice(Math.max(0, seatedAlone.length - readyWithoutBoard));
	const keepingBoards = onBoards.filter((on) => !givingUp.includes(on));
	const freeBoards = tournament.boards.filter(
		(board) => !keepingBoards.some((on) => on.board === board),
	);
	const needing = [...inTurn, ...givingUp.map((on) => on.match)];
	const queue =
		needing.length <= freeBoards.length ? needing : orderReadyFirst(tournament, needing);
	const seated = queue
		.slice(0, freeBoards.length)
		.map((match, index) => ({ match, board: freeBoards[index] }));
	return {
		...tournament,
		onBoards: [...keepingBoards, ...seated],
		waitingForBoard: queue.slice(freeBoards.length),
	};
};

// Matches ready to play first, both Players known, then those still waiting on a Player, each in turn.
const orderReadyFirst = (tournament: Tournament, matches: readonly MatchPlace[]): MatchPlace[] => {
	const ready = matches.filter((match) => isReadyToPlay(tournament, match));
	return [...ready, ...matches.filter((match) => !ready.includes(match))];
};

/*
 * Every Match with a Player known and no winner yet, in bracket order: the Winners Bracket, then the Losers
 * Bracket, each from the first Round on and down each Round.
 */
const listLiveMatches = (tournament: Tournament): MatchPlace[] =>
	(['winners', 'losers'] as const).flatMap((name) => {
		const bracket = getBracket(tournament, name);
		if (!bracket) {
			return [];
		}
		return listIndexes(countRounds(bracket)).flatMap((r) =>
			listIndexes(bracket.firstRound.length / 2 ** r)
				.map((place): MatchPlace => ({ bracket: name, round: r + 1, place }))
				.filter(
					(match) =>
						!(match.round === 1 && isBye(findSettledEntry(tournament, match))) &&
						findWinner(tournament, match) === undefined &&
						findPlayers(tournament, match).some((p) => typeof p === 'number'),
				),
		);
	});

// The Match a Match's winner goes on to, or undefined for the final.
const findFollowing = (tournament: Tournament, match: MatchPlace): MatchPlace | undefined =>
	match.round === countRounds(getBracket(tournament, match.bracket)!)
		? undefined
		: { bracket: match.bracket, round: match.round + 1, place: Math.floor(match.place / 2) };

const isSameMatch = (a: MatchPlace, b: MatchPlace): boolean =>
	a.bracket === b.bracket && a.round === b.round && a.place === b.place;

// Tells a Match from every other, in either bracket: Rounds and places repeat between the two.
export const getMatchKey = ({ bracket, round, place }: MatchPlace): string =>
	`${bracket} ${round} ${place}`;

// The bracket holds twice as many Players as its first Round has places, halving each Round to the final.
const countRounds = (bracket: Bracket): number => Math.log2(2 * bracket.firstRound.length);

const findBoard = (tournament: Tournament, match: MatchPlace): BoardNumber | undefined =>
	tournament.onBoards.find((on) => isSameMatch(on.match, match))?.board;

const findWinner = (tournament: Tournament, match: MatchPlace): PlayerId | undefined =>
	tournament.results.find((r) => isSameMatch(r.match, match))?.winner;

/*
 * A Match's two Players, each known or still to come from the earlier Match that sends them. A Bye Player
 * comes into Round 2 straight from the first Round.
 */
const findPlayers = (tournament: Tournament, match: MatchPlace): readonly [Seat, Seat] => {
	const { bracket, round, place } = match;
	if (round === 1) {
		return (findSettledEntry(tournament, match) as FirstRoundMatch).players;
	}
	const findPlayerFrom = (side: number): Seat => {
		const earlier = { bracket, round: round - 1, place: 2 * place + side };
		if (round === 2) {
			const entry = findSettledEntry(tournament, earlier);
			if (isBye(entry)) {
				return entry.bye;
			}
		}
		return findWinner(tournament, earlier) ?? earlier;
	};
	return [findPlayerFrom(0), findPlayerFrom(1)];
};

// A Match's two Players once both are known, ready to play, or undefined while one is still to come.
const findBothPlayers = (
	tournament: Tournament,
	match: MatchPlace,
): readonly [PlayerId, PlayerId] | undefined => {
	const players = findPlayers(tournament, match);
	return players.every((p) => typeof p === 'number')
		? (players as readonly [PlayerId, PlayerId])
		: undefined;
};

const isReadyToPlay = (tournament: Tournament, match: MatchPlace): boolean =>
	findBothPlayers(tournament, match) !== undefined;

// One side of a Match: a Player known, the earlier Match that sends them, or a place held for them.
type Seat = PlayerId | MatchPlace | HeldPlace;

// The other Player in a Match whose two Players are known.
const findOpponent = (tournament: Tournament, match: MatchPlace, player: PlayerId): PlayerId => {
	const players = findPlayers(tournament, match) as readonly PlayerId[];
	return players.find((p) => p !== player)!;
};

// A Player still to come: the winner of a Match between those two Players, or of one not yet set.
export interface WinnerOf {
	readonly winnerOf?: readonly [Player, Player];
}

// A Player who may yet come: the Bye Player a Losers Bracket place is held for.
export interface PlaceHeld {
	readonly placeHeldFor: Player;
}

// A Match's second Player as they are seated: known, or still to come.
export type Opponent = Player | WinnerOf | PlaceHeld;

export interface MatchOnBoard {
	readonly board: BoardNumber;
	readonly match: MatchPlace;
	// The second may still be to come, while the first sits at the Board waiting.
	readonly players: readonly [Player, Opponent];
}

/*
 * Every Match holding a Board, in Board order, so each Player can find their seat: on Tonight’s Draw
 * screen, and as the Matches being played once Started. None before the Draw.
 */
export const getMatchesOnBoards = (tournament: Tournament): readonly MatchOnBoard[] =>
	tournament.onBoards
		.map(({ match, board }) => ({
			board,
			match,
			players: findSeatedPlayers(tournament, match),
		}))
		.sort((a, b) => a.board - b.board);

/*
 * A Match's Players as they are seated: one known, named first while they wait, and the other known too
 * or still to come.
 */
const findSeatedPlayers = (
	tournament: Tournament,
	match: MatchPlace,
): readonly [Player, Opponent] => {
	const findSeated = (from: Seat): Opponent => {
		if (typeof from === 'number') {
			return findPlayer(tournament, from);
		}
		if ('heldFor' in from) {
			return { placeHeldFor: findPlayer(tournament, from.heldFor) };
		}
		const players = findBothPlayers(tournament, from);
		return {
			winnerOf:
				players && (players.map((p) => findPlayer(tournament, p)) as [Player, Player]),
		};
	};
	const [a, b] = findPlayers(tournament, match).map(findSeated);
	return 'name' in a ? [a, b] : [b as Player, a];
};

export interface MatchWaitingForBoard {
	readonly match: MatchPlace;
	// The second may still be to come.
	readonly players: readonly [Player, Opponent];
}

// Every Match waiting for a Board, in turn: the next Board to free goes to the first.
export const getWaitingForBoard = (tournament: Tournament): readonly MatchWaitingForBoard[] =>
	tournament.waitingForBoard.map((match) => ({
		match,
		players: findSeatedPlayers(tournament, match),
	}));

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

// A Match in a bracket's picture.
export interface BracketMatch {
	// Undefined while that Player is still to come.
	readonly players: readonly [Player | undefined, Player | undefined];
	// While the Match is being played, or held for a Bye Player waiting there.
	readonly board?: BoardNumber;
	readonly winner?: Player;
}

export interface BracketPicture {
	/*
	 * Each Round's Matches, in bracket order, from the first Round to the final. A Bye's place in the first
	 * Round is undefined: its Player is in Round 2. A first Round of nothing but Byes is left out.
	 */
	readonly rounds: readonly (readonly (BracketMatch | undefined)[])[];
	// The final's winner, once it is recorded.
	readonly champion?: Player;
}

/*
 * A whole bracket as it stands: who has advanced, who is still playing. Undefined before its Draw, or for a
 * Losers Bracket not played.
 */
export const getBracketPicture = (
	tournament: Tournament,
	name: BracketName,
): BracketPicture | undefined => {
	const bracket = getBracket(tournament, name);
	if (!bracket) {
		return undefined;
	}
	const findKnown = (from: Seat): Player | undefined =>
		typeof from === 'number' ? findPlayer(tournament, from) : undefined;
	const pictureMatch = (match: MatchPlace): BracketMatch => {
		const [a, b] = findPlayers(tournament, match);
		const winner = findWinner(tournament, match);
		return {
			players: [findKnown(a), findKnown(b)],
			board: findBoard(tournament, match),
			winner: winner === undefined ? undefined : findPlayer(tournament, winner),
		};
	};
	const rounds = listIndexes(countRounds(bracket)).map((r) =>
		listIndexes(bracket.firstRound.length / 2 ** r).map((place) =>
			r === 0 && isBye(findSettledEntry(tournament, { bracket: name, round: 1, place }))
				? undefined
				: pictureMatch({ bracket: name, round: r + 1, place }),
		),
	);
	/*
	 * A Held Place that became a Bye can leave a first Round of nothing but Byes: the bracket was drawn for
	 * one more Player than came. It is left out, so the bracket looks the size of its field.
	 */
	const isFirstRoundEmpty = rounds.length > 1 && rounds[0].every((m) => m === undefined);
	const shownRounds = isFirstRoundEmpty ? rounds.slice(1) : rounds;
	return { rounds: shownRounds, champion: shownRounds.at(-1)![0]!.winner };
};

/*
 * Whether a Player has lost a Match in a bracket, and so left it. A Bye is not a loss, and a Player who has
 * lost in the Winners Bracket may still be playing in the Losers Bracket.
 */
export const hasLostIn = (
	tournament: Tournament,
	bracket: BracketName,
	player: PlayerId,
): boolean => listResultsOf(tournament, bracket, player).some((r) => r.winner !== player);

export interface RecordedResult {
	readonly match: MatchPlace;
	// Where it was played.
	readonly board: BoardNumber;
	readonly winner: Player;
	readonly loser: Player;
	readonly isForfeit: boolean;
}

// The results the Organizer can still undo, latest first.
export const getUndoableResults = (tournament: Tournament): readonly RecordedResult[] =>
	tournament.results
		.filter((r) => findUndoRefusal(tournament, r.match) === undefined)
		.map(({ match, board, winner, isForfeit }) => {
			const loser = findOpponent(tournament, match, winner);
			return {
				match,
				board,
				winner: findPlayer(tournament, winner),
				loser: findPlayer(tournament, loser),
				isForfeit,
			};
		})
		.reverse();

/*
 * Every result of a Match a Player played in a bracket, in the order recorded. The bracket is checked
 * first: settling a Losers Bracket Held Place reads Winners Bracket results, so reading a Losers Match's
 * Players from here would settle it again, without end.
 */
const listResultsOf = (
	tournament: Tournament,
	bracket: BracketName,
	player: PlayerId,
): MatchResult[] =>
	tournament.results.filter(
		(r) => r.match.bracket === bracket && findPlayers(tournament, r.match).includes(player),
	);

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

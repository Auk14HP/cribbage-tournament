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
	readonly board: BoardNumber;
}

export interface Bye {
	readonly bye: PlayerId;
}

const isBye = (entry: FirstRoundMatch | Bye): entry is Bye => 'bye' in entry;

export interface WinnersBracket {
	// One entry per place in Round 2, in bracket order: neighbouring entries' Players meet there.
	readonly firstRound: readonly (FirstRoundMatch | Bye)[];
}

/*
 * registration: Players and Boards are being entered.
 * drawShown: the Draw is made and the TV holds the Round 1 draw screen until the Organizer presses Start.
 * inProgress: Matches are being played.
 */
export type Phase = 'registration' | 'drawShown' | 'inProgress';

export interface Tournament {
	readonly phase: Phase;
	readonly players: readonly Player[];
	readonly nextPlayerId: PlayerId;
	// In number order.
	readonly boards: readonly BoardNumber[];
	readonly winnersBracket?: WinnersBracket;
}

// Bump whenever the Tournament's shape changes, so a Tournament saved in an older shape loads as blank.
export const tournamentVersion = 2;

export const newTournament = (): Tournament => ({
	phase: 'registration',
	players: [],
	nextPlayerId: 1,
	boards: [],
});

export const registerPlayer = (tournament: Tournament, typedName: string): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return { ok: false, reason: 'Registration closed when the Draw was made.' };
	}
	const name = typedName.trim();
	const refusal = nameRefusal(tournament, name);
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
	const refusal = nameRefusal(tournament, name, playerId);
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
const nameRefusal = (
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
	const typed = typedCount.trim();
	if (typed === '') {
		return { ok: false, reason: 'Type how many Boards there are.' };
	}
	if (!/^[0-9]+$/.test(typed) || Number(typed) === 0) {
		return {
			ok: false,
			reason: 'The number of Boards is a whole number above zero, like 12.',
		};
	}
	return { ok: true, value: { ...tournament, boards: range(Number(typed)).map((i) => i + 1) } };
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
	const boardsRefusal = boardsShort(field - places, tournament.boards.length);
	if (boardsRefusal) {
		return { ok: false, reason: boardsRefusal };
	}
	// Each Bye takes a whole first-Round place, so no place is a Bye against a Bye.
	const byePlaces = new Set(inRandomOrder(range(places), random).slice(0, bracketSize - field));
	const drawn = inRandomOrder(
		tournament.players.map((p) => p.id),
		random,
	);
	// Every Board is free at the Draw, so Matches take them lowest-numbered first, in bracket order.
	const freeBoards = [...tournament.boards];
	let next = 0;
	const firstRound = range(places).map((place): FirstRoundMatch | Bye =>
		byePlaces.has(place)
			? { bye: drawn[next++] }
			: { players: [drawn[next++], drawn[next++]], board: freeBoards.shift()! },
	);
	return {
		ok: true,
		value: { ...tournament, phase: 'drawShown', winnersBracket: { firstRound } },
	};
};

export const start = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase === 'registration') {
		return { ok: false, reason: 'Make the Draw before starting.' };
	}
	if (tournament.phase === 'inProgress') {
		return { ok: false, reason: 'The Tournament has already started.' };
	}
	return { ok: true, value: { ...tournament, phase: 'inProgress' } };
};

// Every first-Round Match needs a Board at the Draw: there is no waiting for one yet.
const boardsShort = (matches: number, boards: number): string | undefined => {
	if (boards >= matches) {
		return undefined;
	}
	const needed =
		matches === 1
			? 'a Board for its first-Round Match'
			: `a Board for each of its ${matches} first-Round Matches`;
	const set =
		boards === 0 ? 'there are none' : `there ${boards === 1 ? 'is' : 'are'} only ${boards}`;
	return `The Draw needs ${needed}, and ${set}.`;
};

export interface RoundOneDraw {
	// In Board order.
	readonly matches: readonly {
		readonly players: readonly [Player, Player];
		readonly board: BoardNumber;
	}[];
	readonly byes: readonly Player[];
}

// The Round 1 draw screen: every first-Round Match, and who has a Bye. Undefined before the Draw.
export const roundOneDraw = (tournament: Tournament): RoundOneDraw | undefined => {
	const bracket = tournament.winnersBracket;
	if (!bracket) {
		return undefined;
	}
	const player = (id: PlayerId): Player => tournament.players.find((p) => p.id === id)!;
	return {
		matches: bracket.firstRound
			.filter((entry): entry is FirstRoundMatch => !isBye(entry))
			.map((match) => ({
				players: [player(match.players[0]), player(match.players[1])],
				board: match.board,
			})),
		byes: bracket.firstRound.filter(isBye).map((entry) => player(entry.bye)),
	};
};

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

// Fisher–Yates: every order equally likely.
const inRandomOrder = <T>(items: readonly T[], random: Random): T[] => {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

// Setting up the night at registration, before the House Rules and the Draw: Players, Boards and a Home Board, and how long the TV shows each screen.
import type { Result } from '../result';
import { findPlayer, listIndexes } from './bracket';
import type { BoardNumber, PlayerId, Tournament } from './types';

export const registerPlayer = (tournament: Tournament, typedName: string): Result<Tournament> => {
	const closed = findRegistrationClosedRefusal(
		tournament,
		'Registration closed when the Draw was made.',
	);
	if (closed) {
		return { ok: false, reason: closed };
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

const notRegistered = 'That Player is no longer registered.';

const noSuchPlayer: Result<Tournament> = { ok: false, reason: notRegistered };

const playersDrawn = 'Players can’t be renamed or removed once the Draw is made.';

/*
 * Returns why a change to the Players or Boards is refused: during registration nothing (undefined), on the
 * House Rules step a reason asking to go back to registration first, and once the Draw is made the reason
 * passed in as onceDrawn.
 */
const findRegistrationClosedRefusal = (
	tournament: Tournament,
	onceDrawn: string,
): string | undefined => {
	switch (tournament.phase) {
		case 'registration':
			return undefined;
		case 'houseRules':
			return 'Go back to registration first.';
		default:
			return onceDrawn;
	}
};

export const renamePlayer = (
	tournament: Tournament,
	playerId: PlayerId,
	typedName: string,
): Result<Tournament> => {
	const closed = findRegistrationClosedRefusal(tournament, playersDrawn);
	if (closed) {
		return { ok: false, reason: closed };
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
	const closed = findRegistrationClosedRefusal(tournament, playersDrawn);
	if (closed) {
		return { ok: false, reason: closed };
	}
	if (!isRegistered(tournament, playerId)) {
		return noSuchPlayer;
	}
	return {
		ok: true,
		value: {
			...tournament,
			players: tournament.players.filter((p) => p.id !== playerId),
			homeBoards: tournament.homeBoards.filter((homeBoard) => homeBoard.player !== playerId),
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
	const closed = findRegistrationClosedRefusal(
		tournament,
		'The number of Boards can’t change once the Draw is made.',
	);
	if (closed) {
		return { ok: false, reason: closed };
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
	/*
	 * A Home Board is cleared when its Board is no longer set out, and when only one Board is left: keeping
	 * the only Board for one Player could leave their opponent's earlier Match with no Board to be played at.
	 */
	const homeBoards = tournament.homeBoards.filter(
		(homeBoard) => count > 1 && homeBoard.board <= count,
	);
	return {
		ok: true,
		value: { ...tournament, boards: listIndexes(count).map((i) => i + 1), homeBoards },
	};
};

/*
 * Gives a Player a Home Board, or moves theirs to another Board. Refused with only one Board: keeping it
 * for one Player could leave their opponent's earlier Match with no Board to be played at.
 */
export const setHomeBoard = (
	tournament: Tournament,
	playerId: PlayerId,
	board: BoardNumber,
): Result<Tournament> => {
	const refusal = findHomeBoardRefusal(tournament, playerId);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	if (tournament.boards.length === 0) {
		return {
			ok: false,
			reason: 'Type how many Boards there are before giving a Player a Home Board.',
		};
	}
	if (tournament.boards.length === 1) {
		return {
			ok: false,
			reason: 'A Player can’t have a Home Board when there is only one Board.',
		};
	}
	if (!tournament.boards.includes(board)) {
		return { ok: false, reason: `There is no Board ${board}.` };
	}
	const otherHomeBoard = tournament.homeBoards.find((homeBoard) => homeBoard.player !== playerId);
	if (otherHomeBoard) {
		const { name } = findPlayer(tournament, otherHomeBoard.player);
		return {
			ok: false,
			reason: `Only one Player can have a Home Board: ${name} has Board ${otherHomeBoard.board}.`,
		};
	}
	return { ok: true, value: { ...tournament, homeBoards: [{ player: playerId, board }] } };
};

// Takes a Player's Home Board away, so their Matches take Boards as any others do.
export const clearHomeBoard = (tournament: Tournament, playerId: PlayerId): Result<Tournament> => {
	const refusal = findHomeBoardRefusal(tournament, playerId);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	return {
		ok: true,
		value: {
			...tournament,
			homeBoards: tournament.homeBoards.filter((homeBoard) => homeBoard.player !== playerId),
		},
	};
};

// Why a Player's Home Board can't be given or taken away, or undefined if it can.
const findHomeBoardRefusal = (tournament: Tournament, playerId: PlayerId): string | undefined => {
	const closed = findRegistrationClosedRefusal(
		tournament,
		'A Home Board can’t change once the Draw is made.',
	);
	if (closed) {
		return closed;
	}
	if (!isRegistered(tournament, playerId)) {
		return notRegistered;
	}
	return undefined;
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

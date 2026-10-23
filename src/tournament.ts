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

export interface Tournament {
	readonly players: readonly Player[];
	readonly nextPlayerId: PlayerId;
}

export const newTournament = (): Tournament => ({ players: [], nextPlayerId: 1 });

export const registerPlayer = (tournament: Tournament, typedName: string): Result<Tournament> => {
	const name = typedName.trim();
	const refusal = nameRefusal(tournament, name);
	if (refusal) {
		return { ok: false, reason: refusal };
	}
	const player = { id: tournament.nextPlayerId, name };
	return {
		ok: true,
		value: {
			players: [...tournament.players, player],
			nextPlayerId: tournament.nextPlayerId + 1,
		},
	};
};

const noSuchPlayer: Result<Tournament> = {
	ok: false,
	reason: 'That Player is no longer registered.',
};

export const renamePlayer = (
	tournament: Tournament,
	playerId: PlayerId,
	typedName: string,
): Result<Tournament> => {
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

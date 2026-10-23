// The Tournament core: owns every rule, knows nothing about the UI or the browser.
// A Tournament is plain, JSON-serialisable data; commands return a new Tournament or a reason for refusing.

export type PlayerId = number;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
}

export interface Tournament {
  readonly players: readonly Player[];
  readonly nextPlayerId: PlayerId;
}

export type Outcome =
  { ok: true; tournament: Tournament } | { ok: false; reason: string };

export function newTournament(): Tournament {
  return { players: [], nextPlayerId: 1 };
}

export function registerPlayer(
  tournament: Tournament,
  typedName: string,
): Outcome {
  const name = typedName.trim();
  const refusal = nameRefusal(tournament, name);
  if (refusal) return { ok: false, reason: refusal };
  const player = { id: tournament.nextPlayerId, name };
  return {
    ok: true,
    tournament: {
      players: [...tournament.players, player],
      nextPlayerId: tournament.nextPlayerId + 1,
    },
  };
}

const noSuchPlayer: Outcome = {
  ok: false,
  reason: "That Player is no longer registered.",
};

export function renamePlayer(
  tournament: Tournament,
  playerId: PlayerId,
  typedName: string,
): Outcome {
  if (!isRegistered(tournament, playerId)) return noSuchPlayer;
  const name = typedName.trim();
  const refusal = nameRefusal(tournament, name, playerId);
  if (refusal) return { ok: false, reason: refusal };
  return {
    ok: true,
    tournament: {
      ...tournament,
      players: tournament.players.map((p) =>
        p.id === playerId ? { ...p, name } : p,
      ),
    },
  };
}

export function removePlayer(
  tournament: Tournament,
  playerId: PlayerId,
): Outcome {
  if (!isRegistered(tournament, playerId)) return noSuchPlayer;
  return {
    ok: true,
    tournament: {
      ...tournament,
      players: tournament.players.filter((p) => p.id !== playerId),
    },
  };
}

function isRegistered(tournament: Tournament, playerId: PlayerId): boolean {
  return tournament.players.some((p) => p.id === playerId);
}

// Names must be unique so two Players can never be confused on the TV.
function nameRefusal(
  tournament: Tournament,
  name: string,
  renaming?: PlayerId,
): string | undefined {
  if (name === "") return "Type the Player’s name.";
  if (tournament.players.some((p) => p.name === name && p.id !== renaming)) {
    return `There is already a Player called "${name}".`;
  }
}

export function players(tournament: Tournament): readonly Player[] {
  return tournament.players;
}

export function playerCount(tournament: Tournament): number {
  return tournament.players.length;
}

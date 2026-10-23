import { describe, expect, it } from "vitest";
import {
  newTournament,
  playerCount,
  players,
  registerPlayer,
  removePlayer,
  renamePlayer,
  type Outcome,
  type Tournament,
} from "./tournament";

describe("registering Players", () => {
  it("lists registered Players by the name the room knows them by, with a running count", () => {
    let tournament = newTournament();
    tournament = expectOk(registerPlayer(tournament, "Dave K."));
    tournament = expectOk(registerPlayer(tournament, "Big Dave"));

    expect(players(tournament).map((p) => p.name)).toEqual([
      "Dave K.",
      "Big Dave",
    ]);
    expect(playerCount(tournament)).toBe(2);
  });

  it("rejects a name identical to an existing Player, with a reason, and leaves the list unchanged", () => {
    const tournament = expectOk(registerPlayer(newTournament(), "Big Dave"));

    const outcome = registerPlayer(tournament, "Big Dave");

    expect(outcome).toEqual({
      ok: false,
      reason: 'There is already a Player called "Big Dave".',
    });
    expect(playerCount(tournament)).toBe(1);
  });

  it("ignores stray spaces around a name, so a padded duplicate is still rejected", () => {
    const tournament = expectOk(registerPlayer(newTournament(), "  Dave K. "));

    expect(players(tournament).map((p) => p.name)).toEqual(["Dave K."]);
    expect(registerPlayer(tournament, "Dave K.  ").ok).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(registerPlayer(newTournament(), "   ")).toEqual({
      ok: false,
      reason: "Type the Player’s name.",
    });
  });
});

describe("correcting Players before the Draw", () => {
  it("renames a Player, keeping their place in the list", () => {
    let tournament = expectOk(registerPlayer(newTournament(), "Dave K"));
    tournament = expectOk(registerPlayer(tournament, "Big Dave"));
    const daveK = players(tournament)[0];

    tournament = expectOk(renamePlayer(tournament, daveK.id, "Dave K."));

    expect(players(tournament).map((p) => p.name)).toEqual([
      "Dave K.",
      "Big Dave",
    ]);
  });

  it("refuses to rename a Player to another Player’s name", () => {
    let tournament = expectOk(registerPlayer(newTournament(), "Dave K."));
    tournament = expectOk(registerPlayer(tournament, "Big Dave"));
    const daveK = players(tournament)[0];

    expect(renamePlayer(tournament, daveK.id, " Big Dave")).toEqual({
      ok: false,
      reason: 'There is already a Player called "Big Dave".',
    });
    expect(renamePlayer(tournament, daveK.id, "")).toEqual({
      ok: false,
      reason: "Type the Player’s name.",
    });
  });

  it("lets a Player keep their own name when renamed", () => {
    const tournament = expectOk(registerPlayer(newTournament(), "Dave K."));
    const daveK = players(tournament)[0];

    expect(renamePlayer(tournament, daveK.id, "Dave K. ").ok).toBe(true);
  });

  it("removes a Player who changed their mind, freeing their name", () => {
    let tournament = expectOk(registerPlayer(newTournament(), "Dave K."));
    tournament = expectOk(registerPlayer(tournament, "Big Dave"));
    const daveK = players(tournament)[0];

    tournament = expectOk(removePlayer(tournament, daveK.id));

    expect(players(tournament).map((p) => p.name)).toEqual(["Big Dave"]);
    expect(playerCount(tournament)).toBe(1);
    expect(registerPlayer(tournament, "Dave K.").ok).toBe(true);
  });

  it("refuses to rename or remove a Player who is no longer registered", () => {
    let tournament = expectOk(registerPlayer(newTournament(), "Dave K."));
    const daveK = players(tournament)[0];
    tournament = expectOk(removePlayer(tournament, daveK.id));

    const refused = {
      ok: false,
      reason: "That Player is no longer registered.",
    };
    expect(removePlayer(tournament, daveK.id)).toEqual(refused);
    expect(renamePlayer(tournament, daveK.id, "Dave K.")).toEqual(refused);
  });
});

function expectOk(outcome: Outcome): Tournament {
  if (!outcome.ok)
    throw new Error(
      `Expected command to succeed, was rejected: ${outcome.reason}`,
    );
  return outcome.tournament;
}

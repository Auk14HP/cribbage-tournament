// The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
import type { Store } from "./storage";
import { playerCount, players, type Tournament } from "./tournament";
import { useTournament } from "./useTournament";
import { playersRegistered } from "./wording";

export function Display({ store }: { store: Store<Tournament> }) {
  const tournament = useTournament(store);
  return (
    <>
      <h1>Tonight’s Players</h1>
      <p className="count">{playersRegistered(playerCount(tournament))}</p>
      <ul className="names">
        {players(tournament).map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  );
}

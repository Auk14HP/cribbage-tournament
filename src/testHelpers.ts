// Helpers shared by the core's tests and the routes' tests. No browser here: the core's tests run in Node.
import type { MatchOnBoard } from './tournament';

// Whether both a Match's Players are known.
export const isReadyToPlay = (match: MatchOnBoard): boolean =>
	match.players.every((p) => 'name' in p);

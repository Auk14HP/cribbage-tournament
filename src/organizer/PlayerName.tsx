import type { MatchPlace, Opponent, Player, PlayerId } from '../tournament';
import { getPlayerName } from '../wording';
import { playerNameBox } from './classes';

// Swap mode, as each Match listed sees it: the Player tapped first, if any, and what tapping a Player does.
export interface SwapPicking {
	readonly picked?: PlayerId;
	readonly onTap: (player: Player, match: MatchPlace) => void;
}

/*
 * One side of a listed Match: in Swap mode a known Player's name is a button to tap, otherwise it is plain.
 * Either way it takes the same box, so turning Swap mode on or off moves no name and no row.
 */
export const PlayerName = ({
	player,
	match,
	swapPicking,
}: {
	player: Opponent;
	match: MatchPlace;
	swapPicking?: SwapPicking;
}) =>
	swapPicking && 'name' in player ? (
		<SwapButton player={player} match={match} swapPicking={swapPicking} />
	) : (
		<span className={`${playerNameBox.shape} ${playerNameBox.plain}`}>
			{getPlayerName(player)}
		</span>
	);

// A Player's name in Swap mode, tapped to pick them or to swap them with the Player picked first.
const SwapButton = ({
	player,
	match,
	swapPicking: { picked, onTap },
}: {
	player: Player;
	match: MatchPlace;
	swapPicking: SwapPicking;
}) => {
	const isPicked = picked === player.id;
	return (
		<button
			type="button"
			aria-pressed={isPicked}
			className={`${playerNameBox.shape} ${isPicked ? playerNameBox.picked : playerNameBox.swappable}`}
			onClick={() => onTap(player, match)}
		>
			{player.name}
		</button>
	);
};

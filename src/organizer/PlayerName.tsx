import type { MatchPlace, Opponent, Player, PlayerId } from '../tournament';
import { getPlayerName } from '../wording';
import { pickedTag, playerNameBox } from './classes';

/*
 * Swap mode, as each Match listed sees it: the Player tapped first, if any, and
 * what tapping a Player does.
 */
export interface SwapPicking {
	readonly picked?: PlayerId;
	readonly onTap: (player: Player, match: MatchPlace) => void;
}

/*
 * One side of a Match waiting for a Board: in Swap mode a known Player's name is a button to
 * tap, otherwise it is plain. Either way it takes the same box, so turning Swap mode on or off
 * moves no name and no row.
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
		<SwapButton
			player={player}
			match={match}
			swapPicking={swapPicking}
			shape={playerNameBox.shape}
		/>
	) : (
		<span className={`${playerNameBox.shape} ${playerNameBox.plain}`}>
			{getPlayerName(player)}
		</span>
	);

/*
 * A Player's name in Swap mode, a seat tapped to pick them or to swap them with the Player picked
 * first. The Player picked is tagged PICKED. The tag is hidden from screen readers, which hear the
 * button pressed instead, so the button is still named by the Player alone.
 */
export const SwapButton = ({
	player,
	match,
	swapPicking: { picked, onTap },
	shape,
}: {
	player: Player;
	match: MatchPlace;
	swapPicking: SwapPicking;
	// The seat's size and padding, from the place it sits: a Match tile's slot, or a name in a row.
	shape: string;
}) => {
	const isPicked = picked === player.id;
	return (
		<button
			type="button"
			aria-pressed={isPicked}
			className={`relative ${shape} ${isPicked ? playerNameBox.picked : playerNameBox.swappable}`}
			onClick={() => onTap(player, match)}
		>
			{player.name}
			{isPicked && (
				<span aria-hidden="true" className={pickedTag}>
					PICKED
				</span>
			)}
		</button>
	);
};

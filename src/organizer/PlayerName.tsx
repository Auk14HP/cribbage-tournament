import type { MatchPlace, Opponent, Player, PlayerId } from '../tournament';
import { getPlayerName } from '../wording';
import { playerNameBox, seatShapes } from './classes';

// Swap mode, as each Match listed sees it: the Player tapped first, if any, and what tapping a Player does.
export interface SwapPicking {
	readonly picked?: PlayerId;
	readonly onTap: (player: Player, match: MatchPlace) => void;
}

/*
 * One side of a Match waiting for a Board: in Swap mode a known Player's name is a button to tap, otherwise it
 * is plain. Either way it takes the same box, so turning Swap mode on or off moves no name and no row.
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
			seatShape={seatShapes.inRow}
		/>
	) : (
		<span className={`${playerNameBox.shape} ${playerNameBox.plain}`}>
			{getPlayerName(player)}
		</span>
	);

/*
 * A Player's name in Swap mode, a seat tapped to pick them or to swap them with the Player picked first. The
 * Player picked is tagged PICKED. The tag is hidden from screen readers, which hear the button pressed instead,
 * so the button is still named by the Player alone.
 */
export const SwapButton = ({
	player,
	match,
	swapPicking: { picked, onTap },
	seatShape,
	className = '',
}: {
	player: Player;
	match: MatchPlace;
	swapPicking: SwapPicking;
	seatShape: (typeof seatShapes)[keyof typeof seatShapes];
	// The classes of the slot the seat fills, if any.
	className?: string;
}) => {
	const isPicked = picked === player.id;
	return (
		<button
			type="button"
			aria-pressed={isPicked}
			className={`${className} ${seatShape.seat} ${isPicked ? playerNameBox.picked : playerNameBox.swappable}`}
			onClick={() => onTap(player, match)}
		>
			{player.name}
			{isPicked && (
				<span aria-hidden="true" className={seatShape.tag}>
					PICKED
				</span>
			)}
		</button>
	);
};

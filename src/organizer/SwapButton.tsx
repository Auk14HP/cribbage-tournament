import type { MatchPlace, Player, PlayerId } from '../tournament';
import { swapButton } from './classes';

// Swap mode, as each Match listed sees it: the Player tapped first, if any, and what tapping a Player does.
export interface SwapPicking {
	readonly picked?: PlayerId;
	readonly onTap: (player: Player, match: MatchPlace) => void;
}

// A Player's name in Swap mode, tapped to pick them or to swap them with the Player picked first.
export const SwapButton = ({
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
			className={`${swapButton.shape} ${isPicked ? swapButton.picked : swapButton.unpicked}`}
			onClick={() => onTap(player, match)}
		>
			{player.name}
		</button>
	);
};

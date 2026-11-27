import type { Player } from '../tournament';
import { rowAboveMatches, swapToggle } from './classes';
import { StackedLabel } from './controls';

/*
 * The row above the Matches on Tonight’s Draw: Swap Players at its right end,
 * which turns on Swap mode and becomes Done, which leaves it. In Swap mode the row
 * is a banner saying what the next tap does, naming the Player picked once there
 * is one, and is named Swap mode, so it reads as a part of the screen of its own.
 * The banner's line takes the space left of the button, so it moves nothing.
 */
export const SwapRow = ({
	swapping,
	picked,
	onToggle,
}: {
	swapping: boolean;
	picked?: Player;
	onToggle: () => void;
}) => (
	<section
		aria-label={swapping ? 'Swap mode' : undefined}
		// Names the row, which has no accessible name while Swap mode is off.
		data-testid="row above the Matches"
		className={`${rowAboveMatches.frame} ${swapping ? rowAboveMatches.banner : rowAboveMatches.bare}`}
	>
		{swapping && (
			<p className="flex min-w-0 items-center gap-3">
				<span className="bg-fill text-on-fill shrink-0 rounded px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase">
					Swapping
				</span>
				<span>
					{picked
						? `${picked.name} is picked. Tap another Player to swap them.`
						: 'Tap two Players to swap them.'}
				</span>
			</p>
		)}
		{/*
		 * Its labels share one grid cell, so it is as wide as Swap Players whichever shows, and
		 * neither wraps nor shrinks: the box under the pointer stays put when it becomes Done.
		 */}
		<button
			type="button"
			className={`ml-auto ${swapToggle.shape} ${swapping ? swapToggle.on : swapToggle.off}`}
			onClick={onToggle}
		>
			<StackedLabel label="Swap Players" isShown={!swapping} />
			<StackedLabel label="Done" isShown={swapping} />
		</button>
	</section>
);

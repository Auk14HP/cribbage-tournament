import { StackedLabel } from './controls';

/*
 * The badge beside the Organizer screen's heading saying whether the TV window is running: TV open, with a
 * green dot, or TV closed, with a dot in the danger colour. A status, so a screen reader says when it changes.
 * Both labels share one grid cell, so the badge is as wide as the longer whichever shows, and the heading
 * beside it stays put as the TV opens or closes.
 */
export const TvBadge = ({ isTvOpen }: { isTvOpen: boolean }) => (
	<p
		role="status"
		aria-label="TV"
		className="border-divider bg-raised inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold"
	>
		<span
			aria-hidden
			className={`size-2 rounded-full ${isTvOpen ? tvDotColours.open : tvDotColours.closed}`}
		/>
		<span className="grid">
			<StackedLabel label="TV open" isShown={isTvOpen} />
			<StackedLabel label="TV closed" isShown={!isTvOpen} />
		</span>
	</p>
);

// The badge's dot: green while the TV is open, as a House Rule on the TV is tagged, the danger colour once it closes.
const tvDotColours = {
	open: 'bg-on-tv',
	closed: 'bg-danger',
};

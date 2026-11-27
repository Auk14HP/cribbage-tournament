import { StackedLabel } from './controls';

/*
 * The badge in the Organizer screen's header saying whether the TV window is running: TV open or TV
 * closed, each with a dot in its own theme colour. A status, so a screen reader says when it
 * changes. Both labels share one grid cell, so the badge is always as wide as TV closed, the longer
 * label, and the buttons beside it stay put as the TV opens or closes. Centred in the header's row,
 * so it keeps its own height beside the taller buttons.
 */
export const TvBadge = ({ isTvOpen }: { isTvOpen: boolean }) => (
	<p
		role="status"
		aria-label="TV"
		className="border-divider bg-raised inline-flex shrink-0 items-center gap-2 self-center rounded-full border px-3 py-1.5 text-sm font-semibold"
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

// The badge's dot, in the theme's colour for the TV open or for the TV closed.
const tvDotColours = {
	open: 'bg-tv-open',
	closed: 'bg-tv-closed',
};

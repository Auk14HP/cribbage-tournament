/*
 * The TV's safe area: a TV that overscans crops the picture's edges, so every screen keeps its
 * content 5% in from each edge. The page's padding is that margin, a screen that fills the TV is
 * the 90cqh (hundredths of the TV screen's height) left between the top and bottom margins, and the
 * countdown ring sits in the safe area's bottom-right corner. A TV Theme with a border draws it in
 * a band along the top of the safe area, its height in --tv-border-band, and the screens start
 * below it, a band's height shorter. Kept in one place since they change together.
 */
export const tvSafeArea = {
	page: 'px-[5cqw] pt-[calc(5cqh+var(--tv-border-band,0px))] pb-[5cqh]',
	fullHeight: 'h-[calc(90cqh-var(--tv-border-band,0px))]',
	/*
	 * The gap a heading set solid keeps below a TV Theme's border
	 * (--tv-heading-clearance in src/style.css).
	 */
	headingClearance: 'pt-[var(--tv-heading-clearance,0px)]',
	bottomRightCorner: 'right-[5cqw] bottom-[5cqh]',
};

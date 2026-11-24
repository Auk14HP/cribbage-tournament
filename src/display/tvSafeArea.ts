/*
 * The TV's safe area: a TV that overscans crops the picture's edges, so every screen keeps its content 5% in
 * from each edge. The page's padding is that margin, a screen that fills the TV is the 90cqh (hundredths of the TV screen's height) left between
 * the top and bottom margins, and the countdown ring sits in the safe area's bottom-right corner. Kept in one
 * place since they change together.
 */
export const tvSafeArea = {
	page: 'px-[5cqw] py-[5cqh]',
	fullHeight: 'h-[90cqh]',
	bottomRightCorner: 'right-[5cqw] bottom-[5cqh]',
};

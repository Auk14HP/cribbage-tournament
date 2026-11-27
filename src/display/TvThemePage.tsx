import type { ReactNode } from 'react';
import type { Tournament } from '../tournament';
import { tvSafeArea } from './tvSafeArea';
import { TvThemeBorder } from './TvThemeArt';
import { findTvThemeToday, TvThemeContext } from './tvThemeContext';

/*
 * The page a TV screen is drawn on, inside a TV screen's frame: the TV itself, the TV Display's thumbnail or the
 * Bracket peek. It is drawn in the Tournament's TV Theme, set on its `data-tv-theme` attribute for the colours
 * and on the TV Theme context for the artwork, with the TV Theme's border along the top of its safe area. Its
 * artwork moves only when told it may: on the TV itself. The element and its size are the caller's: the TV's
 * page is its main landmark, as tall as the window at least; a picture of the TV fills its frame, hidden from
 * assistive technology where the frame is named as a picture.
 */
export const TvThemePage = ({
	tournament,
	isMoving,
	element: Page = 'div',
	className,
	isHidden = false,
	children,
}: {
	tournament: Tournament;
	isMoving: boolean;
	element?: 'main' | 'div';
	className: string;
	isHidden?: boolean;
	children: ReactNode;
}) => {
	const tvTheme = findTvThemeToday(tournament);
	return (
		<Page
			data-tv-theme={tvTheme}
			aria-hidden={isHidden || undefined}
			className={`bg-tv-ground text-tv-ink relative ${tvSafeArea.page} ${className}`}
		>
			<TvThemeContext value={{ tvTheme, isMoving }}>
				<TvThemeBorder />
				{children}
			</TvThemeContext>
		</Page>
	);
};

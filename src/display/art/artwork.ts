/*
 * What artwork a TV Theme draws, and where: every TV Theme but Classic has each piece. Adding a TV Theme, and
 * the style its artwork shares: docs/tv-themes.md.
 */
import type { FC } from 'react';
import type { BracketName } from '../../tournament';

// Whether the artwork may move: only on the TV itself, and only while it allows motion.
export interface MovingProps {
	readonly isMoving: boolean;
}

export interface TvThemeArtwork {
	/*
	 * Along the top of the TV, in the 3cqh band the screens leave for it
	 * (--tv-border-band in src/style.css).
	 */
	readonly Border: FC<MovingProps>;
	// Beside the title of each screen, the height of the box given.
	readonly TitleMotifs: FC<MovingProps>;
	// Inside the countdown ring, in the ring's own units: a viewBox 36 wide, centred on 18, 18.
	readonly RingMotif: FC;
	/*
	 * Beside each champion's name, the height of the box given: one for each bracket's champion. A
	 * TV Theme may give both the same.
	 */
	readonly ChampionMotifs: Readonly<Record<BracketName, FC<MovingProps>>>;
}

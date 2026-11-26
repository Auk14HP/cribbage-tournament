// What artwork a TV Theme draws, and where: every TV Theme but Classic has each piece.
import type { FC } from 'react';

// Whether the artwork may move: only on the TV itself, and only while the TV doesn't ask for reduced motion.
export interface MovingProps {
	readonly isMoving: boolean;
}

export interface TvThemeArtwork {
	// Along the top of the TV, in the 3cqh band the screens leave for it (--tv-border-band in src/style.css).
	readonly Border: FC<MovingProps>;
	// Beside the title of each screen, the height of the box given.
	readonly TitleMotifs: FC<MovingProps>;
	// Inside the countdown ring, in the ring's own units: a viewBox 36 wide, centred on 18, 18.
	readonly RingMotif: FC;
	// Beside each champion's name, the height of the box given.
	readonly ChampionMotif: FC<MovingProps>;
}

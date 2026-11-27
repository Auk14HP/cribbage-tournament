// What every piece of Christmas's artwork shares: its outline and how its lights twinkle.
import type { CSSProperties } from 'react';

// The colour of the dark line round every shape, so the artwork reads as drawn rather than cut out.
export const outlineColour = '#08180f';

// One twinkle, dim to bright and back: slow, so nothing flashes. As --animate-twinkle in style.css.
const twinkleSeconds = 3.2;

/*
 * Returns the class that makes a light twinkle, when the artwork may move, and its style: where in the twinkle
 * the light given by its place is from the start, so neighbouring lights don't peak together and none waits,
 * unmoving, before it begins, and the colour of its glow at the peak, the light's own colour.
 */
export const describeTwinkle = ({
	isMoving,
	place,
	glowColour,
}: {
	isMoving: boolean;
	place: number;
	glowColour: string;
}) => ({
	className: isMoving ? 'motion-safe:animate-twinkle' : '',
	style: {
		animationDelay: `-${((place * 0.77) % twinkleSeconds).toFixed(2)}s`,
		'--twinkle-glow': glowColour,
	} as CSSProperties,
});

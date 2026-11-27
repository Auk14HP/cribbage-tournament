// What every piece of Christmas's artwork shares: its outline and how its lights twinkle.
import type { CSSProperties } from 'react';

// The colour of the dark line round every shape, so the artwork reads as drawn rather than cut out.
export const outlineColour = '#08180f';

// One twinkle, bright to dim and back: slow, so nothing flashes. As --animate-twinkle in style.css.
const twinkleSeconds = 3.2;

/*
 * Returns the class that makes a light twinkle, when the artwork may move, and the style that sets where in the
 * twinkle the light given by its place starts, so neighbouring lights don't dim together.
 */
export const describeTwinkle = (isMoving: boolean, place: number) => ({
	className: isMoving ? 'motion-safe:animate-twinkle' : '',
	style: { animationDelay: `${((place * 0.77) % twinkleSeconds).toFixed(2)}s` } as CSSProperties,
});

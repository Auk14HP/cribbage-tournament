import { outlineColour } from './drawing';

/*
 * Christmas's ring motif: a red bauble on a gold cap and loop, drawn in the countdown ring's own
 * units, centred in the ring's hole. Turned a quarter back, since the ring is turned a quarter
 * so it fills from the top.
 */
export const RingOrnament = () => (
	<g transform="rotate(90 18 18)">
		<circle cx="18" cy="10.6" r="1.3" fill="none" stroke="#e0b21f" strokeWidth="0.7" />
		<rect
			x="16"
			y="11.4"
			width="4"
			height="2.6"
			rx="0.5"
			fill="#e0b21f"
			stroke={outlineColour}
			strokeWidth="0.4"
		/>
		<circle cx="18" cy="19.6" r="6.1" fill="#e04848" />
		<path d="M18 13.5 A 6.1 6.1 0 0 1 18 25.7 A 3.6 6.1 0 0 0 18 13.5 Z" fill="#b83232" />
		<path d="M12.1 18.6 Q 18 21.4 23.9 18.6" fill="none" stroke="#ffd23f" strokeWidth="1.1" />
		<circle cx="18" cy="19.6" r="6.1" fill="none" stroke={outlineColour} strokeWidth="0.5" />
		<ellipse cx="15.6" cy="17.2" rx="1" ry="1.8" fill="#ffffff" opacity="0.7" />
	</g>
);

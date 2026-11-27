import type { MovingProps } from '../artwork';
import { describeTwinkle, outlineColour } from './drawing';

// The colours of the lights in turn, each with the darker shade of its far side.
const lightColours = [
	{ glass: '#ff5a5a', shade: '#cc3b3b' },
	{ glass: '#ffd23f', shade: '#d9a91a' },
	{ glass: '#5ad17a', shade: '#33a457' },
	{ glass: '#6fa8ff', shade: '#4d82d6' },
];

// How many lights hang along the top of the TV, whatever its width.
const lightCount = 28;

// The bulb's glass, round at the bottom and narrowing to its socket.
const glassShape = 'M10 6 C 17 10, 17 22, 10 28 C 3 22, 3 10, 10 6 Z';

// The bulb at the place given along the string, hanging from its socket in a soft glow.
const Bulb = ({ place, isMoving }: { place: number; isMoving: boolean }) => {
	const { glass, shade } = lightColours[place % lightColours.length];
	const { className, style } = describeTwinkle({ isMoving, place, glowColour: glass });
	return (
		<svg
			viewBox="0 0 20 30"
			className="absolute top-[0.9cqh] left-1/2 h-[2.1cqh] -translate-x-1/2 overflow-visible"
		>
			<g className={className} style={style}>
				<circle cx="10" cy="18" r="10" fill={glass} opacity="0.16" />
				<path d={glassShape} fill={glass} />
				<path d="M10 6 C 17 10, 17 22, 10 28 C 13 22, 14 12, 10 6 Z" fill={shade} />
				<path d={glassShape} fill="none" stroke={outlineColour} strokeWidth="0.9" />
				<ellipse cx="7.3" cy="14" rx="1.4" ry="3.4" fill="#ffffff" opacity="0.7" />
				<circle cx="7.6" cy="19.6" r="0.7" fill="#ffffff" opacity="0.5" />
			</g>
			<rect
				x="6"
				y="0"
				width="8"
				height="7"
				rx="1.5"
				fill="#8c9a90"
				stroke={outlineColour}
				strokeWidth="0.9"
			/>
			<path d="M6.5 2.5 H13.5 M6.5 4.6 H13.5" stroke="#5f6d63" strokeWidth="0.8" />
		</svg>
	);
};

// One length of wire, dipping between two hooks, with a bulb hanging at the bottom of the dip.
const Dip = ({ place, isMoving }: { place: number; isMoving: boolean }) => (
	<div className="relative h-full flex-1">
		<div className="absolute inset-x-0 top-0 h-[1.2cqh] rounded-b-[50%] border-b-[0.22cqh] border-[#3d5a45]" />
		<Bulb place={place} isMoving={isMoving} />
	</div>
);

/*
 * Christmas's border: a string of lights along the top of the TV. Each dip of the wire takes an equal share of
 * the width, so the string spans any TV.
 */
export const StringOfLights = ({ isMoving }: MovingProps) => (
	<div className="flex h-[3cqh]">
		{Array.from({ length: lightCount }, (_, place) => (
			<Dip key={place} place={place} isMoving={isMoving} />
		))}
	</div>
);

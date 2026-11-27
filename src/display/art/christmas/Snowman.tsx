import type { MovingProps } from '../artwork';
import { describeTwinkle, outlineColour } from './drawing';

// The colours of snow, in the light and in shade, and of coal.
const snow = { lit: '#f4f8f6', shade: '#c5d6cd' };
const coal = '#1c1f24';

// The red of the scarf and the hat's band, and of the scarf's darker stripes.
const scarfRed = { cloth: '#d64545', stripe: '#a83030' };

// The snowman's three snowballs, bottom first, so each one above overlaps the one below.
const snowballs = [
	{ cx: 50, cy: 88, r: 22 },
	{ cx: 50, cy: 56, r: 16 },
	{ cx: 50, cy: 30, r: 12 },
];

// The white of the snowflakes round the snowman.
const snowflakeColour = '#ffffff';

// Where the snowflakes round the snowman fall, and how far each arm reaches from its middle.
const snowflakes = [
	{ x: 10, y: 16, reach: 5 },
	{ x: 90, y: 22, reach: 4 },
	{ x: 91, y: 82, reach: 5 },
	{ x: 8, y: 74, reach: 4 },
];

// The coal of the face: the eyes, then the smile from left to right.
const faceCoal = [
	{ cx: 45, cy: 27, r: 1.7 },
	{ cx: 55, cy: 27, r: 1.7 },
	{ cx: 44.5, cy: 35, r: 0.9 },
	{ cx: 47.5, cy: 36.6, r: 0.9 },
	{ cx: 52.5, cy: 36.6, r: 0.9 },
	{ cx: 55.5, cy: 35, r: 0.9 },
];

// The coal buttons down the middle snowball and the bottom one.
const buttons = [
	{ cx: 50, cy: 52 },
	{ cx: 50, cy: 61 },
	{ cx: 50, cy: 80 },
];

// One snowball, lit on the left, in shade down its right side, outlined.
const Snowball = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
	<g>
		<circle cx={cx} cy={cy} r={r} fill={snow.lit} />
		<path
			d={`M${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r * 0.55} ${r} 0 0 0 ${cx} ${cy - r} Z`}
			fill={snow.shade}
		/>
		<circle cx={cx} cy={cy} r={r} fill="none" stroke={outlineColour} strokeWidth="1.6" />
	</g>
);

// The snowflake at the place given: three crossed strokes, twinkling when allowed to move.
const Snowflake = ({ place, isMoving }: { place: number; isMoving: boolean }) => {
	const { x, y, reach } = snowflakes[place];
	const { className, style } = describeTwinkle({ isMoving, place, glowColour: snowflakeColour });
	const across = reach * 0.87;
	const half = reach / 2;
	return (
		<path
			className={className}
			style={style}
			d={`M${x} ${y - reach} L${x} ${y + reach} M${x - across} ${y - half} L${x + across} ${y + half} M${x - across} ${y + half} L${x + across} ${y - half}`}
			stroke={snowflakeColour}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
	);
};

/*
 * Christmas's motif for the Losers Bracket's champion: a snowman in a top hat and a red scarf, with a carrot
 * nose, coal eyes, smile and buttons, and stick arms, snowflakes twinkling round him.
 */
export const Snowman = ({ isMoving }: MovingProps) => (
	<svg viewBox="0 0 100 116" className="h-full overflow-visible">
		<ellipse cx="50" cy="111" rx="30" ry="3.5" fill="#000000" opacity="0.3" />
		<path
			d="M35 56 L17 44 M23 48 L19 40 M65 56 L83 45 M77 49 L82 41"
			stroke="#6b4423"
			strokeWidth="2.6"
			strokeLinecap="round"
		/>
		{snowballs.map((snowball) => (
			<Snowball key={snowball.cy} cx={snowball.cx} cy={snowball.cy} r={snowball.r} />
		))}
		{buttons.map(({ cx, cy }) => (
			<circle key={cy} cx={cx} cy={cy} r="2" fill={coal} />
		))}
		{faceCoal.map(({ cx, cy, r }) => (
			<circle key={`${cx} ${cy}`} cx={cx} cy={cy} r={r} fill={coal} />
		))}
		<path
			d="M50 30 L63 32.5 L50 34.5 Z"
			fill="#f08a24"
			stroke={outlineColour}
			strokeWidth="0.8"
			strokeLinejoin="round"
		/>
		{/* The scarf round the neck and its tail, striped in a darker red. */}
		<path
			d="M56 43 L61 60 L55 61.5 L51 45 Z"
			fill={scarfRed.cloth}
			stroke={outlineColour}
			strokeWidth="1.2"
			strokeLinejoin="round"
		/>
		<rect
			x="36"
			y="39.5"
			width="28"
			height="6.5"
			rx="3"
			fill={scarfRed.cloth}
			stroke={outlineColour}
			strokeWidth="1.2"
		/>
		<path
			d="M43 39.8 V45.8 M50 39.8 V45.8 M57 39.8 V45.8"
			stroke={scarfRed.stripe}
			strokeWidth="1.6"
		/>
		{/* The top hat: its crown, a red band and the brim. */}
		<rect
			x="40"
			y="2"
			width="20"
			height="17"
			rx="1"
			fill={coal}
			stroke={outlineColour}
			strokeWidth="1.2"
		/>
		<rect x="40.6" y="13" width="18.8" height="3.5" fill={scarfRed.cloth} />
		<rect
			x="33"
			y="18"
			width="34"
			height="4"
			rx="1.5"
			fill={coal}
			stroke={outlineColour}
			strokeWidth="1.2"
		/>
		<rect x="43" y="4" width="2.2" height="8" rx="1" fill="#ffffff" opacity="0.25" />
		{snowflakes.map((snowflake, place) => (
			<Snowflake key={`${snowflake.x} ${snowflake.y}`} place={place} isMoving={isMoving} />
		))}
	</svg>
);

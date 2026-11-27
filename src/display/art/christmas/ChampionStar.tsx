import type { MovingProps } from '../artwork';
import { describeTwinkle, outlineColour } from './drawing';

// The champion's star: a point of light and a point of shade on each of its five arms.
const championStar = {
	outline:
		'50,8 60.6,37.4 91.8,38.4 67.1,57.6 75.9,87.6 50,70 24.1,87.6 32.9,57.6 8.2,38.4 39.4,37.4',
	shade: 'M50 52 L50 8 L60.6 37.4 Z M50 52 L91.8 38.4 L67.1 57.6 Z M50 52 L75.9 87.6 L50 70 Z M50 52 L24.1 87.6 L32.9 57.6 Z M50 52 L8.2 38.4 L39.4 37.4 Z',
};

// Where each four-pointed sparkle round the champion's star sits, and how far it reaches.
const sparkles = [
	{ x: 10, y: 12, reach: 7 },
	{ x: 90, y: 16, reach: 5 },
	{ x: 92, y: 80, reach: 6 },
	{ x: 6, y: 74, reach: 4.5 },
];

// One sparkle, the one at the place given, twinkling when allowed to move.
const Sparkle = ({ place, isMoving }: { place: number; isMoving: boolean }) => {
	const { x, y, reach } = sparkles[place];
	const { className, style } = describeTwinkle(isMoving, place);
	const waist = reach / 4;
	const points = [
		[x, y - reach],
		[x + waist, y - waist],
		[x + reach, y],
		[x + waist, y + waist],
		[x, y + reach],
		[x - waist, y + waist],
		[x - reach, y],
		[x - waist, y - waist],
	];
	return (
		<polygon
			className={className}
			style={style}
			points={points.map((point) => point.join(',')).join(' ')}
			fill="#fff6cf"
		/>
	);
};

// Christmas's champion motif: a large gold star with sparkles round it, which twinkle.
export const ChampionStar = ({ isMoving }: MovingProps) => (
	<svg viewBox="0 0 100 100" className="h-full">
		<polygon points={championStar.outline} fill="#ffd23f" />
		<path d={championStar.shade} fill="#e0a800" />
		<polygon
			points={championStar.outline}
			fill="none"
			stroke={outlineColour}
			strokeWidth="2.4"
			strokeLinejoin="round"
		/>
		<ellipse
			cx="42"
			cy="40"
			rx="3"
			ry="6"
			fill="#ffffff"
			opacity="0.6"
			transform="rotate(-25 42 40)"
		/>
		{sparkles.map((sparkle, place) => (
			<Sparkle key={`${sparkle.x} ${sparkle.y}`} place={place} isMoving={isMoving} />
		))}
	</svg>
);

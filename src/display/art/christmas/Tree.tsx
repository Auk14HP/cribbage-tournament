import type { MovingProps } from '../artwork';
import { outline, twinkle } from './drawing';

/*
 * The tree's three tiers, top first: each a triangle with a scalloped hem, and its right half, in shade, as the
 * light falls from the left.
 */
const treeTiers = [
	{
		shape: 'M50 10 L72 42 Q 66 38 61 43 Q 55 38 50 44 Q 45 38 39 43 Q 34 38 28 42 Z',
		shade: 'M50 10 L72 42 Q 66 38 61 43 Q 55 38 50 44 Z',
	},
	{
		shape: 'M50 28 L80 70 Q 72 66 65 71 Q 57 66 50 72 Q 43 66 35 71 Q 28 66 20 70 Z',
		shade: 'M50 28 L80 70 Q 72 66 65 71 Q 57 66 50 72 Z',
	},
	{
		shape: 'M50 50 L88 100 Q 78 96 69 101 Q 59 96 50 102 Q 41 96 31 101 Q 22 96 12 100 Z',
		shade: 'M50 50 L88 100 Q 78 96 69 101 Q 59 96 50 102 Z',
	},
];

// The baubles on the tree: where each hangs and its colour.
const baubles = [
	{ cx: 40, cy: 36, fill: '#ff5a5a' },
	{ cx: 60, cy: 52, fill: '#6fa8ff' },
	{ cx: 36, cy: 64, fill: '#ffd23f' },
	{ cx: 66, cy: 88, fill: '#ff5a5a' },
	{ cx: 30, cy: 92, fill: '#6fa8ff' },
	{ cx: 52, cy: 84, fill: '#ffffff' },
];

// The star on the tree's top: a point of light and a point of shade on each of its five arms.
const treeStar = {
	outline: '50,0 52.5,6.6 59.5,6.9 54,11.3 55.9,18.1 50,14.2 44.1,18.1 46,11.3 40.5,6.9 47.5,6.6',
	shade: 'M50 10 L50 0 L52.5 6.6 Z M50 10 L59.5 6.9 L54 11.3 Z M50 10 L55.9 18.1 L50 14.2 Z M50 10 L44.1 18.1 L46 11.3 Z M50 10 L40.5 6.9 L47.5 6.6 Z',
};

// One tier of branches, lit on the left, shaded on the right, outlined.
const TreeTier = ({ shape, shade }: { shape: string; shade: string }) => (
	<g>
		<path d={shape} fill="#3aa05a" />
		<path d={shade} fill="#26803f" />
		<path d={shape} fill="none" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
	</g>
);

// One bauble, the one at the place given on the tree, with a glint, twinkling when allowed to move.
const Bauble = ({ place, isMoving }: { place: number; isMoving: boolean }) => {
	const { cx, cy, fill } = baubles[place];
	const { className, style } = twinkle(isMoving, place);
	return (
		<g className={className} style={style}>
			<circle cx={cx} cy={cy} r="3.6" fill={fill} stroke={outline} strokeWidth="1" />
			<circle cx={cx - 1.2} cy={cy - 1.2} r="1" fill="#ffffff" opacity="0.8" />
		</g>
	);
};

// A Christmas tree on a trunk, with a garland, baubles that twinkle and a star on top.
export const Tree = ({ isMoving }: MovingProps) => (
	<svg viewBox="0 0 100 124" className="h-full">
		<ellipse cx="50" cy="119" rx="30" ry="3.5" fill="#000000" opacity="0.3" />
		<rect x="43" y="98" width="14" height="18" fill="#7a4a24" />
		<rect x="50" y="98" width="7" height="18" fill="#5e3719" />
		<rect x="43" y="98" width="14" height="18" fill="none" stroke={outline} strokeWidth="1.6" />
		{/* The lowest tier first, so each tier above overlaps the one below. */}
		{[...treeTiers].reverse().map((tier) => (
			<TreeTier key={tier.shape} shape={tier.shape} shade={tier.shade} />
		))}
		{/* Needles catching the light on the left of each tier. */}
		<path
			d="M40 30 l3 -2 M34 58 l4 -2 M40 62 l3 -2 M24 90 l4 -2 M32 84 l3 -2 M44 92 l3 -2"
			stroke="#6fd18f"
			strokeWidth="1.4"
			strokeLinecap="round"
		/>
		<path
			d="M33 46 Q 50 56 68 44 M24 78 Q 50 92 77 76"
			fill="none"
			stroke="#ffd23f"
			strokeWidth="2.2"
			strokeLinecap="round"
		/>
		{baubles.map((bauble, place) => (
			<Bauble key={`${bauble.cx} ${bauble.cy}`} place={place} isMoving={isMoving} />
		))}
		<polygon points={treeStar.outline} fill="#ffd23f" />
		<path d={treeStar.shade} fill="#e0a800" />
		<polygon
			points={treeStar.outline}
			fill="none"
			stroke={outline}
			strokeWidth="1.2"
			strokeLinejoin="round"
		/>
	</svg>
);

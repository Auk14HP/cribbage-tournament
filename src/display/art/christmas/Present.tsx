import { outlineColour } from './drawing';

// The present's polka dots: those left of the ribbon on the lit front, those right of it in shade.
const presentDots = [
	{ cx: 22, cy: 46, fill: '#f07a7a' },
	{ cx: 34, cy: 58, fill: '#f07a7a' },
	{ cx: 22, cy: 72, fill: '#f07a7a' },
	{ cx: 66, cy: 48, fill: '#d25555' },
	{ cx: 76, cy: 62, fill: '#d25555' },
	{ cx: 66, cy: 76, fill: '#d25555' },
];

// A box's or the lid's outline, drawn over its colours.
const Outline = ({
	x,
	y,
	width,
	height,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
}) => (
	<rect
		x={x}
		y={y}
		width={width}
		height={height}
		rx="2"
		fill="none"
		stroke={outlineColour}
		strokeWidth="1.8"
	/>
);

// A present in red paper with polka dots, a gold ribbon and a bow, its shadow at its foot.
export const Present = () => (
	<svg viewBox="0 0 100 92" className="h-[80%]">
		<ellipse cx="50" cy="88" rx="42" ry="3" fill="#000000" opacity="0.3" />
		<rect x="12" y="34" width="76" height="50" rx="2" fill="#d64545" />
		<rect x="60" y="34" width="28" height="50" fill="#b83636" />
		{presentDots.map(({ cx, cy, fill }) => (
			<circle key={`${cx} ${cy}`} cx={cx} cy={cy} r="2.6" fill={fill} />
		))}
		{/* The lid's shadow on the box. */}
		<rect x="12" y="38" width="76" height="3" fill="#000000" opacity="0.2" />
		<Outline x={12} y={34} width={76} height={50} />
		<rect x="8" y="24" width="84" height="14" rx="2" fill="#e85a5a" />
		<rect x="60" y="24" width="32" height="14" fill="#c94444" />
		<Outline x={8} y={24} width={84} height={14} />
		<rect x="44" y="24" width="12" height="60" fill="#ffd23f" />
		<rect x="51" y="24" width="5" height="60" fill="#e0b21f" />
		<rect
			x="44"
			y="24"
			width="12"
			height="60"
			fill="none"
			stroke={outlineColour}
			strokeWidth="1.4"
		/>
		{/* The bow: a loop either side of a knot, each loop shaded inside. */}
		<path
			d="M50 24 C 38 6, 20 10, 28 21 C 32 26, 44 26, 50 24 Z"
			fill="#ffd23f"
			stroke={outlineColour}
			strokeWidth="1.4"
		/>
		<path d="M50 24 C 42 15, 31 14, 32 19 C 37 22, 45 23, 50 24 Z" fill="#c99a12" />
		<path
			d="M50 24 C 62 6, 80 10, 72 21 C 68 26, 56 26, 50 24 Z"
			fill="#ffd23f"
			stroke={outlineColour}
			strokeWidth="1.4"
		/>
		<path d="M50 24 C 58 15, 69 14, 68 19 C 63 22, 55 23, 50 24 Z" fill="#c99a12" />
		<ellipse
			cx="50"
			cy="24"
			rx="5.5"
			ry="4.5"
			fill="#e0b21f"
			stroke={outlineColour}
			strokeWidth="1.4"
		/>
		<ellipse cx="48.5" cy="22.5" rx="1.6" ry="1.1" fill="#ffffff" opacity="0.7" />
	</svg>
);

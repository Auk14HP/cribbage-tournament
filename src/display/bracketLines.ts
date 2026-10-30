// A bracket's lines between Matches, and the green of a winner's path along them.
import type { BracketMatch, PlayerId } from '../tournament';

type Side = 'left' | 'right';
type LineShape = 'straight' | 'down' | 'up';
// One Round's Matches, or half of them, in bracket order. A Bye's place in the first Round is undefined.
type RoundMatches = readonly (BracketMatch | undefined)[];
// Whether a Player is still in the bracket: they haven't lost a Match in it.
export type IsStillIn = (player: PlayerId) => boolean;

/*
 * The colours of a winner's path, kept in one place: a Match card's border, and a bracket line on a
 * slot's ::after or ::before. Green is the path a Player still in the bracket took, from each
 * Match they won to the Match they're in now; everything else is grey. Each class is written out whole
 * so Tailwind finds it.
 */
const pathShade = {
	card: { plain: 'border-gray-500', path: 'border-green-400' },
	after: { plain: 'after:border-gray-500', path: 'after:border-green-400' },
	before: { plain: 'before:border-gray-500', path: 'before:border-green-400' },
};

export const getPathShade = (element: keyof typeof pathShade, isPath: boolean) =>
	pathShade[element][isPath ? 'path' : 'plain'];

/*
 * Bracket lines, drawn with CSS on each slot and sized to half the gap between Round columns. They are in
 * vw, not vh, because that gap is 1vw wide: a line sized in vh would fall short of the next column, or
 * run into it, on a TV that isn't 16:9. A Match draws its line out on ::after: across to the gap's middle,
 * then down or up to meet its pair halfway, which is level with the Match they feed. That Match draws the
 * rest on ::before: across from the gap's middle to its own box. The final, fed from both sides, draws its
 * right one on ::after. Both rely on every slot in a column taking an equal share of its height.
 *
 * The pieces each line is built from, written out whole so Tailwind finds every class.
 */
const linePieces = {
	after: {
		base: 'after:absolute after:w-[0.5vw]',
		edge: { left: 'after:-left-[0.5vw]', right: 'after:-right-[0.5vw]' },
		shape: {
			straight: 'after:top-[calc(50%-0.15vh)] after:border-t-[0.3vh]',
			down: 'after:top-[calc(50%-0.15vh)] after:h-[calc(50%+0.15vh)] after:border-t-[0.3vh]',
			up: 'after:top-0 after:h-[calc(50%+0.15vh)] after:border-b-[0.3vh]',
		},
		turn: { left: 'after:border-l-[0.3vh]', right: 'after:border-r-[0.3vh]' },
	},
	before: {
		base: 'before:absolute before:w-[0.5vw]',
		edge: { left: 'before:-left-[0.5vw]', right: 'before:-right-[0.5vw]' },
		shape: {
			straight: 'before:top-[calc(50%-0.15vh)] before:border-t-[0.3vh]',
			down: 'before:top-[calc(50%-0.15vh)] before:h-[calc(50%+0.15vh)] before:border-t-[0.3vh]',
			up: 'before:top-0 before:h-[calc(50%+0.15vh)] before:border-b-[0.3vh]',
		},
		turn: { left: 'before:border-l-[0.3vh]', right: 'before:border-r-[0.3vh]' },
	},
};

// Which pseudo-element of a slot a line is drawn on.
type LineEnd = keyof typeof linePieces;

// One line on a slot's ::after or ::before, sticking out past its left or right edge.
const drawLine = (end: LineEnd, edge: Side, shape: LineShape, isPath: boolean) => {
	const pieces = linePieces[end];
	const turn = shape === 'straight' ? '' : pieces.turn[edge];
	const shade = getPathShade(end, isPath);
	return [pieces.base, pieces.edge[edge], pieces.shape[shape], turn, shade].join(' ');
};

const otherSide = { left: 'right', right: 'left' } as const;

const getHalf = (matches: RoundMatches, side: Side): RoundMatches => {
	const middle = matches.length / 2;
	return side === 'left' ? matches.slice(0, middle) : matches.slice(middle);
};

// A decided Match whose winner hasn't lost since: the path of a Player still in the bracket.
const isWonByPlayerStillIn = (isStillIn: IsStillIn, match: BracketMatch | undefined) =>
	match?.winner !== undefined && isStillIn(match.winner.id);

const isFedByPlayerStillIn = (isStillIn: IsStillIn, feeders: RoundMatches) =>
	feeders.some((match) => isWonByPlayerStillIn(isStillIn, match));

// The line into a Match from the places that feed it on one side. A Match fed only by Byes has none.
const drawLineIn = (isStillIn: IsStillIn, feeders: RoundMatches, side: Side, end: LineEnd) => {
	if (!feeders.some(Boolean)) {
		return '';
	}
	const isPath = isFedByPlayerStillIn(isStillIn, feeders);
	return drawLine(end, side, 'straight', isPath);
};

// A Match, the bracket lines its slot draws, and whether it is on the path of a Player still in.
export interface BracketSlot {
	readonly match: BracketMatch;
	readonly lines: string;
	readonly isOnPath: boolean;
}

/*
 * One half of a Round: each Match with its line out towards the final, and its line in from the two
 * places in the Round before that feed it. A first-Round Match has none feeding it. A Bye's place stays
 * undefined.
 */
export const describeHalf = (
	isStillIn: IsStillIn,
	rounds: readonly RoundMatches[],
	round: number,
	side: Side,
): (BracketSlot | undefined)[] => {
	const half = getHalf(rounds[round], side);
	const earlier = round > 0 ? getHalf(rounds[round - 1], side) : [];
	return half.map((match, place) => {
		if (!match) {
			return undefined;
		}
		const feeders = earlier.slice(2 * place, 2 * place + 2);
		const isPath = isWonByPlayerStillIn(isStillIn, match);
		const pairShape = place % 2 === 0 ? 'down' : 'up';
		const shape = half.length === 1 ? 'straight' : pairShape;
		const lineOut = drawLine('after', otherSide[side], shape, isPath);
		const lineIn = drawLineIn(isStillIn, feeders, side, 'before');
		const isFedByPath = isFedByPlayerStillIn(isStillIn, feeders);
		return { match, lines: `${lineOut} ${lineIn}`, isOnPath: isPath || isFedByPath };
	});
};

// The final, with a line in from each half's last Round. A two-Player bracket's final has none.
export const describeFinal = (
	isStillIn: IsStillIn,
	rounds: readonly RoundMatches[],
): BracketSlot => {
	const match = rounds.at(-1)![0]!;
	const beforeFinal = rounds.at(-2) ?? [];
	const fromLeft = getHalf(beforeFinal, 'left');
	const fromRight = getHalf(beforeFinal, 'right');
	const lineInLeft = drawLineIn(isStillIn, fromLeft, 'left', 'before');
	const lineInRight = drawLineIn(isStillIn, fromRight, 'right', 'after');
	const isPath = isWonByPlayerStillIn(isStillIn, match);
	const isFedByPath =
		isFedByPlayerStillIn(isStillIn, fromLeft) || isFedByPlayerStillIn(isStillIn, fromRight);
	return { match, lines: `${lineInLeft} ${lineInRight}`, isOnPath: isPath || isFedByPath };
};

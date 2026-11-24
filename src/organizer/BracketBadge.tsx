import type { BracketName } from '../tournament';

/*
 * The letter and look of each bracket's badge: the Winners Bracket's a W filled in the theme's yellow, the
 * Losers Bracket's an L outlined, so the two tell apart at a glance by more than their letter.
 */
const badges: Record<BracketName, { letter: string; look: string }> = {
	winners: { letter: 'W', look: 'border-fill bg-fill text-on-fill' },
	losers: { letter: 'L', look: 'border-muted text-ink' },
};

const badgeSizes = {
	large: 'size-6.5 rounded-md text-sm',
	small: 'size-5.5 rounded-md text-xs',
};

/*
 * A small square naming a bracket by its letter, wherever a Match's bracket is shown. Hidden from screen
 * readers, as the bracket's name is always written beside it.
 */
export const BracketBadge = ({
	bracketName,
	size,
}: {
	bracketName: BracketName;
	size: keyof typeof badgeSizes;
}) => {
	const { letter, look } = badges[bracketName];
	return (
		<span
			aria-hidden="true"
			data-testid="bracket badge"
			className={`grid shrink-0 place-items-center border-2 font-extrabold ${badgeSizes[size]} ${look}`}
		>
			{letter}
		</span>
	);
};

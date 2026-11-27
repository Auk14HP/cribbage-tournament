/*
 * Each TV Theme's own Fun Facts, which join the general ones (`funFacts.ts`) while it is the
 * TV Theme. They keep the same ground rules: kind, no he, she, him, her, his or hers,
 * nothing about looks, age, money, relationships or how much anyone drinks, and nothing that
 * reads aloud in a busy bar as a joke at a Player's expense. Each names no Players, one in
 * {A}, or two in {A} and {B}. As many as fit the theme without feeling like a stretch.
 */
import type { TvTheme } from '../tournament';

export const christmasFunFacts: readonly string[] = [
	'Fifteen two, fifteen four, and a partridge in a pear tree.',
	'Santa plays cribbage too. Everyone on the nice list gets dealt a five.',
	'The reindeer tried cribbage once, but the one with the red nose kept lighting up the crib.',
	'Tonight’s Draw has been checked twice, just like a certain list.',
	'Every five in the deck is hoping to be unwrapped in the crib this year.',
	'Snowmen make terrible cribbage players. They melt under pressure.',
	'At the North Pole, a double run is known as a sleigh ride.',
	'Cribbage pegs are the only thing in the house nobody has tried hanging on the tree.',
	'Somewhere, a gingerbread cribbage board is losing a game to a hungry elf.',
	'A perfect 29 hand on Christmas Eve is said to make every tree light in the room twinkle.',
	'Cribbage boards make excellent gifts. They never need batteries.',
	'Tinsel has never once improved a cribbage hand, though it has been tried.',
	'The elves’ cribbage league counts its hands in jingles: fifteen jingle two, fifteen jingle four.',
	'{A} is on the nice list this year, mostly for counting every hand out loud so clearly.',
	'Santa asked {A} for cribbage tips this year. The reindeer are still practicing.',
	'{A} and {B} are leaving a cribbage board out for Santa tonight, just in case.',
];

// Each TV Theme's own Fun Facts: Classic adds none.
export const tvThemeFunFacts: Record<TvTheme, readonly string[]> = {
	classic: [],
	christmas: christmasFunFacts,
};

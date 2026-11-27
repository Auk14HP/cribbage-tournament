/*
 * Which Fun Fact the TV shows next, and the Players it names: the rotation through the Fun Facts
 * (`funFacts.ts`) that the Fun Fact line keeps as it goes.
 */
import type { Player, PlayerId, Random } from '../tournament';

/*
 * The Fun Fact on show and the round of facts it belongs to. A pass uses each fitting fact once
 * before any repeats; a TV reload starts a new one.
 */
export interface FunFactRotation {
	readonly fact: string;
	// The Players filling its slots, {A} first.
	readonly namedPlayerIds: readonly PlayerId[];
	/*
	 * Every fact shown in this pass, the one on show included, the one shown longest ago first. A
	 * fact shown again as a stand-in moves to the end, and doesn't extend the pass.
	 */
	readonly usedThisPass: readonly string[];
	/*
	 * Counts the facts shown, so each one is told apart from the last, even when the same fact
	 * comes back.
	 */
	readonly turn: number;
}

/*
 * Returns the next Fun Fact from the facts given, or the first when nothing is on show yet. A fact
 * fits when enough Players are registered to fill its slots, and can be shown next when its slots
 * can be filled leaving out every Player the fact on show names, so nobody is named twice in a row.
 * The next is chosen at random from the facts not yet used this pass that can be shown next, and
 * its names at random from the Players it may name. When the only unused facts this pass can't be
 * shown next, as can happen with one or two Players, a fact already used stands in for one turn and
 * the pass goes on: the one shown longest ago, naming nobody if one can, so the turn after can show
 * an unused fact. Once every fitting fact is used, a new pass begins, starting with any fact but
 * the one on show.
 */
export const chooseNextFunFact = ({
	shown,
	players,
	facts,
	random,
}: {
	shown: FunFactRotation | undefined;
	players: readonly Player[];
	facts: readonly string[];
	random: Random;
}): FunFactRotation => {
	const namedBefore = shown?.namedPlayerIds ?? [];
	const namable = players.filter((p) => !namedBefore.includes(p.id));
	const canShowNext = (fact: string) => hasEnoughPlayers(fact, namable) && fact !== shown?.fact;
	const usedBefore = shown?.usedThisPass ?? [];
	const unused = facts.filter(
		(fact) => hasEnoughPlayers(fact, players) && !usedBefore.includes(fact),
	);
	const unusedShowable = unused.filter(canShowNext);
	const usedShowable = usedBefore.filter(canShowNext);
	const usedNameless = usedShowable.filter((fact) => countNameSlots(fact) === 0);
	let fact: string;
	let usedThisPass: readonly string[];
	if (unusedShowable.length > 0) {
		fact = pickOne(unusedShowable, random);
		usedThisPass = [...usedBefore, fact];
	} else if (unused.length > 0 && usedShowable.length > 0) {
		[fact] = usedNameless.length > 0 ? usedNameless : usedShowable;
		usedThisPass = [...usedBefore.filter((f) => f !== fact), fact];
	} else {
		fact = pickOne(facts.filter(canShowNext), random);
		usedThisPass = [fact];
	}
	const namedPlayers = pickSome(namable, countNameSlots(fact), random);
	return {
		fact,
		namedPlayerIds: namedPlayers.map((p) => p.id),
		usedThisPass,
		turn: (shown?.turn ?? 0) + 1,
	};
};

/*
 * The line on show, its slots filled with the named Players' current names, so a rename shows at
 * once.
 */
export const fillFunFact = (rotation: FunFactRotation, players: readonly Player[]): string => {
	const [nameA, nameB] = rotation.namedPlayerIds.map(
		(id) => players.find((p) => p.id === id)?.name ?? '',
	);
	return rotation.fact.replaceAll('{A}', nameA).replaceAll('{B}', nameB);
};

// Whether a Player the fact on show names is no longer registered.
export const hasRemovedPlayer = (rotation: FunFactRotation, players: readonly Player[]): boolean =>
	rotation.namedPlayerIds.some((id) => !players.some((p) => p.id === id));

// Whether there are enough of the given Players to fill a fact's slots.
const hasEnoughPlayers = (fact: string, players: readonly Player[]): boolean =>
	countNameSlots(fact) <= players.length;

// How many Players a fact names: none, {A} alone, or {A} and {B}.
const countNameSlots = (fact: string): number => {
	if (fact.includes('{B}')) {
		return 2;
	}
	return fact.includes('{A}') ? 1 : 0;
};

const pickOne = <T>(items: readonly T[], random: Random): T => {
	const [item] = pickSome(items, 1, random);
	return item;
};

// Picks count different items at random, in the order picked.
const pickSome = <T>(items: readonly T[], count: number, random: Random): T[] => {
	const left = [...items];
	const picked = [];
	for (let i = 0; i < count; i++) {
		const [item] = left.splice(Math.floor(random() * left.length), 1);
		picked.push(item);
	}
	return picked;
};

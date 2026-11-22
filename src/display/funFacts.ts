/*
 * The Fun Facts the TV rotates along the bottom of Tonight’s Players during registration: light-hearted,
 * mostly made up, with a few true facts about cribbage. Each names no Players, one in {A}, or two in {A} and
 * {B}, filled with registered Players' names. Every line keeps to the ground rules: kind, a made-up one
 * clearly made up, no he, she, him, her, his or hers, nothing about looks, age, money, relationships or how
 * much anyone drinks, and nothing that reads aloud in a busy bar as a joke at a Player's expense.
 */
import type { Player, PlayerId, Random } from '../tournament';

export const funFacts: readonly string[] = [
	// No names, so the line works before anyone registers.
	'Cribbage is the only game where “fifteen two, fifteen four” counts as small talk.',
	'9 out of 10 cribbage boards would rather be here tonight. The tenth is a chessboard in disguise.',
	'A perfect 29 hand is so rare that everyone who has seen one is still telling the story.',
	'The cards in tonight’s decks have 52 faces between them and zero opinions.',
	'Cribbage players never get bored. They just get boards.',
	'The jack of the turn-up suit is called nobs. Nobody knows why, and nobs isn’t telling.',
	'In cribbage, “go” means you can’t play. Cribbage players are very confused at traffic lights.',
	'There’s no 19 hand, so cribbage players say 19 when they mean zero. It’s a cover-up.',
	'The crib is the only place where people throw cards away and still expect points for them.',
	'It’s called the crib because that’s where cards go for a little rest.',
	'The skunk line exists so even losing gets a dramatic finish.',
	'The fives in every deck have formed a union. Their only demand: to be kept.',
	'Scientists taught a computer to play cribbage. It now refuses to discard its fives.',
	'The number fifteen has worked on cribbage boards for 400 years and has asked for a day off.',
	'A double double run is worth 16 points and roughly three minutes of counting out loud.',
	'The muggins rule was dropped in this room after an incident nobody will discuss.',
	'Tonight’s Draw will be made by a computer. It’s very nervous. It has never even held a card.',
	'The cut card is the only card in the deck that gets a dramatic entrance.',
	'Every cribbage board secretly races the others when nobody is looking.',
	'Cribbage is excellent exercise. Every game has at least one run.',
	'The ace is the lowest card in cribbage, and it is handling it with remarkable grace.',
	'Kings count as ten in cribbage. The kings have been told this is “an honor.”',
	'If cards could talk, the five of hearts would never stop.',
	'Fifteen two, fifteen four, and a pair is six. Nobody has ever said it without a little pride.',
	'Cribbage was a favorite on submarines, which is why its players stay so calm under pressure.',
	'Card players never get lost. They always follow suit.',
	'The deck was nervous about tonight, but it pulled itself together after a good shuffle.',
	'The longest cribbage game on record ended when both players agreed to just call it fifteen two.',
	'Somewhere in this room, a five is waiting for its big moment.',
	'Every deck has two red jacks and two black jacks, and they have agreed to disagree.',
	'The first cribbage board was a plank of wood and a tremendous amount of optimism.',
	'Tonight’s cards are fully shuffled, lightly cut and ready to be dealt with.',
	'This brewery has never made a bad batch of cards, mostly because it only makes beer.',
	'No cribbage board has ever lost an argument. It just quietly keeps count.',
	'Nobody in history has finished counting a hand and thought, “I definitely did that right.”',
	'The queens are still annoyed that a jack gets a point just for showing up.',
	'A flush in the crib only counts if all five cards match, which makes it the fussiest rule in cards.',
	'The board has 121 points on it and has never once been asked how it feels about that.',
	'Every deck tonight has been told to behave. The jokers were left at home for that reason.',
	'Cribbage is the only game where saying “go” makes everybody stop.',
	'A cribbage board is a very small racetrack where everyone takes turns winning.',
	'Legend says the first 29 hand was dealt on a Tuesday, and the dealer is still telling people.',
	'The tens and the face cards meet every Thursday to argue about who really counts as ten.',
	'The brewery’s tanks are said to bubble a little faster whenever someone counts a double run.',
	'Cribbage has been played for nearly 400 years and still nobody agrees on how to pronounce “muggins.”',
	'A run of three is just three cards who happen to get along.',
	'The starter card is called the starter because “the surprise” was already taken.',
	'Cribbage is like brewing: it’s all about the right mix, a little patience and a good count.',
	'The skunk line is painted on every board, just in case anyone gets too comfortable.',
	'Every crib is a mystery gift. Sometimes it’s 12 points. Sometimes it’s socks.',
	'In 400 years of cribbage, the number 31 has never once been allowed to go any higher.',
	'Cards prefer being shuffled to being dealt, but they understand it’s part of the job.',
	'The deck in your hand tonight has traveled farther than most people, mostly in a drawer.',
	'Cribbage boards don’t have favorites. They just keep very close track of everyone.',

	// True, with no names: real facts about cribbage can be fun too.
	'Cribbage was invented around 1630 by the English poet Sir John Suckling, from an older game called noddy.',
	'The highest hand in cribbage is 29: three fives and the jack of the turn-up’s suit, with the fourth five cut.',
	'The odds of being dealt a 29 hand are about 1 in 216,580.',
	'No cribbage hand can score 19, 25, 26 or 27 points.',
	'Hold four fives and cut any ten, jack, queen or king, and the hand scores 28.',
	'Four of a kind in the play, a double pair royal, pegs 12 points.',
	'Win before your opponent reaches 91 and it’s a skunk, often counted as two games.',
	'A cribbage board from the World War II submarine USS Wahoo is kept on the oldest submarine in the US Pacific Fleet.',

	// One name.
	'{A} has never once lost an argument with a cribbage board.',
	'{A} once counted a hand so fast the board filed a complaint.',
	'{A} has been asked to leave a bingo hall for shouting “fifteen two” out of habit.',
	'{A} shuffles a deck so thoroughly the cards need a moment to catch their breath.',
	'{A} once had a 29 hand, but it was in a dream, so it only counts for luck.',
	'{A} doesn’t count to fifteen. Fifteen counts to {A}.',
	'{A} once said “go” so confidently that three other tables stopped playing.',
	'Every card in tonight’s decks has asked to be dealt to {A}.',
	'{A} has a lucky deck, a lucky chair and a backup lucky chair.',
	'{A} once cut a jack so dramatically that the turn-up got a round of applause.',
	'{A} is a cut above the rest. Literally. Ask about the jack.',
	'{A} taught a parrot to say “fifteen two.” The parrot now beats most people.',
	'{A} can guess what’s in the crib from how quietly the dealer is humming.',
	'{A} reads the cribbage rulebook for fun and has opinions about the footnotes.',
	'{A} once played so well the board asked for an autograph.',
	'{A}’s favorite number is fifteen. Second favorite: fifteen two.',
	'{A} invented a new way to shuffle. It’s mostly confidence, but it works.',
	'Rumor has it {A} can hear a run of three from across the room.',
	'{A} keeps a spare deck in every coat, car and kitchen drawer, just in case.',
	'{A} once explained cribbage to a tourist, who stayed six hours and missed the bus home.',
	'{A} has a theory about the crib that takes forty minutes to explain and is never wrong.',
	'{A} once won a game by candlelight during a power cut, on the very last flicker.',
	'{A} once held a double double run and had to sit down for a minute.',
	'{A} is so good at cribbage the deck shuffles itself out of respect.',
	'{A} doesn’t play cards. {A} deals with them.',
	'{A} has been practicing a very humble “oh, just a twenty-four” all week.',
	'{A} once found a fifteen in a phone number and counted it before dialing.',
	'{A} named a houseplant Muggins. It has never missed a point.',
	'{A} keeps a notebook of every 29 hand ever seen. It’s empty, but beautifully organized.',
	'{A}’s motto: “When in doubt, keep the fives. When not in doubt, also keep the fives.”',
	'{A} once dealt so smoothly the cards wrote a thank-you note.',
	'{A} taught a dog to cut the deck. The dog now refuses to cut for anyone else.',
	'{A} came tonight with a plan, a backup plan and a lucky sock.',
	'If cribbage were an Olympic sport, {A} would already have the podium speech written.',
	'{A} has the calm, steady focus of someone who has definitely kept both fives.',
	'{A} once played a whole game without saying “go.” Scientists are still baffled.',
	'{A} learned cribbage from a lighthouse keeper, and has been shining at it ever since.',
	'{A} can say “fifteen two, fifteen four” in five languages and three accents.',
	'{A} built a cribbage board from a fallen branch. The tree says it’s honored.',
	'{A} has never miscounted a crib and has no plans to start tonight.',
	'{A} once got a 24 hand and had it framed.',
	'{A} carries a lucky five of clubs everywhere, including to the dentist.',
	'{A} is hoppy to be here tonight. The brewery insisted on that pun.',
	'{A} counts so well that the brewery has asked for help with the inventory.',
	'{A} once won a hand with nothing but a jack and a good attitude.',
	'{A} has been training for tonight by counting everything: stairs, peas, clouds.',
	'The jacks in tonight’s decks have all asked for {A}’s autograph.',
	'{A} doesn’t believe in luck. {A} believes in fives.',
	'{A} once played cribbage on a train and arrived two games ahead of schedule.',
	'{A} has a cribbage strategy so secret that even {A} only gets to see it on Tuesdays.',
	'{A} once shuffled so fast it caused a light breeze at the next table.',
	'{A} counts out loud with the confidence of a sports announcer.',
	'{A} can feel a turn-up jack coming the way some people feel rain.',
	'{A} once played cribbage in a canoe and kept every card dry.',
	'{A} once untangled a double double run faster than anyone could find a calculator.',
	'{A} is a real card. The good kind.',
	'{A} always knows the score, mostly from counting since lunchtime.',
	'{A} has politely turned down three invitations to join a traveling cribbage circus.',
	'{A}’s cribbage board has its own carrying case and, reportedly, a nickname.',
	'The deck has been told to be on its best behavior around {A}.',
	'{A} could count a crib in the dark, and has, twice.',
	'{A} has never met a fifteen they didn’t like.',
	'{A} once cut a perfect card and has stayed humble about it ever since. Mostly.',
	'{A} still talks about the time the turn-up was a five, and honestly, fair enough.',
	'{A} has read every cribbage rule, including the tiny print on the box.',
	'{A} is personally responsible for at least one deck being retired with honors.',
	'{A} brought a lucky charm tonight but won’t say what it is. The deck has guesses.',
	'Weather forecasters call {A} to find out if it’s a good night for cribbage.',
	'{A} once counted a crib in a whisper so the cards wouldn’t get big-headed.',
	'{A} is so good at discarding that the crib sends a thank-you card.',

	// Two names.
	'{A} and {B} have been named tonight’s official keepers of the number fifteen.',
	'If {A} and {B} meet tonight, the board has asked them both to go easy on it.',
	'{A} and {B} together know every cribbage rule. Neither will say which half.',
	'Experts predict a game between {A} and {B} would be counted in record time.',
	'{A} once challenged {B} to a counting race. The board is still deciding.',
	'{A} says {B} shuffles like a professional magician. {B} says it’s just practice.',
	'{A} and {B} hold the unofficial record for the longest “go” debate.',
	'{A} and {B} both predict the first turn-up tonight will be a five. One of them is bluffing.',
	'Somewhere tonight, {A} will say “fifteen two” and {B} will say “and a pair is four.”',
	'{A} and {B} would make an excellent cribbage commentary team.',
	'If {A} plays {B} tonight, it will be the most polite game of cribbage ever recorded.',
	'{A} and {B} have been training for tonight by counting fence posts.',
	'{A} and {B} are tied for the title of Most Likely to Keep the Fives.',
	'{A} and {B} have each promised to deal fairly tonight. The deck is holding them to it.',
	'{A} and {B} both claim to have invented the phrase “fifteen two.” The case is pending.',
	'{A} could explain the crib to {B} using only hand signals, and might.',
	'Sources close to the board say {A} and {B} are the ones to watch tonight.',
	'If {A} plays {B} tonight, the turn-up card has asked for a front-row seat.',
	'{A} and {B} are co-presidents of the Keep Your Fives Society. Meetings are short.',
	'{A} thinks {B} has the best shuffle in the room. The deck agrees.',
	'{A} and {B} have each been given one red jack for luck. The black jacks are sulking.',
	'{A} and {B} are tonight’s front-runners. Also back-runners. Also double-runners.',
	'A game between {A} and {B} would be so close the board would need a nap afterward.',
	'{A} and {B} both keep a pocket cribbage board for emergencies. Tonight counts.',
	'{A} and {B} agree that fives are the best cards, and disagree about everything else.',
	'Experts agree {A} and {B} are 100% likely to say “go” at least once tonight.',
	'{A} and {B} were overheard whispering to the deck. The deck isn’t talking.',
	'{A} and {B} can count a double double run faster than anyone can say “double double run.”',
	'The cribbage boards have asked that {A} and {B} not both be brilliant at the same table.',
	'{A} and {B} have agreed that whoever loses between them applauds the winner.',
	'If {A} and {B} ever cut the same card, the deck has agreed to call it a tie.',
	'{A} is quietly confident. {B} is loudly confident. The deck is just happy to be here.',
	'{A} and {B} have been asked to count slowly tonight, so the rest of us can keep up.',
];

/*
 * The Fun Fact on show and the round of facts it belongs to. A pass uses each fitting fact once before any
 * repeats; a TV reload starts a new one.
 */
export interface FunFactRotation {
	readonly fact: string;
	// The Players filling its slots, {A} first.
	readonly namedPlayerIds: readonly PlayerId[];
	/*
	 * Every fact shown in this pass, the one on show included, the one shown longest ago first. A fact shown
	 * again as a stand-in moves to the end, and doesn't extend the pass.
	 */
	readonly usedThisPass: readonly string[];
	// Counts the facts shown, so each one is told apart from the last, even when the same fact comes back.
	readonly turn: number;
}

/*
 * Returns the next Fun Fact, or the first when nothing is on show yet. A fact fits when enough Players are
 * registered to fill its slots, and can be shown next when its slots can be filled leaving out every Player the
 * fact on show names, so nobody is named twice in a row. The next is chosen at random from the facts not yet
 * used this pass that can be shown next, and its names at random from the Players it may name. When the only
 * unused facts this pass can't be shown next, as can happen with one or two Players, a fact already used
 * stands in for one turn and the pass goes on: the one shown longest ago, naming nobody if one can, so the
 * turn after can show an unused fact. Once every fitting fact is used, a new pass begins, starting with any
 * fact but the one on show.
 */
export const chooseNextFunFact = (
	shown: FunFactRotation | undefined,
	players: readonly Player[],
	random: Random,
): FunFactRotation => {
	const namedBefore = shown?.namedPlayerIds ?? [];
	const namable = players.filter((p) => !namedBefore.includes(p.id));
	const canShowNext = (fact: string) => hasEnoughPlayers(fact, namable) && fact !== shown?.fact;
	const usedBefore = shown?.usedThisPass ?? [];
	const unused = funFacts.filter(
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
		fact = pickOne(funFacts.filter(canShowNext), random);
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

// The line on show, its slots filled with the named Players' current names, so a rename shows at once.
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

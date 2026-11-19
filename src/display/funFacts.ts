/*
 * The Fun Facts the TV rotates along the bottom of the Players screen during registration: made up and
 * light-hearted. Each names no Players, one in {A}, or two in {A} and {B}, filled with registered Players'
 * names. Every line keeps to the ground rules: clearly made up and kind, no he, she, him, her, his or hers,
 * nothing about looks, age, money, relationships or how much anyone drinks, and nothing that reads aloud
 * in a busy bar as a joke at a Player's expense.
 */
import type { Player, PlayerId, Random } from '../tournament';

export const funFacts: readonly string[] = [
	// No names, so the line works before anyone registers.
	'The first cribbage board was carved by someone who lost an argument about counting.',
	'A perfect 29 hand is so rare that most decks have never seen one.',
	'Cribbage was invented so card players would have something to count besides sheep.',
	'Every deck of cards secretly hopes to be shuffled at a cribbage tournament.',
	'A cribbage board has never once lost track of the score.',
	'Scientists agree that counting “fifteen two, fifteen four” is good for the soul.',
	'The number 31 has asked to be left alone after tonight.',
	'The crib has never once complained about the cards it’s given.',
	'The deck is cut before every deal because the cards like a little suspense.',
	'A cribbage board is the only racetrack where the slow lane is just as fun.',
	'Fifteen is everyone’s favorite number at a cribbage table, and nobody can say why.',
	'The cards in tonight’s decks have been practicing their shuffles all week.',
	'Somewhere, a five of hearts is hoping to be the turn-up tonight.',
	'The skunk line was painted on the board by a very competitive squirrel.',
	'A double run is just a run that brought a friend.',
	'The word “muggins” was invented by someone who missed a lot of points.',
	'Every cribbage board dreams of hosting a 29 hand.',
	'The jack has never forgiven the queen for being one card higher.',
	'Tonight’s Draw is made by a computer that has never played cribbage and is very nervous about it.',
	'In cribbage, “go” means stop, and nobody has ever questioned it.',
	'The kings have formed a club, and only face cards may join.',
	'A pair royal is just three cards being polite to one another.',
	'The cut card is chosen by fate, and fate is a big cribbage fan.',
	'No two cribbage hands are alike, except when they are.',
	'The ace is worth one point, and it is completely fine with that.',
	'The tens and the face cards meet every night to agree who counts as ten.',
	'A cribbage board can tell when someone is about to count a hand wrong.',
	'Cards shuffle better in a brewery. Science hasn’t checked, but everyone agrees.',
	'The first rule of cribbage club is: count it out loud.',
	'Somewhere, a cribbage board is still holding a grudge about a missed point.',
	'The dealer’s crib is like a mystery gift that sometimes turns out to be socks.',
	'Every deck tonight has been told to behave.',
	'A 19 hand is a cribbage player’s way of saying “nothing to see here.”',
	'Tonight’s cribbage boards have been dusted, polished and given a pep talk.',
	'Cribbage is nearly 400 years old and still hasn’t lost its sense of humor.',
	'The starter card is called the starter because “the surprise” was taken.',
	'A run of five is just a run of four that kept going.',
	'Good cribbage players count fast. Great ones count out loud and take their time.',
	'Cribbage was once a favorite of sailors, who were all at sea about the rules.',
	'The cards prefer being shuffled to being dealt, but they understand.',
	'The skunk line is the board’s way of keeping everyone humble.',
	'Legend says the very first fifteen was counted by accident.',
	'Nobody has ever finished a game of cribbage and said “that was too much counting.”',
	'A cribbage board is just a scoreboard with better manners.',
	'The brewery’s tanks hum along to the sound of shuffling cards.',
	'Tonight’s bracket was drawn without a single coffee stain.',
	'Every five in the deck thinks it’s the most important card at the table. It’s right.',
	'The Organizer has counted to 121 more times than anyone should.',
	'Cribbage boards are made of wood because the cards asked for a natural venue.',
	'The four suits once held a vote on the best card game. Cribbage won, four to nothing.',
	'A cribbage board’s favorite sound is a deck being shuffled across the room.',
	'The joker was left out of cribbage, and has been sulking in the box ever since.',
	'Fifteen two, fifteen four, and the rest is a beautiful mystery.',
	'Every cribbage table tonight has been checked for lucky charms. Several were found.',
	'The fives in tonight’s decks have been warming up since lunchtime.',
	'Cribbage is the only game where saying “go” makes everyone wait.',

	// One name.
	'{A} has never once lost an argument with a cribbage board.',
	'{A} can shuffle a deck so well the cards forget their own order.',
	'{A} once counted a hand so fast the board asked for a recount.',
	'{A} has a lucky deck of cards that is, sadly, at home tonight.',
	'{A} believes every hand has a 29 hiding in it somewhere.',
	'{A} counts “fifteen two” in their sleep.',
	'The cards tonight have been warned about {A}.',
	'{A} once cut a jack three games in a row and still talks about it.',
	'{A} taught a parrot to say “fifteen two.” The parrot now plays online.',
	'{A} shuffles so fast the deck has to catch its breath.',
	'{A} once found a run of five and celebrated for a week.',
	'{A} holds the unofficial record for the most polite “go.”',
	'Rumor has it {A} can hear a fifteen before it’s played.',
	'{A} keeps a spare deck in every coat pocket, just in case.',
	'{A} once played a whole game without saying “go.” Nobody knows how.',
	'The crib has been looking forward to meeting {A} all week.',
	'{A} invented a new way to shuffle. It’s mostly enthusiasm.',
	'{A} has read the rules of cribbage cover to cover, twice, for fun.',
	'{A} once dealt so smoothly the cards applauded.',
	'{A}’s favorite number is fifteen, and it isn’t close.',
	'{A} is rumored to have a sixth sense for the turn-up card.',
	'{A} once taught a whole campsite to play cribbage by flashlight.',
	'{A} counts so clearly that the board just nods along.',
	'{A} brought luck tonight, and promises to share some.',
	'{A} has never met a double run they didn’t like.',
	'{A} can spot a five from across the room.',
	'The skunk line has never once caught up with {A}.',
	'{A} once played cribbage in a canoe and didn’t lose a single card.',
	'{A} has been practicing a “fifteen two” voice all week.',
	'{A} once kept score with nothing but buttons and an egg carton.',
	'{A} named a houseplant Muggins, and it has never missed a point.',
	'Legend says {A} once turned up a jack twice in one game.',
	'{A} is the only person the deck trusts to shuffle it.',
	'{A} says the secret to cribbage is “count first, celebrate second.”',
	'{A} once explained cribbage to a tourist, who stayed for six hours.',
	'The cards have nicknamed {A} “the Professor.”',
	'{A} once got a 24 hand and had it framed.',
	'{A} has a theory about the crib that takes forty minutes to explain.',
	'{A} once played a game of cribbage during a power cut, by candlelight.',
	'{A} carries a lucky five of clubs everywhere.',
	'{A} claims to have invented the phrase “fifteen two.” Nobody can prove otherwise.',
	'{A} once found a fifteen in a phone number and counted it out of habit.',
	'{A} is on first-name terms with every jack in the deck.',
	'{A} once untangled a double double run in under three seconds.',
	'If cribbage were an Olympic sport, {A} would carry the flag.',
	'{A} keeps a pocket cribbage board for emergencies.',
	'{A} once played cribbage on a train and arrived two games ahead.',
	'{A}’s shuffling has been described as “poetry with cards.”',
	'{A} gives every deck a friendly wave before the first deal.',
	'{A} believes the crib is a gift and treats it with respect.',
	'{A} once counted to 121 in under a minute, just to practice.',
	'{A} learned cribbage from a lighthouse keeper on a foggy night.',
	'{A} can say “fifteen two, fifteen four” in five languages.',
	'The jacks in tonight’s decks have all asked for {A}’s autograph.',
	'{A} once played a perfect game, according to {A}.',
	'{A} once taught a dog to cut the deck. The dog cuts a mean jack.',
	'{A} came tonight with a plan, a backup plan, and a lucky sock.',
	'{A} keeps a notebook of every 29 hand ever seen. It’s empty, but hopeful.',
	'{A} brought good vibes and an excellent shuffle.',
	'{A}’s motto: “When in doubt, keep the fives.”',
	'{A} once dealt a hand so fair the cards wrote a thank-you note.',
	'The Organizer typed {A}’s name with extra care tonight.',
	'{A} once built a cribbage board out of a fallen tree branch.',
	'{A} has never miscounted a crib, and never plans to start.',
	'{A} has a victory dance ready for 121, and it’s very tasteful.',
	'{A} once won a hand with nothing but a smile. The smile was worth two.',
	'{A} once counted a hand in a whisper so the cards wouldn’t get big-headed.',
	'Weather forecasters call {A} before every cribbage night.',
	'{A} once played cribbage at the top of a mountain, and the view was worth two.',
	'{A} cuts the deck with the confidence of a world-class chef.',
	'The deck sat up straighter when {A} walked in.',

	// Two names.
	'{A} and {B} once played a game of cribbage that lasted three days. Nobody remembers who won.',
	'{A} taught {B} the secret handshake of cribbage. It’s mostly counting.',
	'{A} and {B} have agreed to be gracious about whoever wins tonight.',
	'{A} once lent {B} a lucky deck and is still waiting to get it back.',
	'{A} and {B} once counted the same hand and got two different answers. Both were wrong.',
	'{A} says {B} shuffles like a professional magician.',
	'{B} has been practicing all week to beat {A} at cribbage.',
	'{A} and {B} once played cribbage on a ferry, and both claim they won.',
	'{A} once challenged {B} to a counting race. The board is still deciding.',
	'{A} and {B} have a friendly rivalry over a disputed fifteen from years ago.',
	'{A} and {B} invented a new cribbage rule. Nobody else is allowed to know it.',
	'{A} once cut a jack, and {B} has been asking for lessons ever since.',
	'{A} thinks {B} is the best counter in the room. {B} agrees.',
	'{A} and {B} once tied a game of cribbage, which is impossible, and yet.',
	'{A} and {B} have been training for tonight by counting fence posts.',
	'{B} once lent {A} a cribbage board and got it back on a lucky streak.',
	'{A} and {B} hold the unofficial record for the longest “go” debate.',
	'{A} taught {B} to shuffle, and {B} taught {A} to count. Teamwork.',
	'{A} and {B} once found a run of five together and high-fived for a full minute.',
	'{A} told {B} tonight would be fun. {A} was right.',
	'{A} once explained the crib to {B} using only hand signals.',
	'{A} and {B} once argued for an hour about whether a 19 hand exists. It doesn’t.',
	'{A} and {B} once counted to 121 together, just to hear how it sounds.',
	'{B} has a lucky deck, and {A} has a lucky shuffle. Watch out.',
	'{A} once forgot to count the crib, and {B} still mentions it, kindly.',
	'{A} and {B} agreed the loser gives the winner a round of applause.',
	'{A} and {B} started a cribbage club with two members and three boards.',
	'{A} and {B} once played cribbage by phone, describing every card.',
	'{B} keeps a tally of every time {A} has said “fifteen two.” It’s long.',
	'{A} challenged {B} to a game of cribbage at dawn. They both slept in.',
	'{A} and {B} once shuffled the same deck at the same time. It took a while.',
	'{A} bakes cookies shaped like cards, and {B} counts them before eating.',
	'{A} and {B} agree that fives are the best cards, and argue about everything else.',
];

/*
 * The Fun Fact on show and the round of facts it belongs to. A pass uses each fitting fact once before any
 * repeats; a TV reload starts a new one.
 */
export interface FunFactRotation {
	readonly fact: string;
	// The Players filling its slots, {A} first.
	readonly namedPlayerIds: readonly PlayerId[];
	// Every fact shown in this pass, the one on show included.
	readonly usedThisPass: readonly string[];
	// Counts the facts shown, so each one is told apart from the last, even when the same fact comes back.
	readonly turn: number;
}

/*
 * Returns the next Fun Fact, or the first when nothing is on show yet. It is chosen at random from the facts
 * not yet used this pass that fit: enough Players registered to fill its slots, leaving out every Player the
 * fact on show names, so nobody is named twice in a row. Its names are picked at random from those Players.
 * Once no fitting fact is left, a new pass begins, starting with any fact but the one on show.
 */
export const chooseNextFunFact = (
	shown: FunFactRotation | undefined,
	players: readonly Player[],
	random: Random,
): FunFactRotation => {
	const namedBefore = shown?.namedPlayerIds ?? [];
	const namable = players.filter((p) => !namedBefore.includes(p.id));
	const fitting = funFacts.filter(
		(fact) => countNameSlots(fact) <= namable.length && fact !== shown?.fact,
	);
	const usedBefore = shown?.usedThisPass ?? [];
	const unused = fitting.filter((fact) => !usedBefore.includes(fact));
	const isNewPass = unused.length === 0;
	const fact = pickOne(isNewPass ? fitting : unused, random);
	const named = pickSome(namable, countNameSlots(fact), random);
	return {
		fact,
		namedPlayerIds: named.map((p) => p.id),
		usedThisPass: isNewPass ? [fact] : [...usedBefore, fact],
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

// How many Players a fact names: none, {A} alone, or {A} and {B}.
const countNameSlots = (fact: string): number => {
	if (fact.includes('{B}')) {
		return 2;
	}
	return fact.includes('{A}') ? 1 : 0;
};

const pickOne = <T>(items: readonly T[], random: Random): T =>
	items[Math.floor(random() * items.length)];

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

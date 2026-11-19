/*
 * A line showing a new Fun Fact every 12 seconds, fading in and out, chosen by chooseNextFunFact. Which facts
 * this pass has used is the line's own state, so a reload starts a new pass. A fact naming a Player who is
 * removed is replaced at once; one naming a Player who is renamed shows the new name at once.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { Player, Random } from '../tournament';
import { chooseNextFunFact, fillFunFact, hasRemovedPlayer } from './funFacts';

// Fixed, apart from the seconds per TV screen: long enough to read and laugh before the next one.
const funFactSeconds = 12;

export const FunFactLine = ({
	players,
	random,
}: {
	players: readonly Player[];
	random: Random;
}) => {
	const [funFactOnShow, setFunFactOnShow] = useState(() =>
		chooseNextFunFact(undefined, players, random),
	);
	const [isNextDue, setIsNextDue] = useState(false);
	/*
	 * Chosen while rendering, with the Players registered now, when the fact's time is up or it names a
	 * removed Player. Choosing a fact restarts its time.
	 */
	let nextFunFact = funFactOnShow;
	if (isNextDue || hasRemovedPlayer(funFactOnShow, players)) {
		nextFunFact = chooseNextFunFact(funFactOnShow, players, random);
		setFunFactOnShow(nextFunFact);
		setIsNextDue(false);
	}
	useEffect(() => {
		const timer = setTimeout(() => setIsNextDue(true), funFactSeconds * 1000);
		return () => clearTimeout(timer);
	}, [funFactOnShow]);
	// Keyed by its turn, so each fact starts its fade afresh. The duration reaches the animation through a CSS variable.
	return (
		<p
			key={nextFunFact.turn}
			style={{ '--fun-fact-duration': `${funFactSeconds}s` } as CSSProperties}
			className="animate-fun-fact mt-[1.5vh] min-h-[8.4vh] text-[3.5vh] leading-[1.2] text-balance text-gray-200"
		>
			{`Fun fact: ${fillFunFact(nextFunFact, players)}`}
		</p>
	);
};

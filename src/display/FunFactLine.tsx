/*
 * A line showing a new Fun Fact every 12 seconds, fading in and out, chosen by
 * chooseNextFunFact. Which facts this pass has used is the line's own state, so a reload
 * starts a new pass. A fact naming a Player who is removed is replaced at once; one naming
 * a Player who is renamed shows the new name at once. The facts are the general ones and
 * the TV Theme's own, so a new TV Theme's facts join the mix from the next fact on.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { Player, Random } from '../tournament';
import { chooseNextFunFact, fillFunFact, hasRemovedPlayer } from './funFactRotation';
import { listFunFacts } from './funFacts';
import { useTvTheme } from './tvThemeContext';

// Fixed, apart from the seconds per TV screen: long enough to read and laugh before the next one.
const funFactSeconds = 12;

export const FunFactLine = ({
	players,
	random,
}: {
	players: readonly Player[];
	random: Random;
}) => {
	const { tvTheme } = useTvTheme();
	const facts = listFunFacts(tvTheme);
	const [funFactOnShow, setFunFactOnShow] = useState(() =>
		chooseNextFunFact({ shown: undefined, players, facts, random }),
	);
	const [isNextDue, setIsNextDue] = useState(false);
	/*
	 * Chosen while rendering, with the Players registered now, when the fact's
	 * time is up or it names a removed Player. Choosing a fact restarts its time.
	 */
	let funFactToShow = funFactOnShow;
	if (isNextDue || hasRemovedPlayer(funFactOnShow, players)) {
		funFactToShow = chooseNextFunFact({ shown: funFactOnShow, players, facts, random });
		setFunFactOnShow(funFactToShow);
		setIsNextDue(false);
	}
	useEffect(() => {
		const timer = setTimeout(() => setIsNextDue(true), funFactSeconds * 1000);
		return () => clearTimeout(timer);
	}, [funFactOnShow]);
	/*
	 * Keyed by its turn, so each fact starts its fade afresh.
	 * The duration reaches the animation through a CSS variable.
	 */
	return (
		<p
			key={funFactToShow.turn}
			style={{ '--fun-fact-duration': `${funFactSeconds}s` } as CSSProperties}
			className="animate-fun-fact text-tv-fun-fact mt-[1.5cqh] min-h-[8.4cqh] text-[3.5cqh] leading-[1.2] text-balance"
		>
			{`Fun fact: ${fillFunFact(funFactToShow, players)}`}
		</p>
	);
};

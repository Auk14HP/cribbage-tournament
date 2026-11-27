/*
 * The TV screen on show, drawn wherever it is wanted: on the TV itself and as the
 * Organizer's thumbnail of it. Sizes are in cqh and cqw, hundredths of the TV screen's frame
 * (a box with `tvFrame`), so the screen scales with whatever frame holds it: the TV's whole
 * window, or a thumbnail on the laptop.
 */
import type { ReactNode } from 'react';
import type { Random, Tournament, TvScreen, TvScreenOnShow } from '../tournament';
import { Bracket } from './Bracket';
import { Champion } from './Champion';
import { HouseRules } from './HouseRules';
import { Players } from './Players';
import { countdownRing } from './tvScreenOnShow';

// Each screen the TV shows once Started.
const tvScreens: Record<TvScreen, (tournament: Tournament) => ReactNode> = {
	winnersBracket: (tournament) => <Bracket tournament={tournament} bracketName="winners" />,
	losersBracket: (tournament) => <Bracket tournament={tournament} bracketName="losers" />,
	champion: (tournament) => <Champion tournament={tournament} />,
};

/*
 * The screen the TV shows for the Tournament's phase: before Start the phase's own screen, from
 * Start the screen on show. Fun Facts are chosen with the random source given.
 */
export const TvScreenView = ({
	tournament,
	onShow,
	random,
}: {
	tournament: Tournament;
	onShow: TvScreenOnShow | undefined;
	random: Random;
}) => {
	if (tournament.phase === 'registration') {
		return <Players tournament={tournament} random={random} />;
	}
	if (tournament.phase === 'houseRules') {
		return <HouseRules tournament={tournament} />;
	}
	/*
	 * From Tonight's Draw on, every screen keeps clear of the countdown ring's strip, ring or not,
	 * so the bracket doesn't shift at Start and holding a screen doesn't shift it.
	 */
	return (
		<div className={countdownRing.clearance}>
			{/* Tonight's Draw: the Winners Bracket as the Draw stands, until Start. */}
			{tournament.phase === 'drawShown' && (
				<Bracket tournament={tournament} bracketName="winners" heading="Tonight’s Draw" />
			)}
			{onShow && tvScreens[onShow.screen](tournament)}
		</div>
	);
};

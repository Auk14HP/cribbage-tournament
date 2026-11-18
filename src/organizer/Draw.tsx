import { useId, useRef, useState } from 'react';
import {
	getMatchKey,
	getMatchesOnBoards,
	getBracketPicture,
	isLosersBracketOpenTo,
	recordForfeit,
	recordWinner,
	start,
	swapPlayers,
	type BracketName,
	type MatchPlace,
	type Player,
	type StayingAnswer,
	type Tournament,
} from '../tournament';
import { BracketMatches } from './BracketMatches';
import { button, primaryButton, windowFilling } from './classes';
import { Refusal, type Apply } from './controls';
import { Results } from './Results';
import { ScreenTiming } from './ScreenTiming';
import { StayingDialog } from './StayingDialog';
import type { SwapPicking } from './SwapButton';
import { WaitingForBoard } from './WaitingForBoard';

// A result waiting on the loser's answer to whether they are staying for the Losers Bracket.
interface ResultAwaitingStayingAnswer {
	readonly loser: Player;
	readonly record: (answer: StayingAnswer) => void;
}

// The Player tapped first in Swap mode, and the Match they are listed in.
interface PickedToSwap {
	readonly player: Player;
	readonly match: MatchPlace;
}

// The brackets in the order their Matches are listed: the main bracket first.
const bracketOrder: readonly BracketName[] = ['winners', 'losers'];

/*
 * The Matches holding a Board, under their bracket's heading: the ones the Draw seats while the TV holds
 * Tonight’s Draw, then the ones being played. Before Start, Swap mode makes the Players' names tappable:
 * the first tap picks a Player and the second swaps them with the Player picked. Once Started, tapping a
 * Player's name records them as the winner, and a Forfeit records their opponent's. A Player losing their first Match is asked first whether they are staying for the
 * Losers Bracket. Matches waiting for a Board are listed beneath. Results that can still be undone are
 * listed, latest first, to correct a mistake.
 */
export const Draw = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const matches = getMatchesOnBoards(tournament);
	const { champion } = getBracketPicture(tournament, 'winners')!;
	const losersChampion = getBracketPicture(tournament, 'losers')?.champion;
	const playing = tournament.phase === 'inProgress';
	const [refusal, setRefusal] = useState('');
	// Swap mode is this screen's own: a reload, or Start, leaves it.
	const [isSwapModeOn, setSwapModeOn] = useState(false);
	const drawShown = tournament.phase === 'drawShown';
	const swapping = drawShown && isSwapModeOn;
	const [pickedToSwap, setPickedToSwap] = useState<PickedToSwap>();
	const [pendingResult, setPendingResult] = useState<ResultAwaitingStayingAnswer>();
	const stayingDialog = useRef<HTMLDialogElement>(null);
	const matchesHeadingId = useId();
	// Records the result at once, or once the loser has said whether they are staying.
	const recordOrAsk = (loser: Player, record: (answer?: StayingAnswer) => void) => {
		if (!isLosersBracketOpenTo(tournament, loser.id)) {
			record();
			return;
		}
		setPendingResult({ loser, record });
		stayingDialog.current?.showModal();
	};
	const recordWinnerOf = (match: MatchPlace, winner: Player, loser: Player) => {
		recordOrAsk(loser, (answer) => {
			const reason = apply(recordWinner(tournament, match, winner.id, answer));
			setRefusal(reason);
		});
	};
	const recordForfeitBy = (match: MatchPlace, leaver: Player) => {
		recordOrAsk(leaver, (answer) => {
			const reason = apply(recordForfeit(tournament, match, leaver.id, answer));
			setRefusal(reason);
		});
	};
	/*
	 * Picks the Player tapped first, then swaps them with the second. Tapping the picked Player again, or
	 * their opponent in the same Match, only clears the pick: that Swap would change nothing.
	 */
	const tapToSwap = (player: Player, match: MatchPlace) => {
		if (!pickedToSwap) {
			setPickedToSwap({ player, match });
			return;
		}
		setPickedToSwap(undefined);
		if (getMatchKey(pickedToSwap.match) === getMatchKey(match)) {
			return;
		}
		const reason = apply(swapPlayers(tournament, pickedToSwap.player.id, player.id));
		setRefusal(reason);
	};
	const swapPicking: SwapPicking | undefined = swapping
		? { picked: pickedToSwap?.player.id, onTap: tapToSwap }
		: undefined;
	const pressStart = () => {
		const reason = apply(start(tournament));
		setRefusal(reason);
	};
	return (
		<div className={`${windowFilling.row} mt-6`}>
			<section className={`${windowFilling.column} flex-1`}>
				{champion && (
					<p className="text-2xl font-bold text-green-800">Champion: {champion.name}</p>
				)}
				{losersChampion && (
					<p className="text-2xl font-bold text-green-800">
						Losers Bracket champion: {losersChampion.name}
					</p>
				)}
				{matches.length > 0 && (
					<>
						<div className="flex items-center justify-between gap-4">
							<h2 id={matchesHeadingId} className="text-xl font-bold">
								Matches
							</h2>
							{drawShown && (
								<button
									type="button"
									className={button}
									onClick={() => {
										setSwapModeOn(!swapping);
										setPickedToSwap(undefined);
										setRefusal('');
									}}
								>
									{swapping ? 'Done' : 'Swap Players'}
								</button>
							)}
						</div>
						{playing && <p className="mt-1 text-gray-700">Tap a Match’s winner.</p>}
						{swapping && (
							<p className="mt-1 text-gray-700">Tap two Players to swap them</p>
						)}
					</>
				)}
				{/*
				 * The Matches and those waiting for a Board scroll together, so neither list is squeezed to make room
				 * for the other: a waiting Match is reached by scrolling past the Matches holding a Board. Hidden while
				 * both are empty, as once there is a Champion, so it leaves no gap.
				 */}
				<div className={`${windowFilling.scrollingArea} mt-2 empty:hidden`}>
					{matches.length > 0 && (
						<section aria-labelledby={matchesHeadingId}>
							{bracketOrder.map((bracketName) => (
								<BracketMatches
									key={bracketName}
									tournament={tournament}
									bracketName={bracketName}
									matches={matches.filter((m) => m.match.bracket === bracketName)}
									playing={playing}
									swapPicking={swapPicking}
									onWin={recordWinnerOf}
									onForfeit={recordForfeitBy}
								/>
							))}
						</section>
					)}
					<WaitingForBoard tournament={tournament} swapPicking={swapPicking} />
				</div>
				{(playing || swapping) && <Refusal reason={refusal} />}
				<StayingDialog
					ref={stayingDialog}
					loser={pendingResult?.loser}
					onAnswer={(answer) => pendingResult?.record(answer)}
				/>
			</section>
			<section className={`${windowFilling.column} w-80`}>
				{drawShown && !swapping && (
					<>
						<p>
							The TV holds Tonight’s Draw until you press Start, so everyone can find
							their Board.
						</p>
						<button
							type="button"
							className={`${primaryButton} mt-2 w-full`}
							onClick={pressStart}
						>
							Start
						</button>
						<Refusal reason={refusal} />
					</>
				)}
				{/* Below the TV screens box, so the list growing never moves that box. */}
				<ScreenTiming tournament={tournament} apply={apply} />
				<Results tournament={tournament} apply={apply} />
			</section>
		</div>
	);
};

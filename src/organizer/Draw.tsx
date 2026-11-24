import { useRef, useState } from 'react';
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
import { button, panel, primaryButton, windowFilling } from './classes';
import { Refusal, type Apply } from './controls';
import { Results } from './Results';
import { TvDisplay } from './TvDisplay';
import { StayingDialog } from './StayingDialog';
import type { SwapPicking } from './PlayerName';
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

/*
 * One of a button's labels, put in the first cell of the button's grid, where its other labels sit too. A label
 * not shown is hidden but still takes up its space, and isn't read out.
 */
const StackedLabel = ({ label, isShown }: { label: string; isShown: boolean }) => (
	<span
		aria-hidden={isShown ? undefined : true}
		className={`col-start-1 row-start-1 ${isShown ? '' : 'invisible'}`}
	>
		{label}
	</span>
);

// The brackets in the order their Matches are listed: the main bracket first.
const bracketOrder: readonly BracketName[] = ['winners', 'losers'];

/*
 * The Matches holding a Board, in a panel for each bracket: the ones the Draw seats while the TV holds
 * Tonight’s Draw, then the ones being played. Before Start, Swap mode makes the Players' names tappable:
 * the first tap picks a Player and the second swaps them with the Player picked. Once Started, tapping a
 * Player's name records them as the winner, and a Forfeit records their opponent's. A Player losing their
 * first Match is asked first whether they are staying for the Losers Bracket. Matches waiting for a Board
 * are listed beneath. Results that can still be undone are listed, latest first, to correct a mistake.
 */
export const Draw = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const matches = getMatchesOnBoards(tournament);
	const { champion } = getBracketPicture(tournament, 'winners')!;
	const losersChampion = getBracketPicture(tournament, 'losers')?.champion;
	const playing = tournament.phase === 'inProgress';
	const [refusal, setRefusal] = useState('');
	// Why a Swap was refused, shown beside the Matches the Organizer is tapping.
	const [swapRefusal, setSwapRefusal] = useState('');
	// Swap mode is this screen's own: a reload, or Start, leaves it.
	const [isSwapModeOn, setSwapModeOn] = useState(false);
	const drawShown = tournament.phase === 'drawShown';
	const finished = tournament.phase === 'finished';
	const swapping = drawShown && isSwapModeOn;
	const [pickedToSwap, setPickedToSwap] = useState<PickedToSwap>();
	const [pendingResult, setPendingResult] = useState<ResultAwaitingStayingAnswer>();
	const stayingDialog = useRef<HTMLDialogElement>(null);
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
		setSwapRefusal(reason);
	};
	const swapPicking: SwapPicking | undefined = swapping
		? { picked: pickedToSwap?.player.id, onTap: tapToSwap }
		: undefined;
	const pressStart = () => {
		const reason = apply(start(tournament));
		setRefusal(reason);
	};
	return (
		<div className={windowFilling.row}>
			<div className={windowFilling.mainColumn}>
				{champion && (
					<section aria-label="Champions" className={panel}>
						<p className="text-accent text-2xl font-bold">Champion: {champion.name}</p>
						{losersChampion && (
							<p className="text-accent text-2xl font-bold">
								Losers Bracket champion: {losersChampion.name}
							</p>
						)}
					</section>
				)}
				{/*
				 * Gone once the Tournament is finished, when no Match is left to list. Not a panel itself: each
				 * bracket's Matches are a panel of their own.
				 */}
				{!finished && (
					<div className={windowFilling.column}>
						{matches.length > 0 && (
							/*
							 * What a tap does, above the Matches: on Tonight’s Draw, Swap Players with Swap mode's line
							 * beside it, so the line moves nothing below; once Started, the winner's tap.
							 */
							<div className="flex min-h-10 items-center justify-between gap-4">
								{playing && <p className="text-muted">Tap a Match’s winner.</p>}
								{drawShown && (
									<div className="ml-auto flex items-center gap-4">
										{swapping && (
											<p className="text-muted whitespace-nowrap">
												Tap two Players to swap them.
											</p>
										)}
										{/*
										 * Its labels share one grid cell, so it is as wide as Swap Players whichever shows, and
										 * neither wraps nor shrinks: the box under the pointer stays put when it becomes Done.
										 */}
										<button
											type="button"
											className={`${button} grid shrink-0 text-center whitespace-nowrap`}
											onClick={() => {
												setSwapModeOn(!swapping);
												setPickedToSwap(undefined);
												setSwapRefusal('');
											}}
										>
											<StackedLabel
												label="Swap Players"
												isShown={!swapping}
											/>
											<StackedLabel label="Done" isShown={swapping} />
										</button>
									</div>
								)}
							</div>
						)}
						{/*
						 * The brackets' panels and the Matches waiting for a Board scroll together, so neither is squeezed
						 * to make room for the other: a waiting Match is reached by scrolling past the panels. Hidden while
						 * both are empty, so it leaves no gap.
						 */}
						<div
							className={`${windowFilling.scrollingArea} mt-2 flex flex-col gap-4 empty:hidden`}
						>
							{matches.length > 0 && (
								<section aria-label="Matches" className="flex flex-col gap-4">
									{bracketOrder.map((bracketName) => (
										<BracketMatches
											key={bracketName}
											tournament={tournament}
											bracketName={bracketName}
											matches={matches.filter(
												(m) => m.match.bracket === bracketName,
											)}
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
						{playing && <Refusal reason={refusal} />}
						{/* Held open on Tonight’s Draw, so a refusal in Swap mode moves nothing above it. */}
						{drawShown && <Refusal reason={swapRefusal} />}
					</div>
				)}
				<StayingDialog
					ref={stayingDialog}
					loser={pendingResult?.loser}
					onAnswer={(answer) => pendingResult?.record(answer)}
				/>
			</div>
			<div className={windowFilling.sideColumn}>
				{/* First in the side column on every step, so it stays in one place all night. */}
				<TvDisplay tournament={tournament} apply={apply} />
				{drawShown && (
					<section aria-label="Start" className={panel}>
						<p>
							The TV holds Tonight’s Draw until you press Start, so everyone can find
							their Board.
						</p>
						<button
							type="button"
							className={`${primaryButton} mt-2 w-full`}
							/* Disabled in Swap mode, so the Tournament can’t Start halfway through a Swap. */
							disabled={swapping}
							onClick={pressStart}
						>
							Start
						</button>
						<Refusal reason={refusal} />
					</section>
				)}
				<Results tournament={tournament} apply={apply} />
			</div>
		</div>
	);
};

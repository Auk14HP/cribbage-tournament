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
 * Swap mode's banner, across the top of the Matches: what the next tap does, naming the Player picked once there
 * is one, and Done, which leaves Swap mode. Named, so it reads as a part of the screen of its own.
 */
const SwapBanner = ({ picked, onDone }: { picked?: Player; onDone: () => void }) => (
	<section
		aria-label="Swap mode"
		className="border-accent bg-highlight flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-2"
	>
		<p className="font-semibold">
			<span className="text-accent">Swapping · </span>
			<span className="font-normal">
				{picked
					? `${picked.name} is picked. Tap another Player to swap them.`
					: 'Tap two Players to swap them.'}
			</span>
		</p>
		<button
			type="button"
			className="bg-fill text-on-fill min-h-10 shrink-0 rounded px-4 font-bold hover:brightness-95"
			onClick={onDone}
		>
			Done
		</button>
	</section>
);

// The brackets in the order their Matches are listed: the main bracket first.
const bracketOrder: readonly BracketName[] = ['winners', 'losers'];

/*
 * The Matches holding a Board, in a panel for each bracket: the ones the Draw seats while the TV holds
 * Tonight’s Draw, then the ones being played. Before Start, Swap Players in the Winners Bracket's header turns
 * on Swap mode, which makes the Players' seats tappable under a banner saying what the next tap does: the first
 * tap picks a Player and the second swaps them with the Player picked. Done in the banner leaves it. Once Started, tapping a
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
	const startReasonId = useId();
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
	// Turns Swap mode on or off, with no Player picked and no refusal left from before.
	const setSwapping = (isOn: boolean) => {
		setSwapModeOn(isOn);
		setPickedToSwap(undefined);
		setSwapRefusal('');
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
						{/*
						 * What a tap does, above the Matches: on Tonight’s Draw, Swap mode's banner; once Started, a line
						 * saying to tap the winner. The row is held at the banner's height whether Swap mode is on or off,
						 * and keeps it through Start, so neither the banner nor Start moves the Matches below it.
						 */}
						{(drawShown || (playing && matches.length > 0)) && (
							<div className="flex min-h-14 items-center">
								{swapping && (
									<SwapBanner
										picked={pickedToSwap?.player}
										onDone={() => setSwapping(false)}
									/>
								)}
								{playing && <p className="text-muted">Tap a Match’s winner.</p>}
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
											headerControl={
												/*
												 * In the Winners Bracket's header on Tonight’s Draw, beside the Matches it changes.
												 * Disabled in Swap mode rather than gone, so the header doesn't change.
												 */
												drawShown &&
												bracketName === 'winners' && (
													<button
														type="button"
														className={`${button} shrink-0 whitespace-nowrap`}
														disabled={swapping}
														onClick={() => setSwapping(true)}
													>
														Swap Players
													</button>
												)
											}
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
							aria-describedby={swapping ? startReasonId : undefined}
							onClick={pressStart}
						>
							Start
						</button>
						{/* Why Start is disabled, in the refusal's place: in Swap mode Start can't be refused. */}
						{swapping ? (
							<p id={startReasonId} className="text-muted mt-2 min-h-6">
								Press Done to finish swapping first.
							</p>
						) : (
							<Refusal reason={refusal} />
						)}
					</section>
				)}
				<Results tournament={tournament} apply={apply} />
			</div>
		</div>
	);
};

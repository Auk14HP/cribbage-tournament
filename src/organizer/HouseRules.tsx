/*
 * The House Rules step: the Organizer shows the House Rules on the TV one at a time as they
 * announce them, then makes the Draw, or goes back to registration to enter a late arrival.
 */
import { useRef, useState } from 'react';
import type { Result } from '../result';
import {
	goBackToRegistration,
	hideLastHouseRule,
	houseRules,
	makeDraw,
	showAllHouseRules,
	showNextHouseRule,
	type Tournament,
} from '../tournament';
import { button, panel, primaryButton, windowFilling } from './classes';
import { ConfirmDialog, Refusal, type Apply } from './controls';
import { TvDisplay } from './TvDisplay';

/*
 * A House Rule's card, by where it stands: on the TV already, the next to show, or
 * still to come. Those on the TV and the next stand out from the panel, the next
 * outlined in the theme's fill with its tag on a pill of it; those to come are faint.
 * Every card keeps the same 1px border, so a card changing look moves nothing.
 */
const ruleCard = {
	shape: 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-4',
	onTv: {
		card: 'border-divider bg-raised text-ink',
		number: 'text-card-number',
		tag: 'text-on-tv',
	},
	next: {
		card: 'border-fill bg-raised text-ink',
		number: 'text-ink',
		tag: 'rounded bg-fill px-2 py-0.5 text-on-fill',
	},
	toCome: { card: 'border-divider text-faint', number: 'text-faint', tag: '' },
};

/*
 * The tag at a card's right end. Its box is always as wide as ON THE TV, the longer
 * tag, held open by an invisible copy drawn before it, so the rule's text keeps its
 * width, and its line breaks, whichever tag shows or none. The copy is drawn by CSS, so
 * it is neither read out nor part of the card's text. Tailwind can't build a class from
 * a variable, so the copy repeats the tag in `findRuleStanding`: change both together.
 */
const ruleTag =
	"grid justify-items-end text-xs font-extrabold tracking-wider before:invisible before:col-start-1 before:row-start-1 before:content-['ON_THE_TV']";

// Where a House Rule stands, from its place in the list and how many the TV shows.
const findRuleStanding = (index: number, shownRuleCount: number) => {
	if (index < shownRuleCount) {
		return { look: ruleCard.onTv, tag: 'ON THE TV' };
	}
	if (index === shownRuleCount) {
		return { look: ruleCard.next, tag: 'NEXT' };
	}
	return { look: ruleCard.toCome, tag: '' };
};

// One House Rule's card: its number, its text, and its tag, all drawn by where it stands.
const HouseRuleCard = ({
	rule,
	index,
	shownRuleCount,
}: {
	rule: string;
	index: number;
	shownRuleCount: number;
}) => {
	const { look, tag } = findRuleStanding(index, shownRuleCount);
	return (
		<li className={`${ruleCard.shape} ${look.card}`}>
			<span className={`text-center text-3xl font-extrabold ${look.number}`}>
				{index + 1}
			</span>
			<span className="text-xl leading-snug font-semibold">{rule}</span>
			<span className={ruleTag}>
				<span className={`col-start-1 row-start-1 ${look.tag}`}>{tag}</span>
			</span>
		</li>
	);
};

export const HouseRules = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const drawDialog = useRef<HTMLDialogElement>(null);
	const shownRuleCount = tournament.shownHouseRuleCount;
	const isEveryRuleShown = shownRuleCount === houseRules.length;

	// Every control here shares one refusal line, below Make the Draw in the side column.
	const applyHere = (outcome: Result<Tournament>) => {
		const reason = apply(outcome);
		setRefusal(reason);
	};

	return (
		<div className={windowFilling.row}>
			<div className={windowFilling.mainColumn}>
				<section aria-label="House Rules" className={`${panel} flex flex-col gap-4`}>
					<div className="flex items-baseline justify-between gap-3">
						<h2 className="text-muted text-sm font-bold tracking-widest uppercase">
							Announce one at a time
						</h2>
						{/*
						 * Its digits are all one width, so the line
						 * keeps its place as the count changes.
						 */}
						<p className="font-bold tabular-nums">
							{shownRuleCount} of {houseRules.length} on the TV
						</p>
					</div>
					{/*
					 * Every House Rule as a numbered card, so the Organizer
					 * sees which are on the TV and what comes next.
					 */}
					<ol aria-label="House Rules" className="flex flex-col gap-2.5">
						{houseRules.map((rule, index) => (
							<HouseRuleCard
								key={rule}
								rule={rule}
								index={index}
								shownRuleCount={shownRuleCount}
							/>
						))}
					</ol>
					{/*
					 * Showing the next House Rule is the main button, filling the row
					 * between Back and Show all, so its label can change without moving
					 * them. Its width comes from the row, not its label, so unlike Swap
					 * Players it needs no stacked labels (`StackedLabel`) to keep its box.
					 */}
					{/* Names the row of buttons, which has no name of its own on screen. */}
					<div data-testid="House Rules buttons" className="flex gap-2.5">
						<button
							type="button"
							className={button}
							disabled={shownRuleCount === 0}
							onClick={() => applyHere(hideLastHouseRule(tournament))}
						>
							<span aria-hidden="true">← </span>Back
						</button>
						<button
							type="button"
							className={`${primaryButton} flex-1`}
							disabled={isEveryRuleShown}
							onClick={() => applyHere(showNextHouseRule(tournament))}
						>
							{isEveryRuleShown
								? 'Every rule is on the TV'
								: `Show rule ${shownRuleCount + 1} on the TV`}
						</button>
						<button
							type="button"
							className={button}
							disabled={isEveryRuleShown}
							onClick={() => applyHere(showAllHouseRules(tournament))}
						>
							Show all
						</button>
					</div>
				</section>
			</div>
			{/* The next step and the way back sit together in the side column. */}
			<div className={windowFilling.sideColumn}>
				{/* First in the side column on every step, so it stays in one place all night. */}
				<TvDisplay tournament={tournament} apply={apply} />
				<section aria-label="Make the Draw" className={`${panel} flex flex-col`}>
					<p className="mb-3">
						Once the House Rules are announced, make the Draw. Registration closes: no
						Player can be added, renamed or removed afterwards.
					</p>
					<button
						type="button"
						className={`${primaryButton} w-full`}
						onClick={() => drawDialog.current?.showModal()}
					>
						Make the Draw
					</button>
					<ConfirmDialog
						ref={drawDialog}
						message="Make the Draw? Registration will close: no Player can be added, renamed or removed afterwards."
						confirmLabel="Make the Draw"
						onConfirm={() => applyHere(makeDraw(tournament, Math.random))}
					/>
					<Refusal reason={refusal} />
					<button
						type="button"
						className="text-accent self-start font-semibold underline"
						onClick={() => applyHere(goBackToRegistration(tournament))}
					>
						<span aria-hidden="true">← </span>Back to registration for a late arrival
					</button>
				</section>
			</div>
		</div>
	);
};

/*
 * The House Rules step: the Organizer shows the House Rules on the TV one at a time as they announce them,
 * then makes the Draw, or goes back to registration to enter a late arrival.
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

export const HouseRules = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const drawDialog = useRef<HTMLDialogElement>(null);
	const shownRuleCount = tournament.shownHouseRuleCount;

	// Every control here shares one refusal line, below Make the Draw in the side column.
	const applyHere = (outcome: Result<Tournament>) => {
		const reason = apply(outcome);
		setRefusal(reason);
	};

	return (
		<div className={windowFilling.row}>
			<div className={windowFilling.mainColumn}>
				<section aria-label="House Rules" className={panel}>
					<p className="text-muted">
						{shownRuleCount} of {houseRules.length} shown on the TV
					</p>
					{/* Every House Rule, so the Organizer sees what comes next: those not yet on the TV are greyed. */}
					<ol className="mt-3 list-decimal space-y-2 pl-8 text-lg">
						{houseRules.map((rule, index) => (
							<li key={rule} className={index < shownRuleCount ? '' : 'text-faint'}>
								{rule}
							</li>
						))}
					</ol>
					<div className="mt-6 flex gap-2">
						<button
							type="button"
							className={button}
							disabled={shownRuleCount === 0}
							onClick={() => applyHere(hideLastHouseRule(tournament))}
						>
							Back
						</button>
						<button
							type="button"
							className={button}
							disabled={shownRuleCount === houseRules.length}
							onClick={() => applyHere(showNextHouseRule(tournament))}
						>
							Next
						</button>
						<button
							type="button"
							className={button}
							disabled={shownRuleCount === houseRules.length}
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
						className="text-accent mt-4 self-start underline"
						onClick={() => applyHere(goBackToRegistration(tournament))}
					>
						Back to registration
					</button>
				</section>
			</div>
		</div>
	);
};

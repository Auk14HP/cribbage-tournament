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
import { button, primaryButton } from './classes';
import { ConfirmDialog, Refusal, type Apply } from './controls';

export const HouseRules = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const drawDialog = useRef<HTMLDialogElement>(null);
	const shownCount = tournament.shownHouseRuleCount;

	// Every control here shares one refusal line, below Make the Draw.
	const applyHere = (outcome: Result<Tournament>) => {
		const reason = apply(outcome);
		setRefusal(reason);
	};

	return (
		<section aria-label="House Rules" className="mt-6 flex max-w-3xl flex-col">
			<p className="text-gray-700">
				{shownCount} of {houseRules.length} shown on the TV
			</p>
			{/* Every House Rule, so the Organizer sees what comes next: those not yet on the TV are greyed. */}
			<ol className="mt-3 list-decimal space-y-2 pl-8 text-lg">
				{houseRules.map((rule, index) => (
					<li key={rule} className={index < shownCount ? '' : 'text-gray-400'}>
						{rule}
					</li>
				))}
			</ol>
			<div className="mt-6 flex gap-2">
				<button
					type="button"
					className={button}
					disabled={shownCount === 0}
					onClick={() => applyHere(hideLastHouseRule(tournament))}
				>
					Back
				</button>
				<button
					type="button"
					className={button}
					disabled={shownCount === houseRules.length}
					onClick={() => applyHere(showNextHouseRule(tournament))}
				>
					Next
				</button>
				<button
					type="button"
					className={button}
					disabled={shownCount === houseRules.length}
					onClick={() => applyHere(showAllHouseRules(tournament))}
				>
					Show all
				</button>
			</div>
			<button
				type="button"
				className={`${primaryButton} mt-8 w-80`}
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
				className="mt-4 self-start text-blue-700 underline"
				onClick={() => applyHere(goBackToRegistration(tournament))}
			>
				Back to registration
			</button>
		</section>
	);
};

import { useState } from 'react';
import {
	getMatchKey,
	getUndoableResults,
	undoResult,
	type MatchPlace,
	type RecordedResult,
	type Tournament,
} from '../tournament';
import { describeBracketRound } from '../wording';
import { button, panel } from './classes';
import { Refusal, type Apply } from './controls';

/*
 * The results that can still be undone, latest first, each with its own Undo. Each names its bracket and
 * Round, so the Organizer undoes the Match they mean. None until a result is recorded. The panel keeps its
 * whole height: in a window too short for it, the side column scrolls to every result, so there is one
 * scrollbar rather than one inside another.
 */
export const Results = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const results = getUndoableResults(tournament);
	const [refusal, setRefusal] = useState('');
	const undoResultOf = (match: MatchPlace) => {
		const reason = apply(undoResult(tournament, match));
		setRefusal(reason);
	};
	if (results.length === 0 && !refusal) {
		return null;
	}
	return (
		<section aria-label="Results" className={panel}>
			<h2 className="text-xl font-bold">Results</h2>
			<p className="text-muted mt-1">Undo a result to correct it.</p>
			<ul aria-label="Results" className="mt-2">
				{results.map((result) => (
					<li
						key={getMatchKey(result.match)}
						className="border-divider flex items-center gap-2 border-b py-1.5"
					>
						<div className="flex-1">
							<span className="text-muted block text-sm">
								{describeBracketRound(tournament, result.match)}
							</span>
							<span className="block">{describeResult(result)}</span>
						</div>
						<button
							type="button"
							className={button}
							onClick={() => undoResultOf(result.match)}
						>
							Undo
						</button>
					</li>
				))}
			</ul>
			<Refusal reason={refusal} />
		</section>
	);
};

const describeResult = ({ board, winner, loser, isForfeit }: RecordedResult): string =>
	isForfeit
		? `Board ${board}: ${loser.name} forfeited to ${winner.name}`
		: `Board ${board}: ${winner.name} beat ${loser.name}`;

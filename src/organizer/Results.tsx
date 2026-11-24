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
import { button, panel, windowFilling } from './classes';
import { Refusal, type Apply } from './controls';

/*
 * The results that can still be undone, latest first, each with its own Undo. Each names its bracket and
 * Round, so the Organizer undoes the Match they mean. None until a result is recorded.
 */
export const Results = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const results = getUndoableResults(tournament);
	const [refusal, setRefusal] = useState('');
	const undoResultOf = (match: MatchPlace) => {
		const reason = apply(undoResult(tournament, match));
		setRefusal(reason);
	};
	const minHeight = minHeightByResultCount[Math.min(results.length, maxKeptRows)];
	if (results.length === 0 && !refusal) {
		return null;
	}
	return (
		<section className={`${panel} ${windowFilling.column}`}>
			<h2 className="text-xl font-bold">Results</h2>
			<p className="text-muted mt-1">Undo a result to correct it.</p>
			<ul aria-label="Results" className={`mt-2 overflow-y-auto ${minHeight}`}>
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

/*
 * The height the Results list keeps however short the window, by how many results it holds: room for up to two
 * rows, a little under their own height. Below that it shrinks to the space left and scrolls; the side column
 * scrolls to it, so it never shrinks to nothing. Written out whole so Tailwind finds each class.
 */
const minHeightByResultCount = ['min-h-0', 'min-h-14', 'min-h-28'];
const maxKeptRows = minHeightByResultCount.length - 1;

const describeResult = ({ board, winner, loser, isForfeit }: RecordedResult): string =>
	isForfeit
		? `Board ${board}: ${loser.name} forfeited to ${winner.name}`
		: `Board ${board}: ${winner.name} beat ${loser.name}`;

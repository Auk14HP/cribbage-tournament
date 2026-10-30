import { useState } from 'react';
import {
	getUndoableResults,
	undoResult,
	type MatchPlace,
	type RecordedResult,
	type Tournament,
} from '../tournament';
import { button } from './classes';
import { Refusal, type Apply } from './controls';

// The results that can still be undone, latest first, each with its own Undo. None until a result is recorded.
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
		<section className="mt-8">
			<h2 className="text-xl font-bold">Results</h2>
			<p className="mt-1 text-gray-700">Undo a result to correct it.</p>
			<ul aria-label="Results" className="mt-2">
				{results.map((result) => (
					<li
						key={`${result.match.bracket}-${result.match.round}-${result.match.place}`}
						className="flex items-center gap-2 border-b border-gray-300 py-1.5"
					>
						<span className="flex-1">{describeResult(result)}</span>
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

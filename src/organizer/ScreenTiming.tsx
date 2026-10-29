import { useState } from 'react';
import { setScreenSeconds, type Tournament } from '../tournament';
import { NumberBox, Refusal, type Apply } from './controls';

/*
 * How long the TV shows each screen it cycles through once Started. Like the Boards, saved when the Organizer
 * leaves the box or presses Enter, not as they type.
 */
export const ScreenTiming = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const saveSeconds = (typed: string) => {
		const reason = apply(setScreenSeconds(tournament, typed));
		setRefusal(reason);
	};
	return (
		<section aria-label="TV screens" className="mt-8 first:mt-0">
			<h2 className="text-xl font-bold">TV screens</h2>
			<NumberBox
				label="Seconds per TV screen"
				saved={String(tournament.screenSeconds)}
				onSave={saveSeconds}
			/>
			<Refusal reason={refusal} />
		</section>
	);
};

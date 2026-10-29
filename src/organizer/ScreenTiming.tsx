import { useState } from 'react';
import { setScreenSeconds, type Tournament } from '../tournament';
import { textInput } from './classes';
import { Refusal, type Apply } from './controls';

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

/*
 * A box for a number the Organizer types, saved only once they are done with it: when the box loses focus
 * or they press Enter. Until then the Tournament keeps the number last saved. Leaving the box unchanged
 * saves nothing, so tabbing through it neither refuses a blank nor saves the same number again.
 */
export const NumberBox = ({
	label,
	saved,
	onSave,
}: {
	label: string;
	saved: string;
	onSave: (typed: string) => void;
}) => {
	const [typed, setTyped] = useState(saved);
	const [lastSaved, setLastSaved] = useState(saved);
	const save = () => {
		if (typed !== lastSaved) {
			setLastSaved(typed);
			onSave(typed);
		}
	};
	return (
		<label className="mt-2 flex items-center gap-2">
			{label}
			<input
				type="text"
				inputMode="numeric"
				autoComplete="off"
				value={typed}
				onChange={(event) => setTyped(event.target.value)}
				onBlur={save}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						save();
					}
				}}
				className={`${textInput} w-20`}
			/>
		</label>
	);
};

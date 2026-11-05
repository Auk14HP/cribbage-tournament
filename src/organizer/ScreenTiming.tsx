import { useState } from 'react';
import {
	chooseTvScreen,
	listTvScreens,
	setScreenSeconds,
	tvScreenNames,
	type Tournament,
	type TvChoice,
} from '../tournament';
import { NumberBox, Refusal, type Apply } from './controls';

/*
 * What the TV shows: how long it shows each screen it cycles through once Started, and, once Started, the
 * choice of Auto or a screen to hold. Like the Boards, the seconds are saved when the Organizer leaves the
 * box or presses Enter, not as they type; a choice of screen is saved as soon as it is picked.
 */
export const ScreenTiming = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const saveSeconds = (typed: string) => {
		const reason = apply(setScreenSeconds(tournament, typed));
		setRefusal(reason);
	};
	const choose = (choice: TvChoice) => {
		const reason = apply(chooseTvScreen(tournament, choice));
		setRefusal(reason);
	};
	const screens = listTvScreens(tournament);
	return (
		<section aria-label="TV screens" className="mt-8 first:mt-0">
			<h2 className="text-xl font-bold">TV screens</h2>
			<NumberBox
				label="Seconds per TV screen"
				saved={String(tournament.screenSeconds)}
				onSave={saveSeconds}
			/>
			{/* Before Start the TV shows Tonight’s Players or Tonight’s Draw on its own, so there is no choice. */}
			{screens.length > 0 && (
				<fieldset className="mt-3">
					<legend>TV shows</legend>
					<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
						<TvChoiceOption
							choice="auto"
							label="Auto"
							chosen={tournament.tvChoice}
							onChoose={choose}
						/>
						{screens.map((tvScreen) => (
							<TvChoiceOption
								key={tvScreen}
								choice={tvScreen}
								label={tvScreenNames[tvScreen]}
								chosen={tournament.tvChoice}
								onChoose={choose}
							/>
						))}
					</div>
				</fieldset>
			)}
			<Refusal reason={refusal} />
		</section>
	);
};

// One choice of what the TV shows, checked when it is the Tournament's choice.
const TvChoiceOption = ({
	choice,
	label,
	chosen,
	onChoose,
}: {
	choice: TvChoice;
	label: string;
	chosen: TvChoice;
	onChoose: (choice: TvChoice) => void;
}) => (
	<label className="flex items-center gap-2">
		<input
			type="radio"
			name="tv-choice"
			value={choice}
			checked={choice === chosen}
			onChange={() => onChoose(choice)}
			className="h-4 w-4"
		/>
		{label}
	</label>
);

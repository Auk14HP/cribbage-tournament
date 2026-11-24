import { useState, type CSSProperties } from 'react';
import { TvScreenView } from '../display/TvScreenView';
import { findCountdownKey, tvFrame, useTvScreenOnShow } from '../display/tvScreenOnShow';
import { tvSafeArea } from '../display/tvSafeArea';
import {
	chooseTvScreen,
	listTvScreens,
	setScreenSeconds,
	tvScreenNames,
	type Phase,
	type Tournament,
	type TvChoice,
	type TvScreenOnShow,
} from '../tournament';
import { panel, windowFilling } from './classes';
import { NumberBox, Refusal, type Apply } from './controls';

/*
 * The TV Display panel: a thumbnail of the screen the TV has on show, a strip counting down its time, the
 * choice of Auto or a screen to hold once Started, and how long the TV shows each screen it cycles through.
 * Like the Boards, the seconds are saved when the Organizer leaves the box or presses Enter, not as they type;
 * a choice of screen is saved as soon as it is picked.
 */
export const TvDisplay = ({ tournament, apply }: { tournament: Tournament; apply: Apply }) => {
	const [refusal, setRefusal] = useState('');
	const onShow = useTvScreenOnShow(tournament);
	const saveSeconds = (typed: string) => {
		const reason = apply(setScreenSeconds(tournament, typed));
		setRefusal(reason);
	};
	const choose = (choice: TvChoice) => {
		const reason = apply(chooseTvScreen(tournament, choice));
		setRefusal(reason);
	};
	const screens = listTvScreens(tournament);
	const secondsLeft = onShow?.secondsLeft;
	return (
		<section aria-label="TV Display" className={`${panel} ${windowFilling.column} gap-3`}>
			<h2 className="text-xl font-bold">TV Display</h2>
			<TvThumbnail tournament={tournament} onShow={onShow} />
			{/*
			 * The strip's place is kept while there is nothing to count down to, so the choices below don't move
			 * under the Organizer's click when they hold a screen or choose Auto.
			 */}
			<div className="h-1">
				{onShow && secondsLeft !== undefined && (
					<CountdownStrip
						key={findCountdownKey(tournament, onShow)}
						seconds={tournament.screenSeconds}
						secondsLeft={secondsLeft}
					/>
				)}
			</div>
			{/* Before Start the TV shows Tonight’s Players, the House Rules or Tonight’s Draw on its own, so there is no choice. */}
			{screens.length > 0 && (
				<fieldset>
					<legend className="sr-only">TV shows</legend>
					<div className="flex flex-wrap gap-2">
						<TvChoicePill
							choice="auto"
							label="Auto"
							chosen={tournament.tvChoice}
							onChoose={choose}
						/>
						{screens.map((tvScreen) => (
							<TvChoicePill
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
			<NumberBox
				label="Seconds per TV screen"
				saved={String(tournament.screenSeconds)}
				onSave={saveSeconds}
			/>
			<Refusal reason={refusal} />
		</section>
	);
};

// The names the Organizer knows the TV's screens before Start by, each the only screen of its phase.
const phaseScreenNames: Partial<Record<Phase, string>> = {
	registration: 'Tonight’s Players',
	houseRules: 'House Rules',
	drawShown: 'Tonight’s Draw',
};

// Returns the name of the screen the TV shows: the phase's own before Start, the one on show from Start.
const nameTvScreen = (tournament: Tournament, onShow: TvScreenOnShow | undefined) =>
	onShow ? tvScreenNames[onShow.screen] : phaseScreenNames[tournament.phase];

/*
 * Returns a number from 0 up to 1, as Math.random does, without drawing on Math.random: the browser tests
 * replace Math.random to repeat the Draw, and the thumbnail's Fun Facts mustn't use up its numbers.
 */
const pickThumbnailRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/*
 * The TV screen on show, drawn as the TV draws it, scaled down to a 16:9 box: the box is the screen's frame,
 * so every size on the screen shrinks with it. A picture, named for the screen, so what it holds isn't read
 * out among the Organizer's own lists and headings. The countdown ring is left off: the strip beneath stands
 * in for it.
 *
 * The thumbnail takes the panel's width, unless the window is too short for the side column: then it shrinks,
 * still 16:9, so the controls after it stay on screen. Its place is the panel's width at 16:9, shrinking to
 * the height left; the picture is as tall as its place and as wide as 16:9 makes it, centred.
 */
const TvThumbnail = ({
	tournament,
	onShow,
}: {
	tournament: Tournament;
	onShow: TvScreenOnShow | undefined;
}) => (
	<div className="aspect-video min-h-0 w-full">
		<div
			role="img"
			aria-label={`The TV showing ${nameTvScreen(tournament, onShow)}`}
			className={`border-line mx-auto aspect-video h-full max-w-full overflow-hidden rounded-lg border bg-black font-sans text-white ${tvFrame}`}
		>
			<div aria-hidden className={`h-full ${tvSafeArea.page}`}>
				<TvScreenView
					tournament={tournament}
					onShow={onShow}
					random={pickThumbnailRandom}
				/>
			</div>
		</div>
	</div>
);

/*
 * A strip that empties over the screen's time, in step with the TV's countdown ring. It starts as far
 * emptied as the time already gone when it appears, and empties on from there. Decorative, so hidden from
 * assistive technology. The times reach the animation through CSS variables.
 */
const CountdownStrip = ({ seconds, secondsLeft }: { seconds: number; secondsLeft: number }) => {
	// Kept from when the strip appears: the animation counts on from there by itself.
	const [elapsedSeconds] = useState(seconds - secondsLeft);
	const countdownTimes = {
		'--countdown-duration': `${seconds}s`,
		'--countdown-elapsed': `${elapsedSeconds}s`,
	} as CSSProperties;
	return (
		<div
			data-testid="countdown strip"
			aria-hidden
			style={countdownTimes}
			className="bg-divider h-full overflow-hidden rounded-full"
		>
			<div className="animate-countdown-strip bg-fill h-full origin-left" />
		</div>
	);
};

/*
 * One choice of what the TV shows, as a pill: a radio button, hidden, inside a label drawn as the button. The
 * chosen pill is filled with the theme's fill, and a pill shows a ring while its radio button has the
 * keyboard's focus. The arrow keys move the choice between pills, as between radio buttons.
 */
const TvChoicePill = ({
	choice,
	label,
	chosen,
	onChoose,
}: {
	choice: TvChoice;
	label: string;
	chosen: TvChoice;
	onChoose: (choice: TvChoice) => void;
}) => {
	const isChosen = choice === chosen;
	return (
		<label
			className={`has-focus-visible:outline-accent inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${isChosen ? pillColours.chosen : pillColours.plain}`}
		>
			<input
				type="radio"
				name="tv-choice"
				value={choice}
				checked={isChosen}
				onChange={() => onChoose(choice)}
				className="sr-only"
			/>
			{label}
		</label>
	);
};

// A pill's colours: filled when chosen, outlined otherwise. The same weight of text either way, so no pill moves.
const pillColours = {
	chosen: 'border-fill bg-fill text-on-fill',
	plain: 'border-line hover:bg-raised',
};

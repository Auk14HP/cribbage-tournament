import { useRef, useState } from 'react';
import {
	describeCountdown,
	useCountdownTimes,
	useTvScreenOnShow,
	type Countdown,
} from '../display/tvScreenOnShow';
import {
	chooseTvScreen,
	getBracketPicture,
	listTvScreens,
	setScreenSeconds,
	tvScreenNames,
	type BracketName,
	type Tournament,
	type TvChoice,
	type TvScreenOnShow,
} from '../tournament';
import { BracketPeek } from './BracketPeek';
import { panel } from './classes';
import { NumberBox, Refusal, type Apply } from './controls';
import { TvThumbnail } from './TvThumbnail';

/*
 * The TV Display panel: a thumbnail of the screen the TV has on show and a strip filling over its
 * time. Once the TV has screens to cycle, the choice of Auto or a screen to hold, and how long the
 * TV shows each screen. Like the Boards, the seconds are saved when the Organizer leaves the box or
 * presses Enter, not as they type; a choice of screen is saved as soon as it is picked.
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
	/*
	 * Before Start the TV shows each phase's one screen on its own: it has no
	 * screens to choose between.
	 */
	const isStarted = screens.length > 0;
	/*
	 * With only the Winners Bracket to show, there is nothing to cycle yet: no
	 * Auto, and no time to set.
	 */
	const hasScreensToCycle = screens.length > 1;
	const countdown = describeCountdown(tournament, onShow);
	const bracketPeek = useRef<HTMLDialogElement>(null);
	/*
	 * The bracket the dialog shows: the one on show when it opens, then
	 * whichever tab the Organizer picks.
	 */
	const [peekedBracket, setPeekedBracket] = useState<BracketName>();
	// From the Draw on there is a Winners Bracket to look at.
	const hasBrackets = getBracketPicture(tournament, 'winners') !== undefined;
	const lookAtBrackets = () => {
		setPeekedBracket(findBracketOnShow(onShow));
		bracketPeek.current?.showModal();
	};
	return (
		/*
		 * Relative, so the pills' hidden radio buttons are placed within the panel, and the
		 * side column's scrolling holds them, rather than below the window, where they
		 * would make the page scroll.
		 */
		<section aria-label="TV Display" className={`${panel} relative flex flex-col gap-3`}>
			<h2 className="text-xl font-bold">TV Display</h2>
			{/*
			 * The picture of the TV and what goes with it, closer together
			 * than the panel's other parts.
			 */}
			<div className="flex flex-col gap-2">
				<TvThumbnail
					tournament={tournament}
					onShow={onShow}
					bracketOnShow={findBracketOnShow(onShow)}
					onLook={hasBrackets ? lookAtBrackets : undefined}
				/>
				{/*
				 * The strip's place is kept while there is nothing to count down to, so
				 * the choices below don't move under the Organizer's click when they
				 * hold a screen or choose Auto.
				 */}
				<div className="h-1">
					{countdown && <CountdownStrip key={countdown.key} countdown={countdown} />}
				</div>
				{hasBrackets && (
					<button
						type="button"
						onClick={lookAtBrackets}
						className="text-accent inline-flex min-h-9 cursor-zoom-in items-center gap-1.5 self-start text-sm font-semibold hover:underline"
					>
						<MagnifierIcon />
						Look at the brackets here
					</button>
				)}
			</div>
			{/*
			 * From Start on, the choice and the seconds stay in place all night, disabled until the
			 * Losers Bracket gives the TV a second screen, so nothing moves when they come into
			 * use. Until then the only pill is the Winners Bracket, the screen the TV shows.
			 */}
			{isStarted && (
				<div className="flex flex-col gap-1">
					<fieldset disabled={!hasScreensToCycle}>
						<legend className="sr-only">TV shows</legend>
						<div className="flex flex-wrap gap-2">
							{hasScreensToCycle && (
								<TvChoicePill
									choice="auto"
									label="Auto"
									isChosen={tournament.tvChoice === 'auto'}
									onChoose={choose}
								/>
							)}
							{screens.map((tvScreen) => (
								<TvChoicePill
									key={tvScreen}
									choice={tvScreen}
									label={tvScreenNames[tvScreen]}
									/*
									 * The lone pill, the Winners Bracket, is the screen on show,
									 * whatever choice is saved.
									 */
									isChosen={
										!hasScreensToCycle || tournament.tvChoice === tvScreen
									}
									onChoose={choose}
								/>
							))}
						</div>
					</fieldset>
					<NumberBox
						label="Seconds per TV screen"
						saved={String(tournament.screenSeconds)}
						onSave={saveSeconds}
						disabled={!hasScreensToCycle}
					/>
				</div>
			)}
			{/* Only the choice and the seconds can be refused, so the line comes with them. */}
			{isStarted && <Refusal reason={refusal} />}
			{hasBrackets && (
				<BracketPeek
					ref={bracketPeek}
					tournament={tournament}
					bracketName={peekedBracket}
					onChooseBracket={setPeekedBracket}
				/>
			)}
		</section>
	);
};

/*
 * Returns the bracket to look at first: the Losers Bracket while the TV shows it, the Winners
 * Bracket otherwise, whether the TV shows that or another screen.
 */
const findBracketOnShow = (onShow: TvScreenOnShow | undefined): BracketName =>
	onShow?.screen === 'losersBracket' ? 'losers' : 'winners';

// A magnifying glass, drawn in the text's colour beside the words it goes with.
const MagnifierIcon = () => (
	<svg
		aria-hidden
		className="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.2"
		strokeLinecap="round"
	>
		<circle cx="11" cy="11" r="6.5" />
		<path d="M20 20l-4.2-4.2" />
	</svg>
);

/*
 * A strip that fills over the screen's time, in step with the TV's countdown ring. It starts filled
 * as far as the time already gone when it appears, and fills on from there. Decorative, so hidden
 * from assistive technology. The times reach the animation through CSS variables.
 */
const CountdownStrip = ({ countdown }: { countdown: Countdown }) => {
	const countdownTimes = useCountdownTimes(countdown);
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
 * One choice of what the TV shows, as a pill: a radio button, hidden, inside a label drawn as the
 * button. The chosen pill is filled with the theme's fill, and a pill shows a ring while its radio
 * button has the keyboard's focus. The arrow keys move the choice between pills, as between radio
 * buttons. A pill in a disabled fieldset is faded and can't be picked.
 */
const TvChoicePill = ({
	choice,
	label,
	isChosen,
	onChoose,
}: {
	choice: TvChoice;
	label: string;
	isChosen: boolean;
	onChoose: (choice: TvChoice) => void;
}) => (
	<label
		className={`has-focus-visible:outline-accent inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-default has-disabled:opacity-50 ${isChosen ? pillColours.chosen : pillColours.plain}`}
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

/*
 * A pill's colours: filled when chosen, outlined otherwise. The same weight of text
 * either way, so no pill moves.
 */
const pillColours = {
	chosen: 'border-fill bg-fill text-on-fill',
	plain: 'border-line hover:bg-raised has-disabled:hover:bg-transparent',
};

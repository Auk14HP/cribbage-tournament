import { useRef, useState } from 'react';
import { TvScreenView } from '../display/TvScreenView';
import {
	describeCountdown,
	useCountdownTimes,
	useTvScreenOnShow,
	type Countdown,
} from '../display/tvScreenOnShow';
import { tvSafeArea } from '../display/tvSafeArea';
import {
	chooseTvScreen,
	getBracketPicture,
	listTvScreens,
	setScreenSeconds,
	tvScreenNames,
	type BracketName,
	type Phase,
	type Tournament,
	type TvChoice,
	type TvScreenOnShow,
} from '../tournament';
import { BracketPeek } from './BracketPeek';
import { panel, tvPicture } from './classes';
import { NumberBox, Refusal, type Apply } from './controls';

/*
 * The TV Display panel: a thumbnail of the screen the TV has on show and a strip filling over its time. Once
 * the TV has screens to cycle, the choice of Auto or a screen to hold, and how long the TV shows each screen.
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
	// Before Start the TV shows each phase's one screen on its own: it has no screens to choose between.
	const isStarted = screens.length > 0;
	// With only the Winners Bracket to show, there is nothing to cycle yet: no Auto, and no time to set.
	const hasScreensToCycle = screens.length > 1;
	const countdown = describeCountdown(tournament, onShow);
	const bracketPeek = useRef<HTMLDialogElement>(null);
	// The bracket the dialog shows: the one on show when it opens, then whichever tab the Organizer picks.
	const [peekedBracket, setPeekedBracket] = useState<BracketName>();
	// From the Draw on there is a Winners Bracket to look at.
	const hasBrackets = getBracketPicture(tournament, 'winners') !== undefined;
	const lookAtBrackets = () => {
		setPeekedBracket(onShow?.screen === 'losersBracket' ? 'losers' : 'winners');
		bracketPeek.current?.showModal();
	};
	return (
		/*
		 * Relative, so the pills' hidden radio buttons are placed within the panel, and the side column's
		 * scrolling holds them, rather than below the window, where they would make the page scroll.
		 */
		<section aria-label="TV Display" className={`${panel} relative flex flex-col gap-3`}>
			<h2 className="text-xl font-bold">TV Display</h2>
			{/* The picture of the TV and what goes with it, closer together than the panel's other parts. */}
			<div className="flex flex-col gap-2">
				<TvThumbnail
					tournament={tournament}
					onShow={onShow}
					onLook={hasBrackets ? lookAtBrackets : undefined}
				/>
				{/*
				 * The strip's place is kept while there is nothing to count down to, so the choices below don't
				 * move under the Organizer's click when they hold a screen or choose Auto.
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
			 * From Start on, the choice and the seconds stay in place all night, disabled until the Losers
			 * Bracket gives the TV a second screen, so nothing moves when they come into use. Until then the
			 * only pill is the Winners Bracket, the screen the TV shows.
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
									// The lone pill, the Winners Bracket, is the screen on show, whatever choice is saved.
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

// The names the Organizer knows the TV's screens before Start by, each the only screen of its phase.
const phaseScreenNames: Partial<Record<Phase, string>> = {
	registration: 'Tonight’s Players',
	houseRules: 'House Rules',
	drawShown: 'Tonight’s Draw',
};

// Returns the name of the screen the TV shows: the phase's own before Start, the one on show from Start.
const nameTvScreen = (tournament: Tournament, onShow: TvScreenOnShow | undefined) =>
	onShow ? tvScreenNames[onShow.screen] : phaseScreenNames[tournament.phase];

// How many numbers pickRandomApartFromMathRandom asks the browser for at a time.
const randomNumberCount = 1;

/*
 * Returns a number from 0 up to 1, as Math.random does, without drawing on Math.random: the browser tests
 * replace Math.random to repeat the Draw, and the thumbnail's Fun Facts mustn't use up its numbers.
 */
const pickRandomApartFromMathRandom = () => {
	const [randomWhole] = crypto.getRandomValues(new Uint32Array(randomNumberCount));
	return randomWhole / 2 ** 32;
};

/*
 * The TV screen on show, drawn as the TV draws it, scaled down to a 16:9 box the panel's width: the box is the
 * screen's frame, so every size on the screen shrinks with it. A picture, named for the screen, so what it
 * holds isn't read out among the Organizer's own lists and headings. The countdown ring is left off: the
 * strip beneath stands in for it. Once there are brackets to look at, a button covers the picture: pressing
 * it opens them full size, and under the pointer or the keyboard's focus it says so.
 */
const TvThumbnail = ({
	tournament,
	onShow,
	onLook,
}: {
	tournament: Tournament;
	onShow: TvScreenOnShow | undefined;
	onLook: (() => void) | undefined;
}) => (
	<div data-testid="tv thumbnail" className="relative">
		<div
			role="img"
			aria-label={`The TV showing ${nameTvScreen(tournament, onShow)}`}
			className={`border-line w-full rounded-lg border ${tvPicture.frame}`}
		>
			<div aria-hidden className={`h-full ${tvSafeArea.page}`}>
				<TvScreenView
					tournament={tournament}
					onShow={onShow}
					random={pickRandomApartFromMathRandom}
				/>
			</div>
		</div>
		{onLook && (
			<button
				type="button"
				onClick={onLook}
				aria-label={`Look at the ${onShow?.screen === 'losersBracket' ? 'Losers' : 'Winners'} Bracket full size`}
				className="group absolute inset-0 cursor-zoom-in rounded-lg"
			>
				<span
					aria-hidden
					className="grid h-full place-items-center rounded-lg bg-black/60 font-sans font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
				>
					Look at it full size
				</span>
			</button>
		)}
	</div>
);

// A magnifying glass, drawn in the text's colour beside the words it goes with.
const MagnifierIcon = () => (
	<svg
		aria-hidden
		width="16"
		height="16"
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
 * A strip that fills over the screen's time, in step with the TV's countdown ring. It starts filled as far as
 * the time already gone when it appears, and fills on from there. Decorative, so hidden from assistive
 * technology. The times reach the animation through CSS variables.
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
 * One choice of what the TV shows, as a pill: a radio button, hidden, inside a label drawn as the button. The
 * chosen pill is filled with the theme's fill, and a pill shows a ring while its radio button has the
 * keyboard's focus. The arrow keys move the choice between pills, as between radio buttons. A pill in a
 * disabled fieldset is faded and can't be picked.
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

// A pill's colours: filled when chosen, outlined otherwise. The same weight of text either way, so no pill moves.
const pillColours = {
	chosen: 'border-fill bg-fill text-on-fill',
	plain: 'border-line hover:bg-raised has-disabled:hover:bg-transparent',
};

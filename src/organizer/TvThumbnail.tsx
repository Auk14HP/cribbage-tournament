import { TvScreenView } from '../display/TvScreenView';
import { TvThemePage } from '../display/TvThemePage';
import {
	tvScreenNames,
	type BracketName,
	type Phase,
	type Tournament,
	type TvScreenOnShow,
} from '../tournament';
import { bracketTitles } from '../wording';
import { tvPicture } from './classes';

// The names the Organizer knows the TV's screens by before Start, each its phase's only screen.
const phaseScreenNames: Partial<Record<Phase, string>> = {
	registration: 'Tonight’s Players',
	houseRules: 'House Rules',
	drawShown: 'Tonight’s Draw',
};

// Returns the name of the TV's screen: the phase's own before Start, the one on show from Start.
const nameTvScreen = (tournament: Tournament, onShow: TvScreenOnShow | undefined) =>
	onShow ? tvScreenNames[onShow.screen] : phaseScreenNames[tournament.phase];

// How many numbers pickRandomApartFromMathRandom asks the browser for at a time.
const randomNumberCount = 1;

/*
 * Returns a number from 0 up to 1, as Math.random does, without drawing on Math.random: the
 * browser tests replace Math.random to repeat the Draw, and the thumbnail's Fun Facts
 * mustn't use up its numbers.
 */
const pickRandomApartFromMathRandom = () => {
	const [randomWhole] = crypto.getRandomValues(new Uint32Array(randomNumberCount));
	return randomWhole / 2 ** 32;
};

/*
 * The TV screen on show, drawn as the TV draws it, scaled down to a 16:9 box the panel's width:
 * the box is the screen's frame, so every size on the screen shrinks with it. It is drawn in the
 * TV Theme, its artwork still. A picture, named for the screen, so what it holds isn't read out
 * among the Organizer's own lists and headings. The countdown ring is left off: the strip beneath
 * stands in for it. Once there are brackets to look at, a button covers the picture: pressing it
 * opens them full size, starting from the bracket on show, and under the pointer or the
 * keyboard's focus it says so.
 */
export const TvThumbnail = ({
	tournament,
	onShow,
	bracketOnShow,
	onLook,
}: {
	tournament: Tournament;
	onShow: TvScreenOnShow | undefined;
	bracketOnShow: BracketName;
	onLook: (() => void) | undefined;
}) => (
	<div data-testid="tv thumbnail" className="relative">
		<div
			role="img"
			aria-label={`The TV showing ${nameTvScreen(tournament, onShow)}`}
			className={`border-line w-full rounded-lg border ${tvPicture.frame}`}
		>
			<TvThemePage tournament={tournament} isMoving={false} className="h-full" isHidden>
				<TvScreenView
					tournament={tournament}
					onShow={onShow}
					random={pickRandomApartFromMathRandom}
				/>
			</TvThemePage>
		</div>
		{onLook && (
			<button
				type="button"
				onClick={onLook}
				aria-label={`Look at the ${bracketTitles[bracketOnShow]} full size`}
				className="group absolute inset-0 cursor-zoom-in rounded-lg"
			>
				{/*
				 * The hint darkens the TV picture beneath it and is written in white on it, as the
				 * TV's own colours are, the same in every theme.
				 */}
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

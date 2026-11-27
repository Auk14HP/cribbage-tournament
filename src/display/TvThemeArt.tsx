/*
 * The TV Theme's artwork, each piece in its place: the border along the top of the safe area, the
 * motifs beside a screen's title, the motif in the countdown ring and the one beside each
 * champion's name. Each draws the artwork of the TV Theme its frame is drawn in, or nothing in
 * Classic, which has none, so Classic's screens are laid out as before. Decorative, so hidden from
 * assistive technology. Named for the browser tests, which check the artwork keeps clear of the
 * text and the safe area's margins.
 */
import type { BracketName, TvTheme } from '../tournament';
import type { TvThemeArtwork } from './art/artwork';
import { christmasArtwork } from './art/christmas';
import { useTvTheme } from './tvThemeContext';

// Every TV Theme's artwork: each has its own but Classic, which has none.
const artworks: Record<Exclude<TvTheme, 'classic'>, TvThemeArtwork> = {
	christmas: christmasArtwork,
};

// The artwork of the frame's TV Theme, if it has any, and whether it may move.
const useArtwork = () => {
	const { tvTheme, isMoving } = useTvTheme();
	return { artwork: tvTheme === 'classic' ? undefined : artworks[tvTheme], isMoving };
};

/*
 * The border, along the top of the safe area, in the band the screens start below. Placed in the TV
 * screen's frame, which needs to be positioned.
 */
export const TvThemeBorder = () => {
	const { artwork, isMoving } = useArtwork();
	if (!artwork) {
		return null;
	}
	return (
		<div data-testid="tv theme art" aria-hidden className="absolute inset-x-[5cqw] top-[5cqh]">
			<artwork.Border isMoving={isMoving} />
		</div>
	);
};

// The motifs beside a screen's title, sized and placed by the class given.
export const TvThemeTitleMotifs = ({ className }: { className: string }) => {
	const { artwork, isMoving } = useArtwork();
	if (!artwork) {
		return null;
	}
	return (
		<span data-testid="tv theme art" aria-hidden className={`flex ${className}`}>
			<artwork.TitleMotifs isMoving={isMoving} />
		</span>
	);
};

// The motif in the countdown ring's hole, drawn inside the ring's own picture.
export const TvThemeRingMotif = () => {
	const { artwork } = useArtwork();
	return artwork ? <artwork.RingMotif /> : null;
};

// The motif beside the champion's name of the bracket given, sized by the class given.
export const TvThemeChampionMotif = ({
	bracketName,
	className,
}: {
	bracketName: BracketName;
	className: string;
}) => {
	const { artwork, isMoving } = useArtwork();
	if (!artwork) {
		return null;
	}
	const ChampionMotif = artwork.ChampionMotifs[bracketName];
	return (
		<span data-testid="tv theme art" aria-hidden className={`flex shrink-0 ${className}`}>
			<ChampionMotif isMoving={isMoving} />
		</span>
	);
};

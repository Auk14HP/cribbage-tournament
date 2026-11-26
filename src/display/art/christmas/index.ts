/*
 * Christmas's artwork: a string of lights along the top of the TV, a tree and a wrapped present beside the
 * title, an ornament in the countdown ring and a gold star either side of each champion's name. Drawn for this
 * app in the style every TV Theme shares: flat colours with a darker side for shading, a dark outline and a
 * white glint. The lights twinkle gently when allowed to move.
 */
import type { TvThemeArtwork } from '../artwork';
import { ChampionStar } from './ChampionStar';
import { RingOrnament } from './RingOrnament';
import { StringOfLights } from './StringOfLights';
import { TitleMotifs } from './TitleMotifs';

export const christmasArtwork: TvThemeArtwork = {
	Border: StringOfLights,
	TitleMotifs,
	RingMotif: RingOrnament,
	ChampionMotif: ChampionStar,
};

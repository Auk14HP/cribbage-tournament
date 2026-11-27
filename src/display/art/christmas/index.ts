/*
 * Christmas's artwork: a string of lights along the top of the TV, a tree and a wrapped present beside the
 * title, an ornament in the countdown ring, and either side of each champion's name a gold star for the Winners
 * Bracket's and a snowman for the Losers Bracket's. Drawn for this app in the style every TV Theme shares:
 * flat colours with a darker side for shading, a dark outline, and a white glint on what is glossy, such as a
 * bulb or a bauble. The lights twinkle gently when allowed to move.
 */
import type { TvThemeArtwork } from '../artwork';
import { ChampionStar } from './ChampionStar';
import { RingOrnament } from './RingOrnament';
import { Snowman } from './Snowman';
import { StringOfLights } from './StringOfLights';
import { TitleMotifs } from './TitleMotifs';

export const christmasArtwork: TvThemeArtwork = {
	Border: StringOfLights,
	TitleMotifs,
	RingMotif: RingOrnament,
	ChampionMotifs: { winners: ChampionStar, losers: Snowman },
};

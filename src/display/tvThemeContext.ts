// The TV Theme a TV screen is drawn in, for the artwork inside it to read.
import { createContext, use } from 'react';
import { findTvTheme, type Tournament, type TvTheme } from '../tournament';

/*
 * Set by each frame a TV screen is drawn in: the TV itself, the TV Display's thumbnail
 * and the Bracket peek. Whether the frame's artwork may move goes with it: only the
 * TV's own window animates it.
 */
export const TvThemeContext = createContext<{ tvTheme: TvTheme; isMoving: boolean }>({
	tvTheme: 'classic',
	isMoving: false,
});

// The TV Theme of the frame the caller is drawn in, and whether its artwork may move.
export const useTvTheme = () => use(TvThemeContext);

// Returns the TV Theme the Tournament is drawn in today.
export const findTvThemeToday = (tournament: Tournament): TvTheme =>
	findTvTheme(tournament, new Date());

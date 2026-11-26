/*
 * The TV Theme: the colours and artwork the TV is drawn in. A Tournament is drawn in its month's, unless the
 * Organizer has picked another for the night. A month whose TV Theme isn't made yet has Classic, the TV's plain
 * black look.
 */
import type { Result } from '../result';
import type { Tournament, TvTheme } from './types';

// The names the Organizer knows each TV Theme by.
export const tvThemeNames: Record<TvTheme, string> = {
	classic: 'Classic',
	christmas: 'Christmas',
};

// The month each TV Theme belongs to, 1 for January to 12 for December. Classic belongs to none.
export const tvThemeMonths: Record<Exclude<TvTheme, 'classic'>, number> = {
	christmas: 12,
};

// Every TV Theme: Classic first, then the rest in calendar order, as the palette menu lists them.
export const listTvThemes = (): TvTheme[] => {
	const monthly = Object.entries(tvThemeMonths)
		.sort(([, monthA], [, monthB]) => monthA - monthB)
		.map(([tvTheme]) => tvTheme as TvTheme);
	return ['classic', ...monthly];
};

const isTvTheme = (name: string): name is TvTheme => Object.hasOwn(tvThemeNames, name);

// Returns the TV Theme of a month, 1 to 12: its own, or Classic while it has none.
const findMonthsTvTheme = (month: number): TvTheme =>
	listTvThemes().find((tvTheme) => tvTheme !== 'classic' && tvThemeMonths[tvTheme] === month) ??
	'classic';

/*
 * Returns the TV Theme the TV is drawn in: the Organizer's pick if there is one, else the TV Theme of the
 * Tournament's month, from its date, else, before the first Player registers and sets the date, of today's
 * month.
 */
export const findTvTheme = (tournament: Tournament, today: Date): TvTheme => {
	if (tournament.tvTheme) {
		return tournament.tvTheme;
	}
	const month = tournament.date ? Number(tournament.date.split('-')[1]) : today.getMonth() + 1;
	return findMonthsTvTheme(month);
};

// Picks the TV Theme for tonight, over the month's. A new Tournament starts without a pick.
export const pickTvTheme = (tournament: Tournament, tvTheme: string): Result<Tournament> =>
	isTvTheme(tvTheme)
		? { ok: true, value: { ...tournament, tvTheme } }
		: { ok: false, reason: `There is no TV Theme called ${tvTheme}.` };

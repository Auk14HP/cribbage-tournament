/*
 * The Tournament's title and the night's date, written out so nobody misreads 11/09 as
 * September 11. The date's line keeps its height before the first Player registers and sets it,
 * so the lines below don't move.
 */
import type { Tournament } from '../tournament';

const tournamentTitle = 'Farmstrong Brewery Cribbage Tournament';

// The title's element: the screen's heading, or a line above a heading of the screen's own.
type TitleElement = 'h1' | 'p';

export const TournamentTitle = ({
	tournament,
	titleElement: Title,
}: {
	tournament: Tournament;
	titleElement: TitleElement;
}) => (
	<header>
		<Title className="text-[5cqh] leading-tight font-bold text-balance">
			{tournamentTitle}
		</Title>
		<p className="text-tv-muted mt-[1cqh] min-h-[4cqh] text-[4cqh] leading-none">
			{tournament.date && describeDate(tournament.date)}
		</p>
	</header>
);

// A YYYY-MM-DD date written out in full: "Monday, November 9, 2026".
const describeDate = (date: string): string => {
	const [year, month, dayOfMonth] = date.split('-').map(Number);
	const day = new Date(year, month - 1, dayOfMonth);
	return day.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
};

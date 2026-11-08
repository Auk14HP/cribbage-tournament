/*
 * The app's two routes, under the base path it is served from: `/` under `npm run dev`, `/cribbage-tournament/`
 * on GitHub Pages. The organizer route is the base path itself, on the laptop; the display route is
 * `<base>display`, a second window on the TV. Any other path is elsewhere: main.tsx shows the organizer route
 * there, but sets up no test Players.
 */
type Route = 'organizer' | 'display' | 'elsewhere';

export const makeDisplayPath = (base: string) => `${base}display`;

export const findRoute = (base: string, pathname: string): Route => {
	if (pathname === base) {
		return 'organizer';
	}
	return pathname === makeDisplayPath(base) ? 'display' : 'elsewhere';
};

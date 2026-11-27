import '@fontsource-variable/inter';
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Display } from './display/Display';
import { Organizer } from './organizer/Organizer';
import { findRoute } from './routes';
import { createLocalStorageStore } from './storage';
import { setUpTestTournament } from './testTournament';
import { themeChoiceVersion, type ThemeChoice } from './organizer/themes';
import { tournamentVersion, type Tournament } from './tournament';
import { tvHeartbeatVersion, type TvHeartbeat } from './tvHeartbeat';

const store = createLocalStorageStore<Tournament>('cribbage-tournament', tournamentVersion);
/*
 * The Organizer's theme is the laptop's setting, kept
 * apart from the Tournament so a new one keeps it.
 */
const themeStore = createLocalStorageStore<ThemeChoice>(
	'cribbage-organizer-theme',
	themeChoiceVersion,
);
/*
 * The TV's heartbeat, kept apart from the Tournament too,
 * so a new Tournament doesn't make the TV look closed.
 */
const heartbeatStore = createLocalStorageStore<TvHeartbeat>(
	'cribbage-tv-heartbeat',
	tvHeartbeatVersion,
);
const route = findRoute(import.meta.env.BASE_URL, location.pathname);

/*
 * A stray path shows the organizer route too, but only
 * the organizer route itself sets up test Players.
 */
if (route === 'organizer') {
	setUpTestTournament(store);
}

createRoot(document.querySelector('#app')!).render(
	<StrictMode>
		{route === 'display' ? (
			<Display store={store} heartbeatStore={heartbeatStore} random={Math.random} />
		) : (
			<Organizer store={store} themeStore={themeStore} heartbeatStore={heartbeatStore} />
		)}
	</StrictMode>,
);

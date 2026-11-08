import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Display } from './display/Display';
import { Organizer } from './organizer/Organizer';
import { findRoute } from './routes';
import { createLocalStorageStore } from './storage';
import { setUpTestTournament } from './testTournament';
import { tournamentVersion, type Tournament } from './tournament';

// Two routes under the base path: the organizer route (on the laptop) and the display route (a second window on the TV).
const store = createLocalStorageStore<Tournament>('cribbage-tournament', tournamentVersion);
const route = findRoute(import.meta.env.BASE_URL, location.pathname);

if (route === 'organizer') {
	setUpTestTournament(store);
}

createRoot(document.querySelector('#app')!).render(
	<StrictMode>
		{route === 'display' ? <Display store={store} /> : <Organizer store={store} />}
	</StrictMode>,
);

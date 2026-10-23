import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Display } from './Display';
import { Organizer } from './Organizer';
import { localStorageStore } from './storage';
import { setUpTestNight } from './testNight';
import { tournamentVersion, type Tournament } from './tournament';

// Two routes: the organizer route (/, on the laptop) and the display route (/display, a second window on the TV).
const store = localStorageStore<Tournament>('cribbage-tournament', tournamentVersion);

if (import.meta.env.DEV && location.pathname === '/') {
	setUpTestNight(store);
}

createRoot(document.querySelector('#app')!).render(
	<StrictMode>
		{location.pathname === '/display' ? <Display store={store} /> : <Organizer store={store} />}
	</StrictMode>,
);

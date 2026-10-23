import './style.css'
import { showDisplay } from './display'
import { showOrganizer } from './organizer'
import { localStorageStore } from './storage'
import type { Tournament } from './tournament'

// Two routes: the organizer route (laptop) and the display route (#/display, a second window on the TV).
const store = localStorageStore<Tournament>('cribbage-tournament')
const app = document.querySelector<HTMLDivElement>('#app')!

if (location.hash === '#/display') showDisplay(app, store)
else showOrganizer(app, store)

window.addEventListener('hashchange', () => location.reload())

import { useSyncExternalStore } from 'react';
import type { Store } from './storage';
import { createTournament, type Tournament } from './tournament';

const blank = createTournament();

// The saved Tournament, re-rendering whenever it changes in this window or another.
export const useTournament = (store: Store<Tournament>): Tournament =>
	useSyncExternalStore(store.subscribe, () => store.load() ?? blank);

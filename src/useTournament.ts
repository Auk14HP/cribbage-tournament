import { useSyncExternalStore } from 'react'
import type { Store } from './storage'
import { newTournament, type Tournament } from './tournament'

const blank = newTournament()

// The saved Tournament, re-rendering whenever it changes in this window or another.
export function useTournament(store: Store<Tournament>): Tournament {
  return useSyncExternalStore(store.subscribe, () => store.load() ?? blank)
}

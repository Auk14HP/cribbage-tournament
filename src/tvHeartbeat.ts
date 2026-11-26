/*
 * The TV's heartbeat: while the display route is open, it saves the time every couple of seconds, so the
 * Organizer screen can tell whether the TV window is running. It is saved through the storage seam (ADR-0001)
 * under its own key, never as part of the Tournament, so starting a new Tournament leaves it alone.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Store } from './storage';

// The time the TV window was last seen open, in milliseconds since 1970, as Date.now() gives it.
export type TvHeartbeat = number;

export const tvHeartbeatVersion = 1;

// How often the open TV saves its heartbeat.
const beatMilliseconds = 2000;
/*
 * How recent a heartbeat must be for the TV to count as open: more than two beats, so one beat saved late by a
 * busy window doesn't show the TV closed.
 */
const openMilliseconds = 5000;
// How often the Organizer screen looks again, so a heartbeat that has stopped shows the TV closed soon after.
const checkMilliseconds = 1000;

// Saves the TV's heartbeat now, and every couple of seconds after, until the display route closes.
export const useTvHeartbeat = (store: Store<TvHeartbeat>) => {
	useEffect(() => {
		const beat = () => store.save(Date.now());
		beat();
		const timer = setInterval(beat, beatMilliseconds);
		return () => clearInterval(timer);
	}, [store]);
};

// Whether the TV was last seen recently enough, at the time given, to count as open.
const isTvSeenOpen = (lastSeen: TvHeartbeat | undefined, now: number) =>
	lastSeen !== undefined && now - lastSeen < openMilliseconds;

/*
 * Whether the TV window is open, as the Organizer screen sees it: re-renders when a heartbeat arrives from the
 * TV's window, and looks again every second, so the TV shows closed within a few seconds of its last beat.
 */
export const useIsTvOpen = (store: Store<TvHeartbeat>) => {
	const subscribe = useCallback(
		(listener: () => void) => {
			const unsubscribe = store.subscribe(listener);
			const timer = setInterval(listener, checkMilliseconds);
			return () => {
				unsubscribe();
				clearInterval(timer);
			};
		},
		[store],
	);
	return useSyncExternalStore(subscribe, () => isTvSeenOpen(store.load(), Date.now()));
};

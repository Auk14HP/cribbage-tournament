/*
 * The storage adapter: the single seam between the routes and saved state (ADR-0001).
 * Saves state as JSON in local storage and tells subscribers when it changes, including
 * changes saved by another window (via the browser's storage events). A hosted version
 * would replace only this module.
 */

export interface Store<T> {
	// Returns the same object until the state changes, as React's useSyncExternalStore requires.
	load(): T | undefined;
	save(state: T): void;
	subscribe(listener: () => void): () => void;
}

export const localStorageStore = <T>(key: string): Store<T> => {
	const listeners = new Set<() => void>();

	const read = (): T | undefined => {
		const saved = localStorage.getItem(key);
		if (saved === null) {
			return undefined;
		}
		try {
			return JSON.parse(saved) as T;
		} catch {
			return undefined;
		}
	};

	let current = read();

	window.addEventListener('storage', (event) => {
		if (event.key !== key) {
			return;
		}
		current = read();
		listeners.forEach((listener) => listener());
	});

	return {
		load: () => current,
		save: (state) => {
			localStorage.setItem(key, JSON.stringify(state));
			current = state;
			// Storage events only reach other windows, so tell this window's subscribers directly.
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
};

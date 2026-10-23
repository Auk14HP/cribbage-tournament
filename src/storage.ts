/*
 * The storage adapter: the single seam between the routes and saved state (ADR-0001).
 * Saves state as JSON in local storage and tells subscribers when it changes, including
 * changes saved by another window (via the browser's storage events). A hosted version
 * would replace only this module.
 * Saved state is labelled with the version of its shape; state saved with any other version loads as nothing.
 */

export interface Store<T> {
	// Returns the same object until the state changes, as React's useSyncExternalStore requires.
	load(): T | undefined;
	save(state: T): void;
	subscribe(listener: () => void): () => void;
}

interface Saved<T> {
	readonly version: number;
	readonly state: T;
}

export const localStorageStore = <T>(key: string, version: number): Store<T> => {
	const listeners = new Set<() => void>();

	const read = (): T | undefined => {
		const saved = localStorage.getItem(key);
		if (saved === null) {
			return undefined;
		}
		try {
			const parsed = JSON.parse(saved) as Partial<Saved<T>> | null;
			return parsed?.version === version ? parsed.state : undefined;
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
			localStorage.setItem(key, JSON.stringify({ version, state } satisfies Saved<T>));
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

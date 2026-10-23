// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { localStorageStore } from './storage';

const key = 'storage-test';

afterEach(() => {
	localStorage.clear();
});

describe('the storage adapter', () => {
	it('loads what an earlier window saved with the same version', () => {
		localStorageStore<{ players: string[] }>(key, 2).save({ players: ['Big Dave'] });

		expect(localStorageStore(key, 2).load()).toEqual({ players: ['Big Dave'] });
	});

	it('loads nothing when the saved state is from another version, so the app starts blank', () => {
		localStorageStore<{ players: string[] }>(key, 1).save({ players: ['Big Dave'] });

		expect(localStorageStore(key, 2).load()).toBeUndefined();
	});

	it('loads nothing from state saved before versions were labelled', () => {
		localStorage.setItem(key, JSON.stringify({ players: [{ id: 1, name: 'Big Dave' }] }));

		expect(localStorageStore(key, 2).load()).toBeUndefined();
	});
});

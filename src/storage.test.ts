// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalStorageStore } from './storage';

const key = 'storage-test';
const version = 2;
const olderVersion = version - 1;

afterEach(() => {
	localStorage.clear();
});

describe('the storage adapter', () => {
	it('loads what an earlier window saved with the same version', () => {
		createLocalStorageStore<{ players: string[] }>(key, version).save({
			players: ['Big Dave'],
		});

		expect(createLocalStorageStore(key, version).load()).toEqual({ players: ['Big Dave'] });
	});

	it('loads nothing when the saved state is from another version, so the app starts blank', () => {
		createLocalStorageStore<{ players: string[] }>(key, olderVersion).save({
			players: ['Big Dave'],
		});

		expect(createLocalStorageStore(key, version).load()).toBeUndefined();
	});

	it('loads nothing from state saved before versions were labelled', () => {
		localStorage.setItem(key, JSON.stringify({ players: [{ id: 1, name: 'Big Dave' }] }));

		expect(createLocalStorageStore(key, version).load()).toBeUndefined();
	});
});

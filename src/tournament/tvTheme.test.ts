import { describe, expect, it } from 'vitest';
import {
	createTournament,
	findTvTheme,
	pickTvTheme,
	registerPlayer,
	type Tournament,
} from './index';
import { expectOk } from './testSetup';

const novemberNight = new Date(2026, 10, 9, 19, 30);
const decemberNight = new Date(2026, 11, 17, 19, 30);

// A Tournament whose first Player registered on the night given.
const registerOn = (night: Date) => {
	const blank = createTournament();
	return expectOk(registerPlayer(blank, 'Ron', night));
};

describe('the TV Theme', () => {
	it('is the Tournament’s month’s, from its date, whatever today is', () => {
		const december = registerOn(decemberNight);
		const november = registerOn(novemberNight);

		expect(findTvTheme(december, novemberNight)).toBe('christmas');
		expect(findTvTheme(november, decemberNight)).toBe('classic');
	});

	it('is today’s month’s before the first Player registers', () => {
		const blank = createTournament();

		expect(findTvTheme(blank, decemberNight)).toBe('christmas');
		expect(findTvTheme(blank, novemberNight)).toBe('classic');
	});

	it('is the Organizer’s pick once there is one, and the month’s again after Start a new Tournament', () => {
		const december = registerOn(decemberNight);

		const picked = expectOk(pickTvTheme(december, 'classic'));
		expect(findTvTheme(picked, decemberNight)).toBe('classic');
		const pickedBack = expectOk(pickTvTheme(picked, 'christmas'));
		expect(findTvTheme(pickedBack, decemberNight)).toBe('christmas');

		const newTournament = createTournament();
		expect(findTvTheme(newTournament, decemberNight)).toBe('christmas');
	});

	it('is the month’s when the saved pick names a TV Theme this version doesn’t have', () => {
		const december = registerOn(decemberNight);
		const savedByLaterVersion = { ...december, tvTheme: 'easter' } as unknown as Tournament;

		expect(findTvTheme(savedByLaterVersion, decemberNight)).toBe('christmas');
	});

	it('refuses a pick naming no TV Theme', () => {
		const december = registerOn(decemberNight);

		expect(pickTvTheme(december, 'easter')).toEqual({
			ok: false,
			reason: 'There is no TV Theme called easter.',
		});
	});
});

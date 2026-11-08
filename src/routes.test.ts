import { describe, expect, it } from 'vitest';
import { findRoute } from './routes';

describe('finding the route', () => {
	it('finds the display route under the GitHub Pages base path', () => {
		expect(findRoute('/cribbage-tournament/', '/cribbage-tournament/display')).toBe('display');
	});

	it('finds the organizer route at the base path itself', () => {
		expect(findRoute('/cribbage-tournament/', '/cribbage-tournament/')).toBe('organizer');
	});

	it('finds neither route at another path under the base', () => {
		expect(findRoute('/cribbage-tournament/', '/cribbage-tournament/displays')).toBe(
			'elsewhere',
		);
	});

	it('finds both routes under the dev server, served from the root', () => {
		expect(findRoute('/', '/')).toBe('organizer');
		expect(findRoute('/', '/display')).toBe('display');
	});

	it('finds the display route only under the base it is served from', () => {
		expect(findRoute('/cribbage-tournament/', '/display')).toBe('elsewhere');
	});
});

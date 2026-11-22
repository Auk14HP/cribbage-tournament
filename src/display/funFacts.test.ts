import { describe, expect, it } from 'vitest';
import { funFacts } from './funFacts';

// Every name slot a Fun Fact holds, such as "{A}", each counted once however often it appears.
const listSlots = (fact: string): string[] => [...new Set(fact.match(/\{[^}]*\}/g) ?? [])];

describe('the Fun Fact list', () => {
	it('holds at least 150, enough for 30 minutes of registration at one every 12 seconds, each written once', () => {
		expect(funFacts.length).toBeGreaterThanOrEqual(150);
		expect(new Set(funFacts).size).toBe(funFacts.length);
	});

	it('names no Players, one in {A}, or two in {A} and {B}', () => {
		const validSlots = [[], ['{A}'], ['{A}', '{B}']].map((slots) => slots.join(' '));
		const invalid = funFacts.filter((fact) => {
			const slots = listSlots(fact).sort().join(' ');
			return !validSlots.includes(slots);
		});

		expect(invalid).toEqual([]);
	});

	it('never guesses anyone’s gender', () => {
		const gendered = funFacts.filter((fact) => /\b(he|she|him|her|his|hers)\b/i.test(fact));

		expect(gendered).toEqual([]);
	});

	it('never says “pegged”', () => {
		expect(funFacts.filter((fact) => /pegged/i.test(fact))).toEqual([]);
	});
});

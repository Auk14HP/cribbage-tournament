/*
 * The House Rules step between registration and the Draw: the Organizer announces the House Rules,
 * and the TV shows them one at a time as they go. The Tournament saves how many are shown, so both
 * windows resume where they were.
 */
import type { Result } from '../result';
import type { Tournament } from './types';

/*
 * The Tournament's own rules of play, the same every night, in the order the
 * Organizer announces them.
 */
export const houseRules: readonly string[] = [
	'31 scores 2 points. No extra point for the go.',
	'No muggins. Don’t claim points your opponent misses.',
	'Lose your first game? You’re welcome to stay for the Losers Bracket.',
	'Tell the Organizer who won as soon as your game ends.',
];

const notOnHouseRulesStep: Result<Tournament> = {
	ok: false,
	reason: 'The House Rules are shown only between registration and the Draw.',
};

const allShown: Result<Tournament> = { ok: false, reason: 'Every House Rule is already shown.' };

/*
 * Closes registration's screen for the House Rules step, showing as many
 * House Rules as when last left.
 */
export const showHouseRules = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase !== 'registration') {
		return notOnHouseRulesStep;
	}
	return { ok: true, value: { ...tournament, phase: 'houseRules' } };
};

/*
 * Returns to registration, so a late arrival can be entered. The House Rules
 * shown are kept for the return.
 */
export const goBackToRegistration = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase !== 'houseRules') {
		return notOnHouseRulesStep;
	}
	return { ok: true, value: { ...tournament, phase: 'registration' } };
};

export const showNextHouseRule = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase !== 'houseRules') {
		return notOnHouseRulesStep;
	}
	if (tournament.shownHouseRuleCount === houseRules.length) {
		return allShown;
	}
	return {
		ok: true,
		value: { ...tournament, shownHouseRuleCount: tournament.shownHouseRuleCount + 1 },
	};
};

// Hides the House Rule shown last, down to none.
export const hideLastHouseRule = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase !== 'houseRules') {
		return notOnHouseRulesStep;
	}
	if (tournament.shownHouseRuleCount === 0) {
		return { ok: false, reason: 'No House Rule is shown yet.' };
	}
	return {
		ok: true,
		value: { ...tournament, shownHouseRuleCount: tournament.shownHouseRuleCount - 1 },
	};
};

export const showAllHouseRules = (tournament: Tournament): Result<Tournament> => {
	if (tournament.phase !== 'houseRules') {
		return notOnHouseRulesStep;
	}
	if (tournament.shownHouseRuleCount === houseRules.length) {
		return allShown;
	}
	return { ok: true, value: { ...tournament, shownHouseRuleCount: houseRules.length } };
};

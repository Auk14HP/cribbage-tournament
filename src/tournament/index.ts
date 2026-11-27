/*
 * The Tournament core: owns every rule, knows nothing about the UI or the browser. A Tournament is
 * plain, JSON-serialisable data; commands return a new Tournament or a reason for refusing. How
 * callers read it: CODING_STANDARDS.md, "The Tournament core".
 *
 * Callers import the core from here. Its files, each holding one concept, import only from the
 * files above them in this list, so they never import in a cycle: types, tvTheme, tvScreen,
 * bracket, registration, houseRules, seating, draw, results, views.
 */
export {
	createTournament,
	tournamentVersion,
	type BoardNumber,
	type BoardTaken,
	type BracketName,
	type Bye,
	type Draw,
	type FirstRoundMatch,
	type HeldPlace,
	type HomeBoard,
	type MatchPlace,
	type MatchResult,
	type Phase,
	type Player,
	type PlayerId,
	type Random,
	type StayingAnswer,
	type Tournament,
	type TvChoice,
	type TvCycleStart,
	type TvScreen,
	type TvTheme,
} from './types';
export { findTvTheme, listTvThemes, pickTvTheme, tvThemeMonths, tvThemeNames } from './tvTheme';
export {
	chooseTvScreen,
	findTvScreenOnShow,
	listTvScreens,
	restartTvCycleIfDue,
	tvScreenNames,
	type TvScreenOnShow,
} from './tvScreen';
export { getMatchKey, hasLostIn } from './bracket';
export {
	clearHomeBoard,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	setHomeBoard,
	setScreenSeconds,
} from './registration';
export {
	goBackToRegistration,
	hideLastHouseRule,
	houseRules,
	showAllHouseRules,
	showHouseRules,
	showNextHouseRule,
} from './houseRules';
export { makeDraw, start, swapPlayers } from './draw';
export { isLosersBracketOpenTo, recordForfeit, recordWinner, undoResult } from './results';
export {
	getShownRound,
	getBracketPicture,
	getChampions,
	getMatchesOnBoards,
	getUndoableResults,
	getWaitingForBoard,
	type BracketMatch,
	type BracketPlayer,
	type BracketPicture,
	type ChampionOfBracket,
	type MatchOnBoard,
	type MatchWaitingForBoard,
	type Opponent,
	type PlaceHeld,
	type RecordedResult,
	type ShownRound,
	type WinnerOf,
} from './views';

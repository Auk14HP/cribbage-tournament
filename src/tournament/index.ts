/*
 * The Tournament core: owns every rule, knows nothing about the UI or the browser.
 * A Tournament is plain, JSON-serialisable data; commands return a new Tournament or a reason for refusing.
 * How callers read it: CODING_STANDARDS.md, "The Tournament core".
 *
 * Callers import the core from here. Its files, each holding one concept, import only from the files above
 * them in this list, so they never import in a cycle: types, tvScreen, bracket, registration, seating, draw,
 * results, views.
 */
export {
	createTournament,
	tournamentVersion,
	type BoardNumber,
	type BoardTaken,
	type Bracket,
	type BracketName,
	type Bye,
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
	type TvScreen,
} from './types';
export { chooseTvScreen, listTvScreens, tvScreenNames } from './tvScreen';
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
export { makeDraw, start } from './draw';
export { isLosersBracketOpenTo, recordForfeit, recordWinner, undoResult } from './results';
export {
	getBracketPicture,
	getMatchesOnBoards,
	getNowPlaying,
	getUndoableResults,
	getWaitingForBoard,
	type BracketMatch,
	type BracketPicture,
	type MatchBeingPlayed,
	type MatchOnBoard,
	type MatchWaitingForBoard,
	type Opponent,
	type PlaceHeld,
	type RecordedResult,
	type WinnerOf,
} from './views';

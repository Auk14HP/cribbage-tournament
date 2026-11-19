// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Display } from './Display';
import { funFacts } from './funFacts';
import type { Result } from '../result';
import { createLocalStorageStore, type Store } from '../storage';
import { listWaitingText } from '../screenTestHelpers';
import { getPlayerName } from '../wording';
import {
	makeDraw,
	getMatchesOnBoards,
	getWaitingForBoard,
	chooseTvScreen,
	createTournament,
	goBackToRegistration,
	hideLastHouseRule,
	showAllHouseRules,
	showHouseRules,
	showNextHouseRule,
	recordWinner,
	registerPlayer,
	removePlayer,
	renamePlayer,
	setBoardCount,
	setScreenSeconds,
	start,
	tournamentVersion,
	type BracketName,
	type Player,
	type Tournament,
} from '../tournament';
import {
	createSeededRandom,
	expectOk,
	findMatchOf,
	hasBothPlayersKnown,
	playDrawStaying,
	registerPlayers,
	setUpHeldPlace,
} from '../tournament/testSetup';

const key = 'display-test';

const tournamentTitle = 'Farmstrong Brewery Cribbage Tournament';

// The evening of the brewery's first Tournament.
const monday = new Date(2026, 10, 9, 19, 30);

afterEach(() => {
	vi.useRealTimers();
	cleanup();
	localStorage.clear();
});

describe('the display route', () => {
	it('shows registered Players and the count, updating when the Tournament is saved', () => {
		const store = showDisplay();
		expect(screen.getByText('0 Players registered')).toBeInTheDocument();

		const registered = registerPlayer(createTournament(), 'Big Dave');
		if (!registered.ok) {
			throw new Error(registered.reason);
		}
		act(() => store.save(registered.value));

		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			'Big Dave',
		]);
	});

	it('opens with the Tournament’s title and the night’s date, written out', () => {
		const store = showDisplay();
		expect(readHeading()).toBe(tournamentTitle);

		const registered = registerPlayer(createTournament(), 'Ron', monday);
		saveOutcome(store, registered);

		expect(readHeading()).toBe(tournamentTitle);
		expect(screen.getByText('Monday, November 9, 2026')).toBeInTheDocument();
		expect(screen.getByText('1 Player registered')).toBeInTheDocument();
	});
});

describe('the Fun Fact line', () => {
	it('shows a Fun Fact on the Players screen, changing every 12 seconds', () => {
		vi.useFakeTimers();
		showDisplay();
		const firstFunFact = readFunFact();
		expect(firstFunFact).toMatch(/^Fun fact: /);

		waitSeconds(11);
		expect(readFunFact()).toBe(firstFunFact);
		waitSeconds(1);
		expect(readFunFact()).not.toBe(firstFunFact);
	});

	it('names nobody while nobody is registered, and repeats none until every one that fits has been used', () => {
		vi.useFakeTimers();
		showDisplay();
		const namelessCount = funFacts.filter((fact) => !fact.includes('{A}')).length;

		const shownFacts = collectFunFacts(namelessCount + 1, []);

		const firstPass = shownFacts.slice(0, namelessCount);
		expect(firstPass.every(({ names }) => names.length === 0)).toBe(true);
		expect(new Set(firstPass.map(({ fact }) => fact)).size).toBe(namelessCount);
		// The next pass begins with a fact from the last one.
		const nextPassFact = shownFacts[namelessCount].fact;
		expect(firstPass.map(({ fact }) => fact)).toContain(nextPassFact);
	});

	it('names a lone Player only in one-name facts, never in two facts in a row', () => {
		vi.useFakeTimers();
		const registered = registerPlayers('Ron');
		showDisplay(registered);

		const shownFacts = collectFunFacts(40, registered.players);

		expect(shownFacts.every(({ names }) => names.length <= 1)).toBe(true);
		expect(shownFacts.some(({ names }) => names.includes('Ron'))).toBe(true);
		expect(findNamedTwiceInARow(shownFacts)).toEqual([]);
	});

	it('picks the names fresh each time, reaching every Player, never the same Player in two facts in a row', () => {
		vi.useFakeTimers();
		const registered = registerPlayers('Ron', 'Sue', 'Joe', 'Bev');
		showDisplay(registered);

		const shownFacts = collectFunFacts(80, registered.players);

		const namedPlayers = new Set(shownFacts.flatMap(({ names }) => names));
		expect([...namedPlayers].sort()).toEqual(['Bev', 'Joe', 'Ron', 'Sue']);
		expect(shownFacts.some(({ names }) => names.length === 2)).toBe(true);
		expect(findNamedTwiceInARow(shownFacts)).toEqual([]);
	});

	it('shows a named Player’s new name at once, and replaces a fact naming a removed Player at once', () => {
		vi.useFakeTimers();
		let tournament = registerPlayers('Ron', 'Sue', 'Joe', 'Bev');
		const store = showDisplay(tournament);
		while (parseFunFact(tournament.players).names.length === 0) {
			waitSeconds(12);
		}
		const { fact, names } = parseFunFact(tournament.players);
		const named = tournament.players.find((p) => p.name === names[0])!;

		tournament = expectOk(renamePlayer(tournament, named.id, 'Ronnie-Lou'));
		act(() => store.save(tournament));
		const renamed = parseFunFact(tournament.players);
		expect(renamed.fact).toBe(fact);
		expect(renamed.names).toContain('Ronnie-Lou');

		tournament = expectOk(removePlayer(tournament, named.id));
		act(() => store.save(tournament));
		const replaced = parseFunFact(tournament.players);
		expect(replaced.fact).not.toBe(fact);
		expect(replaced.names).not.toContain('Ronnie-Lou');
	});

	it('is gone once the Organizer moves on from registration', () => {
		vi.useFakeTimers();
		const registered = registerPlayers('Ron', 'Sue');
		const store = showDisplay(registered);
		expect(readFunFact()).toMatch(/^Fun fact: /);

		saveOutcome(store, showHouseRules(registered));

		expect(screen.queryByText(/^Fun fact: /)).not.toBeInTheDocument();
		waitSeconds(13);
		expect(screen.queryByText(/^Fun fact: /)).not.toBeInTheDocument();
	});
});

describe('the House Rules screen', () => {
	it('shows its heading and a live count of the Players tonight, with no House Rule until the first is shown', () => {
		const store = showDisplay();
		const registered = registerPlayers('Big Dave');

		saveOutcome(store, showHouseRules(registered));

		expect(readHeading()).toBe('House Rules');
		expect(screen.getByText('1 Player tonight')).toBeInTheDocument();
		expect(screen.queryAllByRole('listitem')).toEqual([]);

		const backAtRegistration = expectOk(goBackToRegistration(store.load()!));
		const withLateArrival = expectOk(registerPlayer(backAtRegistration, 'Sue'));
		saveOutcome(store, showHouseRules(withLateArrival));

		expect(screen.getByText('2 Players tonight')).toBeInTheDocument();
	});

	it('shows only the House Rules shown so far, in order, the latest emphasized, updating live', () => {
		const store = showDisplay();
		const registered = registerPlayers('Big Dave', 'Sue');
		let tournament = expectOk(showHouseRules(registered));
		tournament = expectOk(showNextHouseRule(tournament));
		tournament = expectOk(showNextHouseRule(tournament));

		act(() => store.save(tournament));

		expect(listHouseRulesText()).toEqual([
			'31 scores 2 points. No extra point for the go.',
			'No muggins. Don’t claim points your opponent misses.',
		]);
		expect(findLatestHouseRule()).toHaveTextContent('No muggins.');

		saveOutcome(store, hideLastHouseRule(tournament));
		expect(listHouseRulesText()).toEqual(['31 scores 2 points. No extra point for the go.']);
		expect(findLatestHouseRule()).toHaveTextContent('31 scores 2 points.');

		saveOutcome(store, showAllHouseRules(tournament));
		expect(listHouseRulesText()).toHaveLength(4);
		expect(findLatestHouseRule()).toHaveTextContent(
			'Tell the Organizer who won as soon as your game ends.',
		);
	});

	it('gives way to Tonight’s Players on going back to registration, returns with the same House Rules shown, and gives way to Tonight’s Draw once the Draw is made', () => {
		const store = showDisplay();
		const registered = registerPlayers('Big Dave', 'Sue');
		const withBoards = expectOk(setBoardCount(registered, '1'));
		let tournament = expectOk(showHouseRules(withBoards));
		tournament = expectOk(showNextHouseRule(tournament));
		tournament = expectOk(showNextHouseRule(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('House Rules');

		tournament = expectOk(goBackToRegistration(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe(tournamentTitle);

		tournament = expectOk(showHouseRules(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('House Rules');
		expect(listHouseRulesText()).toEqual([
			'31 scores 2 points. No extra point for the go.',
			'No muggins. Don’t claim points your opponent misses.',
		]);

		const random = createSeededRandom(1);
		saveOutcome(store, makeDraw(tournament, random));
		expect(readHeading()).toBe('Tonight’s Draw');
	});
});

describe('Tonight’s Draw screen', () => {
	it('shows every Match with its Board, including a Bye Player waiting for a winner, until Start', () => {
		const store = showDisplay();
		const tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 3 });

		act(() => store.save(tournament));

		/*
		 * 5 Players: a first-Round Match on Board 1, a Bye Player at Board 2 waiting for its winner, and a
		 * Match between the other two Bye Players on Board 3.
		 */
		const draw = getMatchesOnBoards(tournament);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tonight’s Draw');
		const cards = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(cards.map((card) => card.textContent)).toEqual(
			draw.map(
				({ board, players: [playerA, playerB] }) =>
					`Board ${board}${playerA.name}${getPlayerName(playerB)}`,
			),
		);
		const [byePlayer] = draw.find((m) => !('name' in m.players[1]))!.players;
		const byeCard = cards.find((card) => card.textContent!.includes(byePlayer.name))!;
		const firstMatch = draw.find((m) => m.match.round === 1)!;
		const [playerA, playerB] = firstMatch.players as [Player, Player];
		expect(byeCard).toHaveTextContent(`Winner of ${playerA.name} / ${playerB.name}`);

		const started = expectOk(start(tournament));
		act(() => store.save(started));

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
	});

	it('lists the Matches waiting for a Board beneath, when the Draw opens more Matches than there are Boards', () => {
		const store = showDisplay();
		/*
		 * 5 Players on 2 Boards: the first-Round Match and the Bye Players' Match take the Boards, and the
		 * Bye Player waiting for a winner waits for a Board too.
		 */
		const tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 2 });

		act(() => store.save(tournament));

		const [waiting] = getWaitingForBoard(tournament);
		expect(listWaitingText()).toEqual([
			`${waiting.players[0].name} vs ${getPlayerName(waiting.players[1])}`,
		]);
	});
});

describe('the Winners Bracket screen', () => {
	it('shows the bracket after Start, with Bye Players in Round 2, updating live', () => {
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue'], { boards: 2 });
		let tournament = expectOk(start(drawn));
		const seatedMatches = getMatchesOnBoards(tournament);
		const firstMatch = seatedMatches.find(hasBothPlayersKnown)!;
		const [playerA, playerB] = firstMatch.players as [Player, Player];
		const [byePlayer] = seatedMatches.find((m) => m !== firstMatch)!.players;
		const recordWinnerOf = (match: typeof firstMatch.match, winner: Player) => {
			tournament = expectOk(recordWinner(tournament, match, winner.id, 'leaving'));
			act(() => store.save(tournament));
		};
		// What a Round's column shows, a Match per item.
		const listRound = (name: string) =>
			screen
				.getAllByRole('list', { name })
				.flatMap((list) => within(list).queryAllByRole('listitem'))
				.map((item) => item.textContent);

		act(() => store.save(tournament));

		// 3 Players in a 4-place bracket: one first-Round Match, and a Bye Player waiting in the final.
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Winners Bracket');
		expect(listRound('Round 1')).toEqual([`Board 1${playerA.name}${playerB.name}`]);
		expect(listRound('Final')).toEqual([`Board 2—${byePlayer.name}`]);
		expect(screen.queryByText(/Champion/)).not.toBeInTheDocument();

		recordWinnerOf(firstMatch.match, playerA);
		expect(listRound('Final')).toEqual([`Board 2${playerA.name}${byePlayer.name}`]);
	});
});

describe('the TV cycle', () => {
	it('holds Tonight’s Draw until Start, then cycles the Winners Bracket and Now playing, each for the set time', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		let tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 3 });
		act(() => store.save(tournament));

		waitSeconds(60);
		expect(readHeading()).toBe('Tonight’s Draw');

		tournament = expectOk(start(tournament));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(19);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readHeading()).toBe('Now playing');

		/*
		 * 5 Players: a first-Round Match on Board 1, a Bye Player at Board 2 waiting for its winner, and a
		 * Match between the other two Bye Players on Board 3. The waiting Player isn't playing yet.
		 */
		const playing = getMatchesOnBoards(tournament).filter(hasBothPlayersKnown);
		const firstMatch = playing.find((m) => m.match.round === 1)!;
		const byes = playing.find((m) => m !== firstMatch)!;
		const describeCard = ({ board, players: [playerA, playerB] }: typeof firstMatch) =>
			`Board ${board}${playerA.name}${(playerB as Player).name}`;
		const cards = within(screen.getByRole('list', { name: 'Matches' })).getAllByRole(
			'listitem',
		);
		expect(cards.map((card) => card.textContent)).toEqual([
			describeCard(firstMatch),
			describeCard(byes),
		]);

		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');

		// A new time takes effect without a refresh, restarting the screen on show.
		tournament = expectOk(setScreenSeconds(tournament, '5'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(4);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readHeading()).toBe('Now playing');
	});

	it('shows a countdown ring that fills over each screen’s time and starts again with each screen and each new time', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		expect(readHeading()).toBe(tournamentTitle);
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();
		let tournament = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 3 });
		act(() => store.save(tournament));
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();

		tournament = expectOk(start(tournament));
		act(() => store.save(tournament));
		const firstCountdownRing = screen.getByTestId('countdown ring');
		expect(firstCountdownRing).toHaveAttribute('aria-hidden', 'true');
		expect(firstCountdownRing).toHaveStyle({ '--countdown-duration': '20s' });
		waitSeconds(19);
		expect(screen.getByTestId('countdown ring')).toBe(firstCountdownRing);
		waitSeconds(1);
		const secondCountdownRing = screen.getByTestId('countdown ring');
		expect(secondCountdownRing).not.toBe(firstCountdownRing);
		expect(secondCountdownRing).toHaveStyle({ '--countdown-duration': '20s' });

		// A new time restarts the screen on show, and the ring with it.
		waitSeconds(10);
		tournament = expectOk(setScreenSeconds(tournament, '5'));
		act(() => store.save(tournament));
		const restartedCountdownRing = screen.getByTestId('countdown ring');
		expect(restartedCountdownRing).not.toBe(secondCountdownRing);
		expect(restartedCountdownRing).toHaveStyle({ '--countdown-duration': '5s' });
	});
});

describe('a Held screen', () => {
	it('holds the chosen screen with no countdown ring, then on Auto keeps it for a fresh screen time before moving on', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 3 });
		let tournament = expectOk(start(drawn));
		act(() => store.save(tournament));
		waitSeconds(10);

		tournament = expectOk(chooseTvScreen(tournament, 'nowPlaying'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Now playing');
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();
		waitSeconds(21);
		expect(readHeading()).toBe('Now playing');

		tournament = expectOk(chooseTvScreen(tournament, 'auto'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Now playing');
		expect(screen.getByTestId('countdown ring')).toBeInTheDocument();
		waitSeconds(19);
		expect(readHeading()).toBe('Now playing');
		waitSeconds(1);
		expect(readHeading()).toBe('Winners Bracket');
	});

	it('stays held through the final’s result when the finished Tournament has it, and Auto then cycles on to the champion', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave'], { boards: 1 });
		const started = expectOk(start(drawn));
		let tournament = expectOk(chooseTvScreen(started, 'winnersBracket'));
		const [final] = getMatchesOnBoards(tournament);
		const champion = final.players[0];

		tournament = expectOk(recordWinner(tournament, final.match, champion.id, 'leaving'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(60);
		expect(readHeading()).toBe('Winners Bracket');

		tournament = expectOk(chooseTvScreen(tournament, 'auto'));
		act(() => store.save(tournament));
		waitSeconds(19);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(1);
		expect(readHeading()).toBe('Tonight’s Champion');
	});

	it('is still held when the TV is reloaded', () => {
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe'], { boards: 3 });
		const started = expectOk(start(drawn));
		const holding = expectOk(chooseTvScreen(started, 'nowPlaying'));
		act(() => store.save(holding));

		cleanup();
		showDisplay();

		expect(readHeading()).toBe('Now playing');
		expect(screen.queryByTestId('countdown ring')).not.toBeInTheDocument();
	});
});

describe('the champion screen', () => {
	it('shows the champion once the final has a winner, under the title and the night’s date, then cycles it with the finished bracket', () => {
		vi.useFakeTimers({ now: monday });
		const store = showDisplay();
		const drawn = setUpDraw(['Dave K.', 'Big Dave'], { boards: 1 });
		let tournament = expectOk(start(drawn));
		const [final] = getMatchesOnBoards(tournament);
		const champion = final.players[0];

		tournament = expectOk(recordWinner(tournament, final.match, champion.id, 'leaving'));
		act(() => store.save(tournament));

		// With no Losers Bracket played, the night has one champion.
		expect(readHeading()).toBe('Tonight’s Champion');
		expect(screen.getByText(tournamentTitle)).toBeInTheDocument();
		expect(screen.getByText('Monday, November 9, 2026')).toBeInTheDocument();
		expect(screen.getByText(champion.name)).toBeInTheDocument();
		expect(screen.getByTestId('countdown ring')).toBeInTheDocument();

		// The brackets keep their space for Matches.
		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
		expect(screen.queryByText(tournamentTitle)).not.toBeInTheDocument();
		expect(screen.getByText(`Champion: ${champion.name}`)).toBeInTheDocument();
		expect(screen.getByTestId('countdown ring')).toBeInTheDocument();

		waitSeconds(20);
		expect(readHeading()).toBe('Tonight’s Champion');
	});
});

describe('the Losers Bracket', () => {
	it('joins the TV cycle once drawn, after the Winners Bracket, with Matches waiting for a Board beneath Now playing', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		/*
		 * 6 Players on 3 Boards: once the Draw's three Matches are played and their losers stay, the
		 * Losers Bracket is one Match on a Board and a Bye Player waiting for one.
		 */
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann', 'Joe', 'Bev'], { boards: 3 });
		const started = expectOk(start(drawn));
		const tournament = playDrawStaying(started);
		const [waiting] = getWaitingForBoard(tournament);
		act(() => store.save(tournament));

		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		// One Round 1 Match, in the bracket's left half, and a Bye in its right.
		const [leftRoundOne] = screen.getAllByRole('list', { name: 'Round 1' });
		const losersMatch = getMatchesOnBoards(tournament).find(
			(m) => m.match.bracket === 'losers',
		)!;
		expect(leftRoundOne).toHaveTextContent(`Board ${losersMatch.board}`);
		waitSeconds(20);
		expect(readHeading()).toBe('Now playing');
		expect(listWaitingText()).toEqual([
			`${waiting.players[0].name} vs ${getPlayerName(waiting.players[1])}`,
		]);
		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
	});

	it('names the Bye Player a Held Place is held for, faded with a question mark, until their first Match is decided', () => {
		const store = showDisplay();
		// Cat, a Bye Player, waits for Ann; Bob and Eve lost and stay, and the Losers Draw holds Cat a place.
		const heldPlace = setUpHeldPlace(['staying', 'staying']);
		const { ann, cat } = heldPlace;
		let tournament = expectOk(chooseTvScreen(heldPlace.tournament, 'losersBracket'));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Losers Bracket');

		const heldName = screen.getByText(`${cat.name}?`);
		expect(heldName).toHaveClass('italic');
		// The Player still to come from the Held Place's Match is a dash.
		const [finalMatch] = within(screen.getByRole('list', { name: 'Final' })).getAllByRole(
			'listitem',
		);
		expect(finalMatch).toHaveTextContent('—');

		// Cat loses to Ann and stays, so the Held Place is Cat's.
		const annAndCat = findMatchOf(tournament, cat);
		tournament = expectOk(recordWinner(tournament, annAndCat.match, ann.id, 'staying'));
		act(() => store.save(tournament));

		const [leftRoundOne] = screen.getAllByRole('list', { name: 'Round 1' });
		expect(leftRoundOne).toHaveTextContent(cat.name);
		expect(screen.queryByText(`${cat.name}?`)).not.toBeInTheDocument();
	});

	it('shows a finished bracket’s champion while the other plays on, then names both champions', () => {
		vi.useFakeTimers();
		const store = showDisplay();
		// 4 Players: both first-Round losers stay, and meet in the Losers Bracket.
		const drawn = setUpDraw(['Dave K.', 'Big Dave', 'Sue', 'Ann'], { boards: 2 });
		const started = expectOk(start(drawn));
		let tournament = playDrawStaying(started);
		const findFinal = (bracket: BracketName) =>
			getMatchesOnBoards(tournament).find((m) => m.match.bracket === bracket)!;
		const winnersFinal = findFinal('winners');
		const losersFinal = findFinal('losers');
		const [winnersChampion] = winnersFinal.players as [Player, Player];
		const [losersChampion] = losersFinal.players as [Player, Player];

		tournament = expectOk(recordWinner(tournament, winnersFinal.match, winnersChampion.id));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Winners Bracket');
		expect(screen.getByText(`Champion: ${winnersChampion.name}`)).toBeInTheDocument();
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		expect(screen.queryByText(/Champion/)).not.toBeInTheDocument();

		tournament = expectOk(recordWinner(tournament, losersFinal.match, losersChampion.id));
		act(() => store.save(tournament));
		expect(readHeading()).toBe('Tonight’s Champions');
		const winnersLine = screen.getByText('Winners Bracket').parentElement;
		const losersLine = screen.getByText('Losers Bracket').parentElement;
		expect(winnersLine).toHaveTextContent(winnersChampion.name);
		expect(losersLine).toHaveTextContent(losersChampion.name);
		waitSeconds(20);
		expect(readHeading()).toBe('Winners Bracket');
		waitSeconds(20);
		expect(readHeading()).toBe('Losers Bracket');
		expect(screen.getByText(`Champion: ${losersChampion.name}`)).toBeInTheDocument();
		waitSeconds(20);
		expect(readHeading()).toBe('Tonight’s Champions');
	});
});

/*
 * The display route, against the real storage adapter, opened on the Tournament given, if any. Saving to the
 * store stands in for the Organizer. Fun Facts are chosen by a seeded random source.
 */
const showDisplay = (saved?: Tournament): Store<Tournament> => {
	const store = createLocalStorageStore<Tournament>(key, tournamentVersion);
	if (saved) {
		store.save(saved);
	}
	const random = createSeededRandom(1);
	render(<Display store={store} random={random} />);
	return store;
};

// The Fun Fact line's text, "Fun fact:" included.
const readFunFact = () => screen.getByText(/^Fun fact: /).textContent;

// A Fun Fact as shown: the line it was written as, and the names filling its slots.
type ShownFunFact = { fact: string; names: string[] };

/*
 * Works out which Fun Fact the line shows, and the registered Players it names, by matching it against
 * each line written, its name slots standing for any registered Player.
 */
const parseFunFact = (players: readonly Player[]): ShownFunFact => {
	const shown = readFunFact()!.replace(/^Fun fact: /, '');
	const names = players.map((p) => escapeRegExp(p.name)).join('|');
	for (const fact of funFacts) {
		const slots = fact.match(/\{[AB]\}/g) ?? [];
		const pattern = escapeRegExp(fact).replace(/\\\{[AB]\\\}/g, `(${names})`);
		const match = new RegExp(`^${pattern}$`).exec(shown);
		if (match && (slots.length === 0 || names !== '')) {
			return { fact, names: [...new Set(match.slice(1))] };
		}
	}
	throw new Error(`Not a Fun Fact naming registered Players: ${shown}`);
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The Fun Facts shown, one every 12 seconds, starting with the one on show.
const collectFunFacts = (count: number, players: readonly Player[]): ShownFunFact[] => {
	const shownFacts = [];
	for (let i = 0; i < count; i++) {
		shownFacts.push(parseFunFact(players));
		waitSeconds(12);
	}
	return shownFacts;
};

// Each Player named in two Fun Facts in a row.
const findNamedTwiceInARow = (shownFacts: readonly ShownFunFact[]): string[] =>
	shownFacts.slice(1).flatMap(({ names }, i) => {
		const previous = shownFacts[i].names;
		return names.filter((name) => previous.includes(name));
	});

/*
 * A Tournament with the named Players registered, that many Boards set out, and the Draw made, shuffled by
 * a seeded random source.
 */
const setUpDraw = (names: readonly string[], { boards }: { boards: number }): Tournament => {
	const registered = registerPlayers(...names);
	const typed = String(boards);
	const withBoards = expectOk(setBoardCount(registered, typed));
	const onHouseRules = expectOk(showHouseRules(withBoards));
	const random = createSeededRandom(1);
	return expectOk(makeDraw(onHouseRules, random));
};

// Saves the Tournament a command made, as the Organizer's window does.
const saveOutcome = (store: Store<Tournament>, outcome: Result<Tournament>) => {
	act(() => store.save(expectOk(outcome)));
};

// The House Rules the TV shows, in order.
const listHouseRulesText = () => screen.queryAllByRole('listitem').map((item) => item.textContent);

// The House Rule shown last, which the TV emphasizes.
const findLatestHouseRule = () =>
	screen.getAllByRole('listitem').find((item) => item.getAttribute('aria-current') === 'true');

const readHeading = () => screen.getByRole('heading', { level: 1 }).textContent;

// Moves the fake clock on, as the TV waits between screens.
const waitSeconds = (seconds: number) => {
	act(() => {
		vi.advanceTimersByTime(seconds * 1000);
	});
};

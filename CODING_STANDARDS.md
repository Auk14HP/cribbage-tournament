# Coding standards

Judgement calls for review. Anything mechanical is enforced by `npm run check` (ESLint, Prettier, TypeScript) instead of written here. Architecture decisions live in `docs/adr/`; domain words in `GLOSSARY.md`.

## Naming

- Give every function a verb-first name (`createTournament`, `findNameRefusal`), including helpers and test helpers, so it is never mistaken for a value. A predicate starts with `is` or `has`. ESLint has no rule that can check this.
- Name every value for what it holds, in code and tests alike: a locator for the element it finds (`championHeading`), not the screen that element suggests. One of several, taken by its place, carries its place and what it is: `firstMatch`, `firstRow`, `firstCountdownRing`, never `first` alone. A locator that finds a different element each time it is used is named for the one it finds then (`nextWinnerButton`, used in a loop).
- Say which one a name means wherever two could be confused. A number of things ends in `Count` (`boardCount`); a plural (`boards`) is the things themselves. Two Players side by side are `playerA` and `playerB`, never `a` and `b`. A prop or field qualifies a generic word with its subject: `bracketName` beside a Player's `name`. A single letter is for a one-line callback's parameter alone (`matches.find((m) => …)`).
- Name a type or state for what it holds, not for an activity: `ResultAwaitingStayingAnswer`, not `Asking`.
- Name a test helper for the role it finds, not for the test data that fills it: `findByePlayer`, not `findCat`.
- Give a step whose job isn't obvious at a glance a named helper: `isShownWithin(heading, 5000)` says what `.then(() => true, () => false)` leaves the reader to work out.
- React components and hooks keep React's conventions: a component is a PascalCase noun (`Organizer`), a hook starts with `use` (`useTournament`).
- A change that introduces a domain word, on screen or in code, adds its `GLOSSARY.md` entry in the same PR. The word shares nothing with another glossary term it could be read as: "Match laptop" reads as a **Match**, so the Theme choice is Same as laptop.

## Readability

- Don't nest a call two or more levels deep inside another call's arguments: name the inner result first, so each line does one thing and the name says what it is. Write `const dialog = within(screen.getByRole('dialog'))` and then `user.click(dialog.getByRole('button', { name }))`, not `user.click(within(screen.getByRole('dialog')).getByRole('button', { name }))`. One level is fine: `expect(screen.getByRole('heading')).toHaveTextContent('Now playing')`. A callback's body starts afresh: `matches.find((m) => m.players.every(isKnown))` nests nothing. ESLint catches a call nested in arguments two deep; a call made on a call's result, like `within(...)` above, is left to review.
- Name a number or boolean literal at the call when the function's name doesn't say what it is. A function in this repo takes it in an options object: `startTournament({ players: 5, boards: 4 })`, not `startTournament(5, 4)`. A call into code we don't own, or a value used more than once, names it in a const first. A literal can stay bare when the function's name says what it is (`waitSeconds(3)`, `playUntilMatchesLeft(page, 0)`) or when the order doesn't matter or is well known (`Math.min(a, b)`, `slice(0, 3)`); otherwise two bare numbers at one call always need names. A variable passed as an argument is already named. String literals read as words and are exempt. This is left to review: no lint rule catches it.

## Comments

- A comment is plain explanation for a reader new to the code: first what the code does, then why, in whole sentences and the Organizer's terms. Spell out shorthand coined while writing: "the fields that fill the most of the TV", not "the fields that ask most of the TV".
- Speak from the vantage of the code the comment sits on, describing only what it does and knows. A dialog's comment says "Cancel closes it without an answer", leaving what its caller records to the caller. A pure function's comment says what it returns.

## Components

- Define a helper at module level when it reads no props, state or hooks, passing in what it needs. Only what reads the component's own state lives inside it.

## Wording

- A dialog asks one question about one subject, and its buttons answer it: "Who is forfeiting the Match on Board 3?" with a button per Player, not a question that also explains what follows for someone else.

## Styling

- Style with Tailwind utility classes in the component. `src/style.css` holds only the Tailwind import, any app-wide defaults under `@layer base`, `@theme` animations with their `@keyframes`, the Organizer screen's themes and the TV Themes: an animation can't be written as a utility class, and a theme is a set of colours its utilities read. Set an animation's duration from the component (an inline style or a CSS variable it reads), not with one class per duration.
- Colour the organizer route with its theme colours (`bg-panel`, `text-muted`, `text-accent`), never a fixed one such as `text-gray-700`, so the screen reads in every theme. A colour with a new purpose becomes a new theme colour, given a value in every theme.
- Colour the display route with its TV colours (`bg-tv-ground`, `text-tv-muted`, `text-tv-highlight`) in the same way, so it draws in every TV Theme. A TV Theme's artwork is its own drawing, in fixed colours, and goes only where `src/display/TvThemeArt.tsx` places it: the border band, beside a title, in the countdown ring and beside a champion's name. It moves only on the TV itself, behind `motion-safe:`, never in the thumbnail or the Bracket peek.
- Size the organizer route in rem (Tailwind's default scale): rem follows the browser's font-size setting, so an Organizer who enlarges text gets a larger app. Use px only where scaling would be wrong, such as a hairline border. The route's root is sized by the window instead: it fills the window's height (`h-dvh`) whatever the font size, since the window's height doesn't grow with text.
- Keep the organizer route's page from scrolling: a list that can grow long scrolls on its own and shrinks to the space left, so the controls around it stay on screen (`windowFilling` in `src/organizer/classes.ts`). Two lists one above the other, such as the Matches and Waiting for a Board, scroll together in one area: two areas, each shrinking by a share of its own height, squeeze a short list until its rows are cut off. Every flex box between the root and the list needs `min-h-0`, or the list can't shrink. The side column is the exception: its panels, Results included, keep their whole height, and the column scrolls as a whole when a window is too short for them, so there is never a scrollbar inside a scrollbar.
- Size the display route's screens in cqh, hundredths of the height of the TV screen's frame (`tvFrame` in `src/display/tvScreenOnShow.ts`), so text and boxes scale with the TV, and with the Organizer's thumbnail of it, which draws the same screens in a smaller frame. Spacing that must fit the TV's width, such as the page's side padding, the gaps between columns and the bracket lines across them, is in cqw. The display is read from across the room by an audience mostly 55+: large, high-contrast text.
- Keep every TV screen inside the TV's safe area (`tvSafeArea` in `src/display/tvSafeArea.ts`), since a TV that overscans crops the picture's edges: a screen that fills the TV takes its height from `tvSafeArea`, and an element fixed to a corner takes its place from `tvSafeArea`.
- Show a refusal beside the controls that caused it, where the Organizer is already looking.
- Keep the screen still when a mode, line or control comes and goes, so the Organizer's next click lands where they are looking: a button that moves under the press misses the click.
    - A line that comes and goes keeps its height even when empty (`min-h-6`, as `Refusal` does). Leaving a box can save it and show a line, such as "Placards 1 to N", in the moment the Organizer clicks the button below.
    - A mode that changes what a screen offers, such as Swap mode, changes it in place. A control the mode rules out stays where it is, disabled. A name that becomes a button, or a button whose label changes, keeps its box (`playerSlots` in `src/organizer/BracketMatches.tsx`, `StackedLabel` in `src/organizer/controls.tsx`). The mode's own line takes space already there, such as the row Swap mode's banner fills above the Matches.
    - Text that becomes a control in place, such as a Player's name becoming the name box on Rename, keeps its place and font: the box's border and padding start its text where the text was, at the same size and weight (`nameText` in `src/organizer/PlayerCell.tsx`).
    - An issue that says to hide a part asks for a shift: flag it, as a departure from the issue (`docs/agents/issue-tracker.md`, "When a change revises agreed behaviour").
- Keep Tailwind classes that must change together, such as every use of one colour that means one thing, in one named object, each class written out whole so Tailwind finds it.

## The Tournament core

- A command that can be refused returns `Result<T>` (`src/result.ts`). The refusal reason is a sentence the Organizer reads on screen, in `GLOSSARY.md` terms.
- Read a Tournament's plain fields directly (`tournament.players`). Add a query function only for a view that must be worked out from the data, such as the Matches waiting for a Board or the champions.
- The core has no React or browser imports (ADR-0002); its tests run in plain Node.

## Tests

- Core tests drive commands and assert on what the Tournament then holds, describing a Tournament in the Organizer's terms.
- Route tests (React Testing Library, jsdom) render a route against the real storage adapter and drive it through visible labels and roles: what the Organizer sees and can do.
- A core or route test that walks a Tournament through the Organizer's steps builds each saved Tournament from the one before. Saving an earlier one again skips the step the test claims to cover.
- Behaviour across two windows belongs in `e2e/` (Playwright).
- Find an element, in a route test or an e2e test, by [Testing Library's query priority](https://testing-library.com/docs/queries/about#priority), as a person finds it. Use role, label, placeholder, text or display value first, then alt text or title. A `data-testid` comes last, for an element nothing on screen names, such as the decorative countdown ring. Playwright has the same queries (`getByRole`, `getByLabel`, `getByText`, `getByTestId`). A CSS selector couples the test to markup, so reach for a test ID instead, except in a layout check that measures every drawn element, as `expectInsideTvSafeArea` does.
- Set-up that two tests in a file share becomes a module-level test helper (`showOrganizer`, `setUpDraw`), so each test shows only what it is about. Once a helper exists, call it wherever its steps appear, including lines written before the helper: `typeNumber` then Enter is `enterNumber`.
- A test helper's name and comment claim only what it asserts, on the screens that call it.
- An e2e test of a TV screen checks it with `expectInsideTvSafeArea` (`e2e/tvSafeArea.ts`) at the largest field the screen shows.
- A change that switches a mode on the organizer route, or makes a part come and go beside or above a control there, gets an e2e test that the rest stays still (jsdom has no layout to measure), through `expectNothingMoves` (`e2e/screenStill.ts`): every part around the change, its own button included, and the box that holds the change, such as the row Swap mode's banner fills, measured before and after, as `e2e/swap-mode.spec.ts` does. The box itself is measured because a box that grows by a pixel moves the parts below it only at some window sizes, so measuring those parts alone can miss it.
- Text that becomes a control in place gets an e2e test that it stays put, through `expectTextStays` (`e2e/screenStill.ts`), on a name on one line and on the longest name with any tag beside it: `expectNothingMoves` measures the boxes around the change, not the text inside the control that replaces it.
- A tag or label added to a name's box, such as PICKED on a Swap mode seat, gets an e2e test with the longest name the test Tournament holds, through `expectTextFits` (`e2e/textFits.ts`): a short name hides a tag that spills over the box's edge.
- A test of when something happens checks both sides of the moment: the old state just before it, the new one at it (still the Winners Bracket at 19 seconds, the Losers Bracket at 20).
- A test that something doesn't happen waits just past the moment it would have happened (still held at 21 seconds, past a 20-second screen), rather than to a round number: a repeating cycle can be back where it started by then.
- Find a Match in a test by its Players, not by its Board or its place in a list: how Boards are assigned may change.
- A test written after its code earns its place by failing once the behaviour is broken: break it, watch the test go red, restore.

## Routing

- Choose the route with a plain URL check against the base path: `findRoute` in `src/routes.ts`, called from `src/main.tsx`. Reach for a router when the app grows beyond the organizer and display routes; the display route's cycling screens (the brackets, the champions) are screens within one route.

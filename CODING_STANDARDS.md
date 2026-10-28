# Coding standards

Judgement calls for review. Anything mechanical is enforced by `npm run check` (ESLint, Prettier, TypeScript) instead of written here. Architecture decisions live in `docs/adr/`; domain words in `GLOSSARY.md`.

## Naming

- Give every function a verb-first name (`createTournament`, `findNameRefusal`), including helpers and test helpers, so it is never mistaken for a value. A predicate starts with `is` or `has`. ESLint has no rule that can check this.
- Name a value for what it holds: a locator for the element it finds (`championHeading`), not the screen that element suggests.
- React components and hooks keep React's conventions: a component is a PascalCase noun (`Organizer`), a hook starts with `use` (`useTournament`).

## Readability

- Don't nest a call two or more levels deep inside another call's arguments: name the inner result first, so each line does one thing and the name says what it is. Write `const dialog = within(screen.getByRole('dialog'))` and then `user.click(dialog.getByRole('button', { name }))`, not `user.click(within(screen.getByRole('dialog')).getByRole('button', { name }))`. One level is fine: `expect(screen.getByRole('heading')).toHaveTextContent('Now playing')`. A callback's body starts afresh: `matches.find((m) => m.players.every(isKnown))` nests nothing. ESLint catches a call nested in arguments two deep; a call made on a call's result, like `within(...)` above, is left to review.

## Components

- Define a helper at module level when it reads no props, state or hooks, passing in what it needs. Only what reads the component's own state lives inside it.

## Styling

- Style with Tailwind utility classes in the component. `src/style.css` holds only the Tailwind import, any app-wide defaults under `@layer base`, and `@theme` animations with their `@keyframes`: an animation can't be written as a utility class. Set an animation's duration from the component (an inline style or a CSS variable it reads), not with one class per duration.
- Size the organizer route in rem (Tailwind's default scale): rem follows the browser's font-size setting, so an Organizer who enlarges text gets a larger app. Use px only where scaling would be wrong, such as a hairline border.
- Size the display route in vh, so text scales with the TV. It is read from across the room by an audience mostly 55+: large, high-contrast text.
- Show a refusal beside the controls that caused it, where the Organizer is already looking.
- Keep Tailwind classes that must change together, such as every use of one colour that means one thing, in one named object, each class written out whole so Tailwind finds it.

## The Tournament core

- A command that can be refused returns `Result<T>` (`src/result.ts`). The refusal reason is a sentence the Organizer reads on screen, in `GLOSSARY.md` terms.
- Read a Tournament's plain fields directly (`tournament.players`). Add a query function only for a view that must be worked out from the data, such as Now playing or the champions.
- The core has no React or browser imports (ADR-0002); its tests run in plain Node.

## Tests

- Core tests drive commands and assert on what the Tournament then holds, describing a Tournament in the Organizer's terms.
- Route tests (React Testing Library, jsdom) render a route against the real storage adapter and drive it through visible labels and roles: what the Organizer sees and can do.
- Behaviour across two windows belongs in `e2e/` (Playwright).
- Set-up that two tests in a file share becomes a module-level test helper (`showOrganizer`, `setUpDraw`), so each test shows only what it is about.
- A test of when something happens checks both sides of the moment: the old state just before it, the new one at it (still the Winners Bracket at 19 seconds, Now playing at 20).
- Find a Match in a test by its Players, not by its Board or its place in a list: how Boards are assigned may change.
- A test written after its code earns its place by failing once the behaviour is broken: break it, watch the test go red, restore.

## Routing

- Choose the route with a plain URL check in `src/main.tsx`. Reach for a router when the app grows beyond the organizer and display routes; the display route's cycling screens (brackets, Now playing) are screens within one route.

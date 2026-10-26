# Coding standards

Judgement calls for review. Anything mechanical is enforced by `npm run check` (ESLint, Prettier, TypeScript) instead of written here. Architecture decisions live in `docs/adr/`; domain words in `GLOSSARY.md`.

## Naming

- Give every function a verb-first name (`createTournament`, `findNameRefusal`), including helpers and test helpers, so it is never mistaken for a value. A predicate starts with `is` or `has`. ESLint has no rule that can check this.
- React components and hooks keep React's conventions: a component is a PascalCase noun (`Organizer`), a hook starts with `use` (`useTournament`).

## Styling

- Style with Tailwind utility classes in the component. `src/style.css` holds only the Tailwind import and any app-wide defaults under `@layer base`.
- Size the organizer route in rem (Tailwind's default scale): rem follows the browser's font-size setting, so an Organizer who enlarges text gets a larger app. Use px only where scaling would be wrong, such as a hairline border.
- Size the display route in vh, so text scales with the TV. It is read from across the room by an audience mostly 55+: large, high-contrast text.
- Show a refusal beside the controls that caused it, where the Organizer is already looking.

## The Tournament core

- A command that can be refused returns `Result<T>` (`src/result.ts`). The refusal reason is a sentence the Organizer reads on screen, in `GLOSSARY.md` terms.
- Read a Tournament's plain fields directly (`tournament.players`). Add a query function only for a view that must be worked out from the data, such as Now playing or the champions.
- The core has no React or browser imports (ADR-0002); its tests run in plain Node.

## Tests

- Core tests drive commands and assert on what the Tournament then holds, describing a Tournament in the Organizer's terms.
- Route tests (React Testing Library, jsdom) render a route against the real storage adapter and drive it through visible labels and roles: what the Organizer sees and can do.
- Behaviour across two windows belongs in `e2e/` (Playwright).
- A test written after its code earns its place by failing once the behaviour is broken: break it, watch the test go red, restore.

## Routing

- Choose the route with a plain URL check in `src/main.tsx`. Reach for a router when the app grows beyond the organizer and display routes; the display route's cycling screens (brackets, Now playing) are screens within one route.

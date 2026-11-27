# TV Themes

How to add a **TV Theme**, and the rules its colours and artwork follow. Christmas (`src/display/art/christmas/`, its block in `src/style.css`) is the worked example.

## Adding a TV Theme

1. **Core**: add it to `TvTheme` (`src/tournament/types.ts`), `tvThemeNames` and `tvThemeMonths` (`src/tournament/tvTheme.ts`). The type checker then asks for its artwork (`artworks` in `src/display/TvThemeArt.tsx`) and its Fun Facts (`tvThemeFunFacts` in `src/display/tvThemeFunFacts.ts`).
2. **Colours**: a `[data-tv-theme='<name>']` block in `src/style.css` giving every TV colour. `scripts/tvThemeColours.test.ts` fails until it does. The border band and the spacing that gives way to it are shared by every TV Theme with a border, so the block sets colours only.
3. **Artwork**: a folder `src/display/art/<name>/` with an `index.ts` exporting its `TvThemeArtwork` (`src/display/art/artwork.ts`): a border, the motifs beside a title, a ring motif, and a champion motif for each bracket.
4. **Fun Facts**: its own list in `src/display/tvThemeFunFacts.ts`, kept to the ground rules at the top of `src/display/funFacts.ts`. `funFacts.test.ts` checks them.

Done when `npm run check` and `npm run e2e` pass, and every TV screen in the new TV Theme has been looked at full size (below). The browser tests take the TV Themes from the core, so a new one is walked, every screen, with nothing to add to them.

## Colours

- **Text**: names, headings and bracket text read at 7:1 on what is behind them; secondary text and a Match's loser at 4.5:1. `e2e/tv-theme.spec.ts` measures every TV screen.
- **Plain bracket lines** (`--tv-line`) read at 3:1 or more on the ground, faint enough to sit behind the path. Nothing measures this: check it when choosing.
- **The winners' path** (`--tv-path`) is a colour that means winning, never one that reads as losing or danger (red), and stands apart from the plain lines in lightness, not hue alone: a green path beside green-grey lines reads as one colour from across the room.
- **Highlight** (`--tv-highlight`) is for what the room looks for: the count of Players, a Board, a champion. The path may share it.

## Artwork

- Our own SVG, in the style every TV Theme shares: flat colours, a darker side for shade, a dark outline (`outlineColour`), and a white glint only on what is round and glossy, such as a bulb or a bauble. A glint on a flat or faceted shape reads as a smudge.
- It goes only where `src/display/TvThemeArt.tsx` places it: the border band, beside a title, in the countdown ring's hole, and beside each champion's name. `e2e/tv-theme.spec.ts` fails a piece that covers text or the ring, or leaves the safe area.
- What twinkles uses `describeTwinkle` with the piece's own colour as its glow. It moves only on the TV, never under reduced motion, and never in the thumbnail or the Bracket peek.

## Looking at it

Shoot every TV screen in the TV Theme, the champions screen with both brackets' champions, and the Losers Bracket mid-play (`.claude/skills/run-app/SKILL.md` for viewing them):

```bash
PLAYERS=32 BOARDS=16 DRAW=1 START=1 RESULTS=all TV_THEME=<Name> npm run screens
```

```bash
PLAYERS=32 BOARDS=16 DRAW=1 START=1 LOSERS=1 TV_THEME=<Name> npm run screens
```

Open each, then a full-size crop of each piece of artwork: at half size a glint or a path colour can't be judged. Check that the winners' path stands apart from the plain lines at a glance, and that every glint sits on something round and glossy.

## Classic

Classic is the TV as it always looked. `e2e/tv-classic.spec.ts` compares every TV screen in Classic with a saved picture, pixel by pixel, and fails when more than 20 pixels differ in any shade. The pictures differ by system, since the TV draws in the system's font: `-dev-darwin.png` from a Mac, `-dev-linux.png` from CI. CI never saves a picture (`updateSnapshots` in `playwright.config.ts`), and Playwright keeps what CI took only for a screen that already has a picture to compare with. To save the pictures for a new screen, or when Classic is meant to change:

1. Save the Mac pictures: `npx playwright test tv-classic --update-snapshots`, and look at each.
2. For a screen with no Linux picture yet, copy its Mac picture to its `-dev-linux.png` as a stand-in, so CI has one to compare with.
3. Push. `tv-classic` fails on CI, and the run uploads what CI took in its `playwright-traces` artifact: `gh run download <run id> -n playwright-traces -D <scratchpad>/traces`.
4. Copy each `*-actual.png` from there over its `-dev-linux.png` in `e2e/tv-classic.spec.ts-snapshots/`, look at it, commit, and push again.

---
name: run-app
description: Run the cribbage app and screenshot its screens. Use when checking that a UI change looks right on the organizer or display route, when a PR changes a screen, or when asked to run or show the app.
---

Behaviour across the two windows, and the Winners Bracket's layout, are covered by `npm run e2e` (`e2e/`, Playwright against the installed Google Chrome). This skill is for what a test can't judge: how a screen looks. Every screenshot you take, you open and look at.

## Screenshot a screen

`npm run screens` (`screens/screens.spec.ts`) starts its own dev server, sets up a Tournament through the test Tournament URL (`/?players=N&boards=M`, `src/testTournament.ts`), and screenshots both routes, the organizer at 1280×720 and the TV at 1920×1080:

```bash
PLAYERS=29 BOARDS=16 DRAW=1 START=1 npm run screens
```

Each option takes the screenshots further through the night; the script's header comment lists every option and the file names it writes. Images land in `test-results/screens/` (gitignored), one per moment the script reaches. `npm run e2e` empties `test-results/` when it starts, so take screenshots after it, or copy them out first. Shoot the field sizes at the edges of the change: the largest field (32 fills every Board card) and an odd one where a Player waits for a winner (21).

A whole TV screenshot is costly to open, and judging a screen from across the room needs only half its size. Open a half-size copy first (`sips -Z 960 test-results/screens/tv-draw.png --out <scratchpad>/tv-draw-small.png`), and a crop when checking one detail, such as whether a long name is cut (`sips -c <height> <width> --cropOffset <y> <x> <file> --out <crop>`: height before width, y before x). Open the full image only for what those can't show.

When the change shows a moment the script doesn't reach yet (a Forfeit, the Losers Bracket), add that step to `screens/screens.spec.ts` behind its own variable, so the script grows with the app.

## What to look at

The display route is read from across the room by an audience mostly 55+: text large and high-contrast, black filling the whole screen, nothing cropped. On the Winners Bracket, every Match sits level with the middle of the two that feed it, in every Round; `e2e/bracket-layout.spec.ts` measures this, but look at it too, because a change that keeps the measurements right can still make pairs hard to tell apart.

On the organizer route, check inputs show their full placeholder and controls line up. In the Matches list, the Boards, both Players and the "vs" each line up down the list, whether a name is a button or plain text and however long it is.

To see the Organizer's own Tournament rather than a test one, open `localhost:5173/display` (or `/`) in a new Claude in Chrome tab: it shares the local storage of the Organizer's Chrome, so it shows their saved Tournament exactly. Measure a layout there with JavaScript (element sizes and positions) instead of judging a screenshot by eye.

Done when every screen the change touches has been screenshotted and looked at, and anything wrong is fixed or reported.

## Screenshots in a PR

A PR that changes a screen shows it, before and after, in its Evidence section. `gh` can't upload images, so `screens/publish.sh` hosts them: it adds the files to the `pr-screenshots` branch, which is never merged, and prints a Markdown table with each screen's before and after side by side, so a reviewer compares them at a glance instead of scrolling between them. It builds the commit in a scratch index, so the working tree and the current branch stay put and the pre-commit hook doesn't run.

1. **Before:** shoot `main` from a worktree in the scratchpad, with the same options as the after, and the project's `node_modules` linked in:

    ```bash
    git fetch origin main
    git worktree add --detach <scratchpad>/main origin/main
    ln -s "$PWD/node_modules" <scratchpad>/main/node_modules
    ```

    Then run `npm run screens` inside `<scratchpad>/main`. Skip the before for a screen that is new.

2. **After:** shoot the branch as in "Screenshot a screen".
3. Copy the shots that show the change into one scratchpad folder, named `before-<screen>.png` and `after-<screen>.png`, then publish them under the ticket's number:

    ```bash
    screens/publish.sh issue-83 <scratchpad>/publish/before-tv-draw.png <scratchpad>/publish/after-tv-draw.png
    ```

4. Paste the printed table into the PR's Evidence section in place of the template's **Before** and **After** lines, under a sentence on the field size and what to look for. A table's cells shrink each shot to about half its width, so name any detail too small to see there (a name cut short, a text size); a click opens the full image. Remove the worktree with `git worktree remove <scratchpad>/main`.

Done when every screen the PR changes has a before and an after in the PR body ("New screen" in the before cell for a screen that is new).

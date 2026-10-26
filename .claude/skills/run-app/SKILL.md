---
name: run-app
description: Run the cribbage app and screenshot its screens. Use when checking that a UI change looks right on the organizer or display route, or when asked to run or show the app.
---

Behaviour across the two windows, and the Winners Bracket's layout, are covered by `npm run e2e` (`e2e/`, Playwright against the installed Google Chrome). This skill is for what a test can't judge: how a screen looks. Every screenshot you take, you open and look at.

## Screenshot a screen

`npm run screens` (`screens/screens.spec.ts`) starts its own dev server, sets up a Tournament through the test Tournament URL (`/?players=N&boards=M`, `src/testTournament.ts`), and screenshots both routes, the organizer at 1280×720 and the TV at 1920×1080:

```bash
PLAYERS=29 BOARDS=16 npm run screens                  # registration
PLAYERS=29 BOARDS=16 DRAW=1 npm run screens           # and Tonight's Draw
PLAYERS=29 BOARDS=16 DRAW=1 START=1 npm run screens   # and after Start
PLAYERS=29 BOARDS=16 DRAW=1 START=1 RESULTS=12 npm run screens   # and after 12 Match results (RESULTS=all: to the champion)
```

Images land in `test-results/screens/` (gitignored), named `{organizer,tv}-{registration,draw,started,results}.png`. Shoot the field sizes at the edges of the change: the largest field (32 fills every Board card) and an odd one where a Player waits for a winner (21).

When the change shows a moment the script doesn't reach yet (results recorded, a champion), add that step to `screens/screens.spec.ts` behind its own variable, so the script grows with the app.

## What to look at

The display route is read from across the room by an audience mostly 55+: text large and high-contrast, black filling the whole screen, nothing cropped. On the Winners Bracket, every Match sits level with the middle of the two that feed it, in every Round; `e2e/bracket-layout.spec.ts` measures this, but look at it too, because a change that keeps the measurements right can still make pairs hard to tell apart.

On the organizer route, check inputs show their full placeholder and controls line up. In the Matches list, the Boards, both Players and the "vs" each line up down the list, whether a name is a button or plain text and however long it is.

Done when every screen the change touches has been screenshotted and looked at, and anything wrong is fixed or reported.

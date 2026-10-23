---
name: run-app
description: Run the cribbage app and screenshot its screens. Use when checking that a UI change looks right on the organizer or display route, or when asked to run or show the app.
---

Behaviour across the two windows is covered by `npm run e2e` (`e2e/`, Playwright against the installed Google Chrome). This skill is for what a test can't judge: how a screen looks. Every screenshot you take, you open and look at.

## Screenshot a screen

**Empty Tournament**, start the dev server on a spare port and screenshot it with Playwright's CLI:

```bash
(npm run dev -- --port 5180 --strictPort > /tmp/vite.log 2>&1 &)
for i in $(seq 60); do curl -sf http://localhost:5180 >/dev/null && break; sleep 0.5; done
npx playwright screenshot --channel chrome --viewport-size "1280,720" http://localhost:5180/display /tmp/tv.png
lsof -ti:5180 -sTCP:LISTEN | xargs kill
```

macOS has no `timeout`; the `for` loop is the wait. The organizer route is `/`, the display route `/display`.

**With Players, Boards or results on screen**, take the screenshot inside a Playwright test at the moment that matters, since that is where the Tournament gets built up:

```ts
await tv.screenshot({ path: 'test-results/tv.png' });
```

Add the line to the relevant test in `e2e/`, run `npm run e2e` (it starts its own server), open the image, then remove the line. `test-results/` is gitignored.

## What to look at

The display route is read from across the room by an audience mostly 55+: text large and high-contrast, black filling the whole screen, nothing cropped. On the organizer route, check inputs show their full placeholder and controls line up.

Done when every screen the change touches has been screenshotted and looked at, and anything wrong is fixed or reported.

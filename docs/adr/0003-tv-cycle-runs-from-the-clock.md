# The TV cycle runs from the clock, restarted at the Organizer's save step

Every window works out the TV screen on show from the saved Tournament and the clock: `findTvScreenOnShow` in `src/tournament/tvScreen.ts`. The Tournament saves when Auto's cycle started and the screen it started from (`tvCycleStart`), so a reloaded TV picks up mid-cycle and a second window (the Organizer's thumbnail) can agree with the TV without asking it.

The cycle starts again when a save calls for it: Auto chosen from a Held screen, a new seconds per TV screen, or a change in the screens the TV cycles (a new phase, the Losers Draw). `restartTvCycleIfDue` compares the Tournament before and after a command and stamps the new start. It runs once, in the Organizer's `apply`, the single step every command's outcome is saved through. So any new path that saves a Started Tournament calls it too; one that skips it leaves the cycle start stale or unset, and the TV falls back to a fixed start rather than the right screen.

We chose this over passing the time into every command. The cycle start is a TV concern, but a new phase comes from `start`, `recordWinner`, `recordForfeit` and `undoResult`, and `recordWinner` alone has some 80 call sites, mostly in tests that don't care about time. One function at the save step keeps every restart rule in `tvScreen.ts`, and the commands stay as they were.

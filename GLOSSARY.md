# Cribbage Tournament

The language of a single-night, single-elimination cribbage tournament run at a local brewery: who plays, how they are paired, and how results move players through the brackets.

## Language

### People

**Player**:
A person who has paid the entry fee and is entered in tonight's **Tournament**.
_Avoid_: Participant, entrant, competitor

**Organizer**:
The person running the **Tournament**: takes registrations and fees, and records each **Match** result.
_Avoid_: Admin, host, TD

### Structure

**Tournament**:
One night's event: a **Winners Bracket** and an optional **Losers Bracket**, self-contained to that night.
_Avoid_: Event, night, competition

**Winners Bracket**:
The main single-elimination bracket every **Player** enters; its final winner is the tournament champion.
_Avoid_: Main bracket, championship bracket

**Losers Bracket**:
A separate single-elimination bracket for **Players** who lost their first **Match** in the **Winners Bracket**, in whichever **Round** it was, and are staying to keep playing. Every **Player** can get at least two Matches in a Tournament.
_Avoid_: Consolation bracket, second-chance bracket

**Match**:
A single game of cribbage to 121 between two **Players**; the winner advances, the loser leaves that bracket.
_Avoid_: Game, round, heat

**Round**:
One column of a bracket: every **Match** that is the same number of wins away from the start.
_Avoid_: Stage, level

**Draw**:
The random pairing of **Players** into a bracket's first **Round**, including who gets a **Bye**. Each bracket has exactly one Draw.
_Avoid_: Seeding, pairing, shuffle

**Held Place**:
A place in the **Losers Bracket**'s **Draw** kept open for the **Bye** Player whose first **Match** is still to come, which becomes a Bye for their opponent unless they lose it and stay.
_Avoid_: Placeholder, reserved spot

**Bye**:
A free pass through a bracket's first **Round**, given at random when the field doesn't fill the bracket, or left by a **Held Place** its Player doesn't take; it is not a **Match** and not a loss. Bye Players meet each other in the second Round, except one who waits for a first-Round Match's winner when the first Round has an odd number of Matches.
_Avoid_: Walkover, skip

**Forfeit**:
A **Match** result recorded when a **Player** leaves before finishing it, whether or not it has begun; their opponent wins.
_Avoid_: Withdrawal, DNF, no-show

### The room

**Board**:
A numbered cribbage board set out in the room, where a **Match** is assigned to be played. Boards are numbered from 1 up by tent-number placards, like the ones a restaurant hands out to deliver food to a table. Several Boards can share one physical table, and there are only as many Boards as the room has cribbage boards. A Match takes the lowest-numbered free Board as soon as one of its Players is known, or joins **Waiting for a Board** when none is free. Its Player sits there waiting for their opponent; the opponent comes to them. So a winner usually stays at the Board they just won at.
_Avoid_: Table, spot, station, placard

**Waiting for a Board**:
The line of **Matches**, from both brackets, that need a **Board** while none is free. Matches ready to play, both **Players** known, go ahead of those still waiting on a Player; otherwise it is first come, first served.
_Avoid_: Waitlist, backlog

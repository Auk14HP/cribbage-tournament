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

**House Rules**:
The **Tournament**'s own rules of play, the same every night, which the **Organizer** announces before the **Draw**.
_Avoid_: Rules, announcements, guidelines

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

**Final**:
The last **Round** of a bracket: a single **Match** whose winner is that bracket's champion.
_Avoid_: Championship, last game

**Draw**:
The random pairing of **Players** into a bracket's first **Round**, including who gets a **Bye**. Each bracket has exactly one Draw; the **Winners Bracket**'s can be changed by **Swaps** until Start.
_Avoid_: Seeding, pairing, shuffle

**Swap**:
The **Organizer** trading two **Players**' places in the **Winners Bracket**'s **Draw** before Start, such as to give someone the **Bye** or to split up two Players who'd rather not meet first.
_Avoid_: Move, reshuffle, re-draw

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

**Home Board**:
A **Board** kept for one **Player** for as long as they are in the **Tournament**: every **Match** of theirs is played there, their opponent comes to them, and no other Match takes it.
_Avoid_: Preferred board, reserved board, fixed board, pinned board

**Waiting for a Board**:
The line of **Matches**, from both brackets, that need a **Board** while none is free. Matches ready to play, both **Players** known, go ahead of those still waiting on a Player, and a Player waiting alone at a **Board** other than their **Home Board** gives it up to one. A Match moved off a **Home Board** when its Player comes back to it, through an undo, goes first in line. Otherwise it is first come, first served.
_Avoid_: Waitlist, backlog

### The laptop

**Organizer screen**:
The page on the laptop the **Organizer** runs the **Tournament** from.
_Avoid_: Admin page, dashboard, control room

**Theme**:
The colours the **Organizer screen** is drawn in, such as Light or Dark. It is the laptop's setting, so it stays the same from one **Tournament** to the next.
_Avoid_: Skin, colour scheme, mode

**Match laptop**:
The choice of **Theme** that follows the laptop's own light or dark setting. It is the choice until the **Organizer** picks another.
_Avoid_: System, Auto (the TV's cycling choice)

### The TV

**TV screen**:
A page the TV shows. Which ones it shows depends on the night's phase.
_Avoid_: Slide, view

**Tonight's Players**:
The **TV screen** before the **Draw** that lists every **Player** registered so far, under the **Tournament**'s title and date, with a **Fun Fact** along the bottom. It is the room's view of registration, not the **Organizer**'s.
_Avoid_: Registration page, sign-up screen

**Fun Fact**:
A light-hearted line, mostly made up but sometimes a true fact about cribbage, often naming registered **Players**, shown on the TV during registration.
_Avoid_: Trivia, joke, tip

**Tonight's Draw**:
The **TV screen** between the **Draw** and Start: the **Winners Bracket** as the Draw stands, with any **Swaps**, so each **Player** can find their seat and see which **Round** they start in.
_Avoid_: Pairings, draw sheet

**Champion screen**:
The **TV screen** once the **Tournament** is finished that names each bracket's champion.
_Avoid_: Winner screen, results screen

**Auto**:
The **Organizer**'s choice that has the TV cycle the current phase's screens once Started, each for the seconds per TV screen.
_Avoid_: Cycle mode, rotate

**Held screen**:
The screen the **Organizer** has chosen for the TV once Started, which the TV shows until they choose **Auto**. Choosing Auto cycles on from it. A Held screen the night's next phase doesn't have, such as **Champion** once an undo takes the **Tournament** back into play, falls back to Auto.
_Avoid_: Pinned screen, locked screen

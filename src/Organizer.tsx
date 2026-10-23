// The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
// saves accepted changes through the store, and shows the core's reason when a change is refused.
import { useRef, useState, type FormEvent } from 'react'
import type { Store } from './storage'
import {
  newTournament,
  playerCount,
  players,
  registerPlayer,
  removePlayer,
  renamePlayer,
  type Outcome,
  type Player,
  type PlayerId,
  type Tournament,
} from './tournament'
import { useTournament } from './useTournament'
import { playersRegistered } from './wording'

export function Organizer({ store }: { store: Store<Tournament> }) {
  const tournament = useTournament(store)
  const [name, setName] = useState('')
  const [refusal, setRefusal] = useState('')
  const [renaming, setRenaming] = useState<PlayerId>()
  const nameInput = useRef<HTMLInputElement>(null)

  // Returns whether the core accepted the change.
  function apply(outcome: Outcome): boolean {
    if (!outcome.ok) {
      setRefusal(outcome.reason)
      return false
    }
    setRefusal('')
    store.save(outcome.tournament)
    return true
  }

  function register(event: FormEvent) {
    event.preventDefault()
    if (apply(registerPlayer(tournament, name))) setName('')
    nameInput.current?.focus()
  }

  function startRenaming(playerId: PlayerId | undefined) {
    setRenaming(playerId)
    setRefusal('')
  }

  function startNewTournament() {
    if (!confirm('Start a new Tournament? Every registered Player will be cleared.')) return
    startRenaming(undefined)
    apply({ ok: true, tournament: newTournament() })
    nameInput.current?.focus()
  }

  return (
    <>
      <header>
        <h1>Register Players</h1>
        <nav>
          <a href="#/display" target="cribbage-display">
            Open TV display
          </a>
          <button type="button" className="danger" onClick={startNewTournament}>
            Start a new Tournament
          </button>
        </nav>
      </header>
      <form onSubmit={register}>
        <label>
          Player name{' '}
          <input
            ref={nameInput}
            type="text"
            placeholder="Name the room knows them by"
            autoComplete="off"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit">Register</button>
      </form>
      <p className="refusal" role="alert">
        {refusal}
      </p>
      <p className="count">{playersRegistered(playerCount(tournament))}</p>
      <ul className="players">
        {players(tournament).map((player) =>
          player.id === renaming ? (
            <RenameRow
              key={player.id}
              player={player}
              onSave={(newName) => {
                if (apply(renamePlayer(tournament, player.id, newName))) startRenaming(undefined)
              }}
              onCancel={() => startRenaming(undefined)}
            />
          ) : (
            <li key={player.id}>
              <span className="name">{player.name}</span>
              <button type="button" onClick={() => startRenaming(player.id)}>
                Rename
              </button>
              <button type="button" className="danger" onClick={() => apply(removePlayer(tournament, player.id))}>
                Remove
              </button>
            </li>
          ),
        )}
      </ul>
    </>
  )
}

function RenameRow({ player, onSave, onCancel }: { player: Player; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(player.name)
  return (
    <li>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(name)
        }}
      >
        <input type="text" autoComplete="off" autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </li>
  )
}

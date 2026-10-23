// The organizer route: shown on the laptop. Forwards the Organizer's actions to the Tournament core,
// saves accepted changes through the store, and shows the core's reason when a change is refused.
import { el } from './dom'
import type { Store } from './storage'
import {
  newTournament,
  playerCount,
  players,
  registerPlayer,
  removePlayer,
  renamePlayer,
  type Outcome,
  type PlayerId,
  type Tournament,
} from './tournament'
import { playersRegistered } from './wording'

export function showOrganizer(root: HTMLElement, store: Store<Tournament>): void {
  let tournament = store.load() ?? newTournament()
  let renaming: PlayerId | undefined

  const nameInput = el('input', { type: 'text', placeholder: 'Name the room knows them by', autocomplete: 'off' })
  const refusal = el('p', { className: 'refusal', role: 'alert' })
  const count = el('p', { className: 'count' })
  const list = el('ul', { className: 'players' })

  const registerForm = el(
    'form',
    {
      onsubmit: (event) => {
        event.preventDefault()
        if (apply(registerPlayer(tournament, nameInput.value))) nameInput.value = ''
        nameInput.focus()
      },
    },
    el('label', {}, 'Player name ', nameInput),
    el('button', { type: 'submit' }, 'Register'),
  )

  root.replaceChildren(
    el('header', {},
      el('h1', {}, 'Register Players'),
      el('nav', {},
        el('a', { href: '#/display', target: 'cribbage-display' }, 'Open TV display'),
        el('button', { type: 'button', className: 'danger', onclick: startNewTournament }, 'Start a new Tournament'),
      ),
    ),
    registerForm,
    refusal,
    count,
    list,
  )

  // Returns whether the core accepted the change.
  function apply(outcome: Outcome): boolean {
    if (!outcome.ok) {
      refusal.textContent = outcome.reason
      return false
    }
    refusal.textContent = ''
    store.save(outcome.tournament)
    return true
  }

  function startNewTournament(): void {
    if (!confirm('Start a new Tournament? Every registered Player will be cleared.')) return
    renaming = undefined
    apply({ ok: true, tournament: newTournament() })
    nameInput.focus()
  }

  function render(): void {
    count.textContent = playersRegistered(playerCount(tournament))
    list.replaceChildren(...players(tournament).map((p) => (p.id === renaming ? renameRow(p.id, p.name) : playerRow(p.id, p.name))))
  }

  function playerRow(id: PlayerId, name: string): HTMLLIElement {
    return el('li', {},
      el('span', { className: 'name' }, name),
      el('button', { type: 'button', onclick: () => { renaming = id; refusal.textContent = ''; render() } }, 'Rename'),
      el('button', { type: 'button', className: 'danger', onclick: () => apply(removePlayer(tournament, id)) }, 'Remove'),
    )
  }

  function renameRow(id: PlayerId, name: string): HTMLLIElement {
    const input = el('input', { type: 'text', value: name, autocomplete: 'off' })
    const row = el('li', {},
      el('form', {
        onsubmit: (event) => {
          event.preventDefault()
          if (apply(renamePlayer(tournament, id, input.value))) renaming = undefined
          render()
        },
      },
        input,
        el('button', { type: 'submit' }, 'Save'),
        el('button', { type: 'button', onclick: () => { renaming = undefined; refusal.textContent = ''; render() } }, 'Cancel'),
      ),
    )
    queueMicrotask(() => input.focus())
    return row
  }

  store.subscribe((saved) => {
    tournament = saved
    render()
  })
  render()
  nameInput.focus()
}

// The display route: read-only, shown on the TV. Redraws whenever the saved Tournament changes.
import { el } from './dom'
import type { Store } from './storage'
import { newTournament, playerCount, players, type Tournament } from './tournament'

export function showDisplay(root: HTMLElement, store: Store<Tournament>): void {
  document.body.classList.add('display')

  function render(tournament: Tournament): void {
    const count = playerCount(tournament)
    root.replaceChildren(
      el('h1', {}, 'Tonight’s Players'),
      el('p', { className: 'count' }, `${count} ${count === 1 ? 'Player' : 'Players'} registered`),
      el('ul', { className: 'names' }, ...players(tournament).map((p) => el('li', {}, p.name))),
    )
  }

  render(store.load() ?? newTournament())
  store.subscribe(render)
}

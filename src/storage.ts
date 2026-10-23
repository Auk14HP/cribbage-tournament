// The storage adapter: the single seam between the routes and saved state (ADR-0001).
// Saves state as JSON in local storage and tells subscribers when it changes, including
// changes saved by another window (via the browser's storage events). A hosted version
// would replace only this module.

export interface Store<T> {
  load(): T | undefined
  save(state: T): void
  subscribe(listener: (state: T) => void): () => void
}

export function localStorageStore<T>(key: string): Store<T> {
  const listeners = new Set<(state: T) => void>()

  function load(): T | undefined {
    const saved = localStorage.getItem(key)
    if (saved === null) return undefined
    try {
      return JSON.parse(saved) as T
    } catch {
      return undefined
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== key) return
    const state = load()
    if (state !== undefined) listeners.forEach((listener) => listener(state))
  })

  return {
    load,
    save(state) {
      localStorage.setItem(key, JSON.stringify(state))
      // Storage events only reach other windows, so tell this window's subscribers directly.
      listeners.forEach((listener) => listener(state))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

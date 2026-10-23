// Wording shared by the organizer and display routes.
export function playersRegistered(count: number): string {
  return `${count} ${count === 1 ? 'Player' : 'Players'} registered`
}

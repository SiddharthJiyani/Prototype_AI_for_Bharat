/**
 * Get or create a persistent user ID.
 * Stored in localStorage so it's consistent across pages and sessions.
 */
export function getUserId() {
  let id = localStorage.getItem('intgov_userId')
  if (!id) {
    id = 'user_' + Date.now()
    localStorage.setItem('intgov_userId', id)
  }
  return id
}

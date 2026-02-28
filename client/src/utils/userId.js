/**
 * Get the current user's ID.
 * Priority:
 *  1. Authenticated user's userId (from AuthContext / intgov_user)
 *  2. Fallback: a persistent random guest ID
 */
export function getUserId() {
  // Check for authenticated user first
  const saved = localStorage.getItem('intgov_user')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.userId) return parsed.userId
    } catch { /* ignore */ }
  }

  // Guest fallback
  let id = localStorage.getItem('intgov_userId')
  if (!id) {
    id = 'guest_' + Date.now()
    localStorage.setItem('intgov_userId', id)
  }
  return id
}

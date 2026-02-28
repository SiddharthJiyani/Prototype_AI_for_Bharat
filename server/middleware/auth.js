import jwt from 'jsonwebtoken'

/**
 * Express middleware: verifies JWT from Authorization header.
 * Attaches decoded payload to req.user.
 *
 * Usage:
 *   router.get('/protected', requireAuth, handler)
 *   router.get('/admin-only', requireAuth, requireRole('admin'), handler)
 */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const token = auth.slice(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired — please log in again' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Role-based access control (use after requireAuth).
 * @param  {...string} roles — allowed roles e.g. 'admin', 'citizen', 'panchayat'
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Wraps routes that require authentication.
 *  - While the auth state is loading, show a spinner.
 *  - If not authenticated, redirect to /login (preserving the intended path).
 *  - Optionally restrict by role(s).
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the page they were trying to reach
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Role-based guard (optional)
  if (roles && roles.length > 0) {
    const userRole = user?.role || 'citizen'
    if (!roles.includes(userRole)) {
      return <Navigate to="/nyaymitra" replace />
    }
  }

  return children
}

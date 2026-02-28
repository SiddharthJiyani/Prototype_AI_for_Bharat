import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Handles the redirect back from Google OAuth.
 * URL: /auth/google/callback?data={...}
 * Parses the data param, stores the session, and redirects to dashboard.
 */
export default function GoogleCallback() {
  const { handleGoogleCallback } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const dataParam = searchParams.get('data')
    const error = searchParams.get('error')

    if (error) {
      toast.error('Google login failed — please try again')
      navigate('/login', { replace: true })
      return
    }

    if (!dataParam) {
      toast.error('No authentication data received')
      navigate('/login', { replace: true })
      return
    }

    try {
      const data = JSON.parse(decodeURIComponent(dataParam))
      const result = handleGoogleCallback(data)
      if (result.success) {
        toast.success(`Welcome, ${data.user?.name || 'User'}!`)
        navigate('/nyaymitra', { replace: true })
      } else {
        toast.error(result.error || 'Login failed')
        navigate('/login', { replace: true })
      }
    } catch {
      toast.error('Failed to process Google login')
      navigate('/login', { replace: true })
    }
  }, [searchParams, handleGoogleCallback, navigate])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 size={32} className="animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing Google sign-in...</p>
    </div>
  )
}

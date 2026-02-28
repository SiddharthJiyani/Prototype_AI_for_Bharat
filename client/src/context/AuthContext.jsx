import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { getUserId } from '@/utils/userId'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Axios interceptor: attach token to every request ──
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const saved = localStorage.getItem('intgov_user')
      if (saved) {
        try {
          const { token } = JSON.parse(saved)
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch { /* ignore */ }
      }
      return config
    })

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Auto-logout on 401 (expired / invalid token)
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
          setUser(null)
          localStorage.removeItem('intgov_user')
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.request.eject(reqInterceptor)
      axios.interceptors.response.eject(resInterceptor)
    }
  }, [])

  // ── On mount: validate saved session ──
  useEffect(() => {
    const verify = async () => {
      const saved = localStorage.getItem('intgov_user')
      if (!saved) { setLoading(false); return }

      try {
        const parsed = JSON.parse(saved)

        // Guest users don't have a JWT — just trust localStorage
        if (parsed.isGuest) {
          setUser(parsed)
          setLoading(false)
          return
        }

        // Verify JWT with backend
        if (parsed.token) {
          const res = await axios.get(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${parsed.token}` },
          })
          const verified = { ...res.data.user, token: parsed.token }
          setUser(verified)
          localStorage.setItem('intgov_user', JSON.stringify(verified))
        } else {
          // No token — clear stale data
          localStorage.removeItem('intgov_user')
        }
      } catch {
        // Token expired or invalid — clear session
        localStorage.removeItem('intgov_user')
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [])

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { userId: email, password })
      const userData = { ...res.data.user, token: res.data.token }
      setUser(userData)
      localStorage.setItem('intgov_user', JSON.stringify(userData))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' }
    }
  }

  const signup = async (name, email, password, phone) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/signup`, { name, email, password, phone })
      const userData = { ...res.data.user, token: res.data.token }
      setUser(userData)
      localStorage.setItem('intgov_user', JSON.stringify(userData))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Signup failed' }
    }
  }

  // Quick login — creates a guest session without password (for non-tech users)
  const quickLogin = (name, language = 'hi') => {
    const guestUser = {
      userId: getUserId(),
      name: name || 'Guest User',
      role: 'citizen',
      language,
      isGuest: true,
    }
    setUser(guestUser)
    localStorage.setItem('intgov_user', JSON.stringify(guestUser))
    return { success: true }
  }

  // Google OAuth — redirect to server's Google auth endpoint
  const googleLogin = () => {
    const serverBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    window.location.href = `${serverBase}/auth/google`
  }

  // Handle Google OAuth callback — called from the callback route component
  const handleGoogleCallback = (data) => {
    try {
      const { token, user: userData } = data
      const fullUser = { ...userData, token }
      setUser(fullUser)
      localStorage.setItem('intgov_user', JSON.stringify(fullUser))
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to process Google login' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('intgov_user')
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    quickLogin,
    googleLogin,
    handleGoogleCallback,
    logout,
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

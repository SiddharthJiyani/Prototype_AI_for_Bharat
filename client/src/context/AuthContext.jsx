import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { getUserId } from '@/utils/userId'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for saved session
    const saved = localStorage.getItem('intgov_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { userId: email, password })
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
      const res = await axios.post('/api/auth/signup', { name, email, password, phone })
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

  const logout = () => {
    setUser(null)
    localStorage.removeItem('intgov_user')
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    quickLogin,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

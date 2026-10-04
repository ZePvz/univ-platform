import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Starts true: the JWT lives in an httpOnly cookie, so JavaScript can't
  // read it directly. The only way to know "am I logged in" on a fresh page
  // load is to ask the server and wait for the answer.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null)) // 401 just means "not logged in", not an error to surface
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password })
    setUser(data.user)
    return data.user
  }, [])

  // Google only proves who the person is — this still lands on our own
  // /auth/google endpoint, which issues the same httpOnly JWT cookie as
  // password login. From the frontend's point of view it's login #2, not a
  // different kind of session.
  const continueWithGoogle = useCallback(async (credential) => {
    const data = await api.post('/auth/google', { credential })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, continueWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

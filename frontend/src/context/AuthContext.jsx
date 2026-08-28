import { createContext, useEffect, useState } from 'react'
import api from '../lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('formflow_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')
        setUser(data)
      } catch {
        localStorage.removeItem('formflow_token')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    localStorage.setItem('formflow_token', data.access_token)
    setUser(data.admin)
    return data
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('formflow_token', data.access_token)
    setUser(data.admin)
    return data
  }

  const logout = () => {
    localStorage.removeItem('formflow_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

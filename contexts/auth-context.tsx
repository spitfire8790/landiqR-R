'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type UserRole = 'admin' | 'readonly' | null

interface AuthContextType {
  isAuthenticated: boolean
  userRole: UserRole
  login: (password: string) => boolean
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
  isReadOnly: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('landiq-auth')
    const savedRole = localStorage.getItem('landiq-role') as UserRole
    if (authStatus === 'authenticated' && savedRole) {
      setIsAuthenticated(true)
      setUserRole(savedRole)
    }
    setIsLoading(false)
  }, [])

  const login = (password: string): boolean => {
    // Get passwords from environment variables with fallbacks
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin2024'
    const readonlyPassword = process.env.NEXT_PUBLIC_READONLY_PASSWORD || 'readonly2024'
    
    let role: UserRole = null
    
    if (password === adminPassword) {
      role = 'admin'
    } else if (password === readonlyPassword) {
      role = 'readonly'
    }
    
    if (role) {
      setIsAuthenticated(true)
      setUserRole(role)
      localStorage.setItem('landiq-auth', 'authenticated')
      localStorage.setItem('landiq-role', role)
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUserRole(null)
    localStorage.removeItem('landiq-auth')
    localStorage.removeItem('landiq-role')
  }

  const isAdmin = userRole === 'admin'
  const isReadOnly = userRole === 'readonly'

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      login, 
      logout, 
      isLoading, 
      isAdmin, 
      isReadOnly 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

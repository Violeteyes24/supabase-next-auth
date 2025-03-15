'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

const AuthContext = createContext({})

export const useAuth = () => {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearSession: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('=== STARTING AUTH INITIALIZATION ===')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Initial session check:', {
          email: session?.user?.email || 'No user',
          hasSession: !!session,
          userId: session?.user?.id,
          accessToken: session?.access_token ? 'Present' : 'Missing',
          error: error?.message
        })
        setSession(session)
        setUser(session?.user ?? null)
        console.log('Auth state set:', {
          userSet: !!session?.user,
          sessionSet: !!session
        })
      } catch (error) {
        console.error('Error getting initial session:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
        console.log('=== AUTH INITIALIZATION COMPLETE ===')
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', {
        event,
        email: session?.user?.email || 'No user',
        hasSession: !!session
      })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    console.log('Attempting sign up with email:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // Disable email verification for now
      }
    })
    console.log('Sign up response:', { data, error })
    if (error) {
      console.log('Sign up error details:', error)
      // For development, we can try to sign in instead if signup fails
      if (error.message.includes('Database error')) {
        console.log('Signup failed, trying sign in instead...')
        return await supabase.auth.signInWithPassword({ email, password })
      }
      throw error
    }
    return data
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    console.log('signOut function called')
    try {
      // First check if there's an active session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      console.log('Current session before logout:', !!currentSession)

      if (currentSession) {
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        console.log('supabase.auth.signOut result:', error)
        if (error) throw error
      } else {
        console.log('No active session, clearing local state only')
      }

      // Always clear local state and AsyncStorage regardless
      await clearStorageAndState()
    } catch (error: any) {
      console.log('SignOut error:', error)
      // Even if signOut fails, clear local state and storage
      await clearStorageAndState()
      // Only throw if it's not a session-related error
      if (!error.message?.includes('session')) {
        throw error
      }
    }
  }

  const clearStorageAndState = async () => {
    try {
      // Clear all Supabase-related keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key =>
        key.includes('supabase') ||
        key.includes('sb-') ||
        key.includes('auth')
      )
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys)
        console.log('Cleared AsyncStorage keys:', supabaseKeys)
      }
    } catch (error) {
      console.log('Error clearing AsyncStorage:', error)
    }

    // Always clear local state
    setSession(null)
    setUser(null)
    console.log('Local auth state cleared')
  }

  const clearSession = async () => {
    console.log('clearSession function called')
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.log('Error during clearSession signOut:', error)
    }
    await clearStorageAndState()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signUp,
        signIn,
        signOut,
        clearSession,
        loading,
      }}
    >
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
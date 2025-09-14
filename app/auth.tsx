import React, { useState } from 'react'
import {
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/contexts/auth-context'
import { useThemeColor } from '@/hooks/use-theme-color'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const tintColor = useThemeColor({}, 'tint')
  const textColor = useThemeColor({}, 'text')

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        console.log('Starting sign up process')
        const result = await signUp(email, password)
        console.log('Sign up result:', result)

        if (result?.user && !result.session) {
          Alert.alert('Success', 'Please check your email for verification link!')
        } else if (result?.session) {
          Alert.alert('Success', 'Account created and signed in!')
        }
      } else {
        console.log('Starting sign in process')
        await signIn(email, password)
        console.log('Sign in completed')
      }
    } catch (error: any) {
      console.log('Auth error:', error)
      const errorMessage = error.message || 'Authentication failed'
      Alert.alert('Authentication Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </ThemedText>

        <ThemedText style={styles.debugText}>
          💡 If signup fails, try: test@test.com / password123
        </ThemedText>

        <TextInput
          style={[styles.input, { borderColor: tintColor, color: textColor }]}
          placeholder="Email"
          placeholderTextColor={textColor}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, { borderColor: tintColor, color: textColor }]}
          placeholder="Password"
          placeholderTextColor={textColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleAuth}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <ThemedText style={[styles.switchText, { color: tintColor }]}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    padding: 8,
  },
  switchText: {
    fontSize: 14,
  },
  debugText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
})
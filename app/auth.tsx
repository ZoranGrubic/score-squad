import React, { useState } from 'react'
import {
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/auth-context'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const insets = useSafeAreaInsets()
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string]

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
    <>
      <StatusBar style="light" hidden />
      <LinearGradient
        colors={gradientColors}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appName}>Score Squad</Text>
              <Text style={styles.title}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.authButtonText}>
                  {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setIsSignUp(!isSignUp)}
                activeOpacity={0.8}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
    textDecorationLine: 'none',
  },
  title: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    fontSize: 16,
    color: '#ffffff',
  },
  authButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 56,
    justifyContent: 'center',
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
})
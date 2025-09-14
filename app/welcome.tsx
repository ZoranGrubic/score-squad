import React from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColorScheme } from '@/hooks/use-color-scheme'

export default function WelcomeScreen() {
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()

  const handleGetStarted = () => {
    router.push('/auth')
  }

  // Define gradient colors based on theme
  const gradientColors = colorScheme === 'dark'
    ? ['#1a1a2e', '#16213e', '#0f3460']
    : ['#667eea', '#764ba2', '#f093fb']

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={gradientColors}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {/* Center Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.appName}>Score Squad</Text>
            <Text style={styles.tagline}>
              Track your games, compete with friends
            </Text>
          </View>

          {/* Get Started Button */}
          <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 40 }]}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.9}
            >
              <Text style={styles.getStartedText}>
                Let&apos;s Get Started
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -60, // Slightly higher than perfect center
  },
  appName: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  getStartedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
})
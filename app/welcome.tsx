import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemeColor } from '@/hooks/use-theme-color'

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets()
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string]

  const handleGetStarted = () => {
    router.push('/auth')
  }

  return (
    <>
      <StatusBar style="light" hidden />
      <LinearGradient
        colors={gradientColors}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 5, y: 3 }}
      >
        <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
          {/* Center Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.appName}>Score Squad</Text>
            <Text style={styles.tagline}>
              Track your games, compete with friends
            </Text>
          </View>

          {/* Get Started Button */}
          <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}>
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
    letterSpacing: 1,
    textDecorationLine: 'none',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    textDecorationLine: 'none',
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
  },
  getStartedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
})
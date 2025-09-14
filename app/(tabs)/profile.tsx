import React from 'react'
import { StyleSheet, TouchableOpacity, Alert, View, Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/auth-context'
import { useThemeColor } from '@/hooks/use-theme-color'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const insets = useSafeAreaInsets()
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string]

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={gradientColors}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) + 20 }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>Score Squad</Text>
            <Text style={styles.title}>Profile</Text>
          </View>

          {/* User Info Card */}
          <View style={styles.userCard}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Text style={styles.userIdText}>
              User ID: {user?.id?.slice(0, 8)}...
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Total Score</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Sign Out Button */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.9}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingBottom: Math.max(insets.bottom + 80, 100) }} />
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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
    textDecorationLine: 'none',
  },
  title: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  emailText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  userIdText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'none',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textDecorationLine: 'none',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  spacer: {
    flex: 1,
  },
  actions: {
    paddingBottom: 20,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 76, 76, 0.6)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 76, 0.8)',
    minHeight: 56,
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
})
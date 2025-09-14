import React from 'react'
import { StyleSheet, TouchableOpacity, Alert, View } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/contexts/auth-context'
import { useThemeColor } from '@/hooks/use-theme-color'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const buttonDangerColor = useThemeColor({}, 'buttonDanger')
  const buttonTextColor = useThemeColor({}, 'buttonText')
  const textMutedColor = useThemeColor({}, 'textMuted')

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error: any) {
      Alert.alert('Error', error.message)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.userInfo}>
          <ThemedText type="subtitle" style={styles.welcomeText}>
            Welcome back!
          </ThemedText>
          <ThemedText style={styles.emailText}>
            {user?.email}
          </ThemedText>
          <ThemedText style={[styles.debugText, { color: textMutedColor }]}>
            User ID: {user?.id?.slice(0, 8)}...
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: buttonDangerColor }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.buttonText, { color: buttonTextColor }]}>
              Sign Out
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    paddingBottom: 40,
  },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
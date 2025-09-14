import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, Alert } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const { user, signOut, clearSession, session } = useAuth();
  const tintColor = useThemeColor({}, 'tint');

  console.log('HomeScreen render - user:', user?.email, 'session exists:', !!session);

  const handleSignOut = async () => {
    console.log('Sign out button pressed');
    try {
      console.log('Calling signOut function');
      await signOut();
      console.log('Sign out completed');
    } catch (error: any) {
      console.log('Sign out error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleClearSession = async () => {
    console.log('Clear session button pressed');
    try {
      console.log('Calling clearSession function');
      await clearSession();
      console.log('Clear session completed');
      Alert.alert('Success', 'Session cleared');
    } catch (error: any) {
      console.log('Clear session error:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome {user?.email}!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">You&apos;re logged in!</ThemedText>
        <ThemedText>
          Email: <ThemedText type="defaultSemiBold">{user?.email}</ThemedText>
        </ThemedText>
        <ThemedText style={styles.debugText}>
          Debug: User ID: {user?.id?.slice(0, 8)}... | Session: {session ? 'Yes' : 'No'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: tintColor }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: '#ff4444' }]}
          onPress={handleClearSession}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.signOutText}>Force Clear Session</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  signOutButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  debugText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
});

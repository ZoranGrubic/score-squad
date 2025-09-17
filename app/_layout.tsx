import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { CompetitionProvider } from '@/contexts/competition-context';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  console.log('AppContent render - user:', user?.email, 'loading:', loading);

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('User exists, redirecting to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('No user, redirecting to welcome');
        router.replace('/welcome');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="create-competition" />
        <Stack.Screen name="competition-list" />
        <Stack.Screen name="competition-matches" />
        <Stack.Screen name="competition-details" />
        <Stack.Screen name="select-matches" />
        <Stack.Screen name="select-friends" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CompetitionProvider>
        <AppContent />
      </CompetitionProvider>
    </AuthProvider>
  );
}

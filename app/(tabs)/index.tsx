import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];

  const handleCreateCompetition = () => {
    router.push('/create-competition');
  };

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
            <Text style={styles.welcomeText}>Welcome, {user?.email?.split('@')[0]}</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Track Your Games</Text>
              <Text style={styles.cardDescription}>
                Start recording your game scores and compete with friends
              </Text>
            </View>

            <TouchableOpacity style={styles.competitionButton} onPress={handleCreateCompetition}>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonTitle}>Create Friendly Competition</Text>
                <Text style={styles.buttonDescription}>
                  Select matches and invite friends to bet
                </Text>
              </View>
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>+</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Activity</Text>
              <Text style={styles.cardDescription}>
                No games recorded yet. Be the first to add a game!
              </Text>
            </View>
          </View>

          <View style={{ paddingBottom: Math.max(insets.bottom + 80, 100) }} />
        </View>
      </LinearGradient>
    </>
  );
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
    marginBottom: 40,
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
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  mainContent: {
    flex: 1,
    gap: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  cardDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
    textDecorationLine: 'none',
  },
  competitionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  buttonDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    textDecorationLine: 'none',
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  buttonIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
});

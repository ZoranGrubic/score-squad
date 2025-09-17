import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ParticipatingCompetition {
  id: string;
  name: string;
  status: string;
  created_at: string;
  matches_count: number;
  my_predictions_count: number;
  friendly_competitions: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];

  const [participatingCompetitions, setParticipatingCompetitions] = useState<ParticipatingCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchParticipatingCompetitions();
  }, [user?.id]);

  const fetchParticipatingCompetitions = async () => {
    if (!user?.id) return;

    try {
      // Get competitions where user is a participant
      const { data, error } = await supabase
        .from('friendly_competition_participants')
        .select(`
          id,
          competition_id,
          status,
          friendly_competitions (
            id,
            name,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['invited', 'accepted']);

      if (error) {
        console.error('Error fetching participating competitions:', error);
        return;
      }

      // Get match and prediction counts for each competition
      const competitionsWithCounts = await Promise.all(
        (data || []).map(async (participation) => {
          const competition = participation.friendly_competitions;
          if (!competition) return null;

          const [matchesResult, predictionsResult] = await Promise.all([
            supabase
              .from('friendly_competition_matches')
              .select('id', { count: 'exact' })
              .eq('competition_id', competition.id),
            supabase
              .from('user_predictions')
              .select('id', { count: 'exact' })
              .eq('competition_id', competition.id)
              .eq('user_id', user.id)
          ]);

          return {
            id: participation.id,
            name: competition.name,
            status: competition.status,
            created_at: competition.created_at,
            matches_count: matchesResult.count || 0,
            my_predictions_count: predictionsResult.count || 0,
            friendly_competitions: competition
          };
        })
      );

      const filteredCompetitions = competitionsWithCounts.filter(Boolean) as ParticipatingCompetition[];
      setParticipatingCompetitions(filteredCompetitions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchParticipatingCompetitions();
  };

  const handleCreateCompetition = () => {
    router.push('/create-competition');
  };

  const handleCompetitionPress = (competition: ParticipatingCompetition) => {
    router.push({
      pathname: '/participate-competition',
      params: {
        competitionId: competition.friendly_competitions.id,
        competitionName: competition.name
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ffffff"
              />
            }
          >
            {/* Create Competition Button */}
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

            {/* My Competitions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Competitions</Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>Loading competitions...</Text>
                </View>
              ) : participatingCompetitions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🏆</Text>
                  <Text style={styles.emptyTitle}>No Competitions Yet</Text>
                  <Text style={styles.emptyDescription}>
                    You haven't been invited to any competitions yet. Create one or ask a friend to invite you!
                  </Text>
                </View>
              ) : (
                participatingCompetitions.map((competition) => (
                  <TouchableOpacity
                    key={competition.id}
                    style={styles.competitionCard}
                    onPress={() => handleCompetitionPress(competition)}
                  >
                    <View style={styles.competitionHeader}>
                      <View style={styles.competitionInfo}>
                        <Text style={styles.competitionName}>{competition.name}</Text>
                        <Text style={styles.competitionDate}>
                          Started: {formatDate(competition.created_at)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor: competition.status === 'active' ? '#4CAF50' : '#9E9E9E'
                      }]}>
                        <Text style={styles.statusText}>{competition.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.competitionStats}>
                      <View style={styles.stat}>
                        <Text style={styles.statNumber}>{competition.matches_count}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statNumber}>{competition.my_predictions_count}</Text>
                        <Text style={styles.statLabel}>My Predictions</Text>
                      </View>
                      <View style={styles.arrowContainer}>
                        <Text style={styles.arrow}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

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
    marginBottom: 30,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textDecorationLine: 'none',
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
  competitionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  competitionInfo: {
    flex: 1,
    marginRight: 12,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textDecorationLine: 'none',
  },
  competitionDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'none',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  competitionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    marginRight: 24,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textDecorationLine: 'none',
  },
  arrowContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  arrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    textDecorationLine: 'none',
  },
});

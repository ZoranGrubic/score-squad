import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface FriendlyCompetition {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  matches_count: number;
  participants_count: number;
}

export default function MyCompetitionsScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<FriendlyCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, [user?.id]);

  const fetchCompetitions = async () => {
    if (!user?.id) return;

    try {
      // Get competitions with match and participant counts
      const { data, error } = await supabase
        .from('friendly_competitions')
        .select(`
          id,
          name,
          description,
          status,
          created_at
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching competitions:', error);
        Alert.alert('Error', 'Unable to load competitions');
        return;
      }

      // Get counts separately for each competition
      const competitionsWithCounts = await Promise.all(
        (data || []).map(async (comp) => {
          const [matchesResult, participantsResult] = await Promise.all([
            supabase
              .from('friendly_competition_matches')
              .select('id', { count: 'exact' })
              .eq('competition_id', comp.id),
            supabase
              .from('friendly_competition_participants')
              .select('id', { count: 'exact' })
              .eq('competition_id', comp.id)
          ]);

          return {
            ...comp,
            matches_count: matchesResult.count || 0,
            participants_count: participantsResult.count || 0,
          };
        })
      );

      setCompetitions(competitionsWithCounts);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompetitions();
  };

  const handleCreateCompetition = () => {
    router.push('/create-competition');
  };

  const handleCompetitionPress = (competition: FriendlyCompetition) => {
    router.push({
      pathname: '/competition-details',
      params: {
        competitionId: competition.id,
        competitionName: competition.name
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#9E9E9E';
      case 'cancelled':
        return '#F44336';
      default:
        return '#2196F3';
    }
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
            <Text style={styles.title}>My Competitions</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateCompetition}>
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Manage your friendly competitions and track results
          </Text>

          {/* Competitions List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading competitions...</Text>
            </View>
          ) : competitions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>No Competitions Yet</Text>
              <Text style={styles.emptyText}>
                Create your first friendly competition and invite friends to compete!
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreateCompetition}>
                <Text style={styles.emptyButtonText}>Create Competition</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.competitionsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#ffffff"
                />
              }
            >
              {competitions.map((competition) => (
                <TouchableOpacity
                  key={competition.id}
                  style={styles.competitionItem}
                  onPress={() => handleCompetitionPress(competition)}
                >
                  <View style={styles.competitionHeader}>
                    <View style={styles.competitionInfo}>
                      <Text style={styles.competitionName}>{competition.name}</Text>
                      <Text style={styles.competitionDate}>
                        Created: {formatDate(competition.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(competition.status) }]}>
                      <Text style={styles.statusText}>{competition.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.competitionStats}>
                    <View style={styles.stat}>
                      <Text style={styles.statNumber}>{competition.matches_count}</Text>
                      <Text style={styles.statLabel}>Matches</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statNumber}>{competition.participants_count}</Text>
                      <Text style={styles.statLabel}>Participants</Text>
                    </View>
                    <View style={styles.arrowContainer}>
                      <Text style={styles.arrow}>→</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    textDecorationLine: 'none',
  },
  competitionsList: {
    flex: 1,
  },
  competitionItem: {
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    textDecorationLine: 'none',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    textDecorationLine: 'none',
  },
  emptyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textDecorationLine: 'none',
  },
});
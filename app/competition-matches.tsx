import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Match {
  id: string;
  external_id: number;
  competition_id: string;
  status: string;
  match_date: number;
  stage?: string;
  home_team?: {
    id: string;
    name: string;
    short_name?: string;
    crest?: string;
  };
  away_team?: {
    id: string;
    name: string;
    short_name?: string;
    crest?: string;
  };
}

export default function CompetitionMatchesScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { competitionId, competitionName, selectedMatches } = useLocalSearchParams<{
    competitionId: string;
    competitionName: string;
    selectedMatches: string;
  }>();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMatches) {
      const parsedMatches = JSON.parse(selectedMatches);
      setSelectedMatchIds(parsedMatches);
    }
    if (competitionId) {
      fetchMatches();
    }
  }, [competitionId, selectedMatches]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(id, name, short_name, crest),
          away_team:away_team_id(id, name, short_name, crest)
        `)
        .eq('competition_id', competitionId)
        .gte('match_date', Math.floor(Date.now() / 1000)) // Only future matches
        .order('match_date');

      if (error) {
        console.error('Error fetching matches:', error);
        Alert.alert('Error', 'Unable to load matches');
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchToggle = (matchId: string) => {
    setSelectedMatchIds(prev =>
      prev.includes(matchId)
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleBack = () => {
    // Here we should save the selected matches for this competition
    // and return to the competition list
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{competitionName}</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.subtitle}>
            Select matches from this competition
          </Text>

          {/* Selected Count */}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Selected: {selectedMatchIds.length} {selectedMatchIds.length === 1 ? 'match' : 'matches'}
            </Text>
          </View>

          {/* Matches List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading matches...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>No available matches for this competition</Text>
            </View>
          ) : (
            <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={[
                    styles.matchItem,
                    selectedMatchIds.includes(match.id) && styles.selectedMatch
                  ]}
                  onPress={() => handleMatchToggle(match.id)}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.matchDate}>
                      {formatDate(new Date(match.match_date * 1000).toISOString())}
                    </Text>
                    <Text style={styles.matchTime}>
                      {new Date(match.match_date * 1000).toLocaleTimeString('sr-RS', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {selectedMatchIds.includes(match.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>

                  <View style={styles.teamsContainer}>
                    <View style={styles.team}>
                      <View style={styles.teamLogoContainer}>
                        {match.home_team?.crest ? (
                          <Image
                            source={{ uri: match.home_team.crest }}
                            style={styles.teamCrest}
                            defaultSource={require('@/assets/images/react-logo.png')}
                          />
                        ) : (
                          <Text style={styles.teamLogo}>⚽</Text>
                        )}
                      </View>
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.home_team?.short_name || match.home_team?.name || 'TBA'}
                      </Text>
                    </View>

                    <Text style={styles.versus}>VS</Text>

                    <View style={styles.team}>
                      <View style={styles.teamLogoContainer}>
                        {match.away_team?.crest ? (
                          <Image
                            source={{ uri: match.away_team.crest }}
                            style={styles.teamCrest}
                            defaultSource={require('@/assets/images/react-logo.png')}
                          />
                        ) : (
                          <Text style={styles.teamLogo}>⚽</Text>
                        )}
                      </View>
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.away_team?.short_name || match.away_team?.name || 'TBA'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.matchStatus}>Status: {match.status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} />
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'none',
    flex: 1,
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    textDecorationLine: 'none',
  },
  countContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  matchesList: {
    flex: 1,
    marginBottom: 20,
  },
  matchItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedMatch: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  matchDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'none',
  },
  matchTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  checkmark: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamLogo: {
    fontSize: 16,
    textDecorationLine: 'none',
  },
  teamCrest: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teamName: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'none',
    maxWidth: 80,
  },
  versus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 'bold',
    marginHorizontal: 16,
    textDecorationLine: 'none',
  },
  matchStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
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
  noMatchesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  noMatchesText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    textDecorationLine: 'none',
  },
});
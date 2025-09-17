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
  competition?: {
    name: string;
  };
}

interface Competition {
  id: string;
  name: string;
}

export default function SelectMatchesScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { selectedCompetitions } = useLocalSearchParams<{ selectedCompetitions: string }>();
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    if (selectedCompetitions) {
      const parsedCompetitions = JSON.parse(selectedCompetitions);
      setCompetitions(parsedCompetitions);
      fetchMatches(parsedCompetitions.map((c: Competition) => c.id));
    }
  }, [selectedCompetitions]);

  const fetchMatches = async (competitionIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(id, name, short_name, crest),
          away_team:away_team_id(id, name, short_name, crest),
          competition:competition_id(name)
        `)
        .in('competition_id', competitionIds)
        .gte('match_date', Math.floor(Date.now() / 1000)) // Only future matches
        .order('match_date');

      if (error) {
        console.error('Error fetching matches:', error);
        Alert.alert('Greška', 'Nije moguće učitati utakmice');
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Greška', 'Došlo je do greške');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchToggle = (matchId: string) => {
    setSelectedMatches(prev =>
      prev.includes(matchId)
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleNext = () => {
    if (selectedMatches.length === 0) {
      Alert.alert('Greška', 'Molimo izaberite bar jednu utakmicu');
      return;
    }
    router.push({
      pathname: '/select-friends',
      params: {
        selectedCompetitions: selectedCompetitions || '',
        selectedMatches: JSON.stringify(selectedMatches)
      }
    });
  };

  const handleBack = () => {
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
            <Text style={styles.title}>Izaberi utakmice</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.subtitle}>
            {competitions.map(c => c.name).join(', ')} - Izaberi utakmice na koje će se tvoji prijatelji kladiti
          </Text>

          {/* Selected Count */}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Izabrano: {selectedMatches.length} {selectedMatches.length === 1 ? 'utakmica' : 'utakmica'}
            </Text>
          </View>

          {/* Matches List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Učitavanje utakmica...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>Nema dostupnih utakmica za izabrana takmičenja</Text>
            </View>
          ) : (
            <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={[
                    styles.matchItem,
                    selectedMatches.includes(match.id) && styles.selectedMatch
                  ]}
                  onPress={() => handleMatchToggle(match.id)}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.matchDate}>{formatDate(new Date(match.match_date * 1000).toISOString())}</Text>
                    <Text style={styles.matchTime}>{new Date(match.match_date * 1000).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Text style={styles.competitionBadge}>{match.competition?.name}</Text>
                    {selectedMatches.includes(match.id) && (
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
                      <Text style={styles.teamName} numberOfLines={2}>{match.home_team?.short_name || match.home_team?.name || 'TBA'}</Text>
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
                      <Text style={styles.teamName} numberOfLines={2}>{match.away_team?.short_name || match.away_team?.name || 'TBA'}</Text>
                    </View>
                  </View>

                  <Text style={styles.matchStatus}>Status: {match.status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, selectedMatches.length === 0 && styles.disabledButton]}
            onPress={handleNext}
            disabled={selectedMatches.length === 0}
          >
            <Text style={[styles.nextButtonText, selectedMatches.length === 0 && styles.disabledButtonText]}>
              Nastavi ({selectedMatches.length})
            </Text>
          </TouchableOpacity>

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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'none',
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
  teamLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  competitionBadge: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
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
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textDecorationLine: 'none',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompetition } from '@/contexts/competition-context';

interface Competition {
  id: string;
  external_id: string;
  name: string;
  code?: string;
  type?: string;
  emblem?: string;
  selectedMatchesCount: number;
}

export default function CompetitionListScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { selectedMatches } = useCompetition();
  const { editingCompetition } = useLocalSearchParams<{ editingCompetition?: string }>();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (editingCompetition) {
      setIsEditing(true);
    }
    fetchCompetitions();
  }, [selectedMatches, editingCompetition]);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching competitions:', error);
        Alert.alert('Error', 'Unable to load competitions');
        return;
      }

      setCompetitions((data || []).map(comp => ({
        ...comp,
        selectedMatchesCount: selectedMatches.filter(m => m.competition_id === comp.id).length
      })));
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionPress = (competition: Competition) => {
    router.push({
      pathname: '/competition-matches',
      params: {
        competitionId: competition.id,
        competitionName: competition.name
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleDone = async () => {
    if (selectedMatches.length === 0) {
      Alert.alert('Error', 'Please select at least one match');
      return;
    }

    if (isEditing && editingCompetition) {
      // Add new matches to existing competition
      try {
        // First, get existing matches for this competition
        const { data: existingMatches, error: fetchError } = await supabase
          .from('friendly_competition_matches')
          .select('match_id')
          .eq('competition_id', editingCompetition);

        if (fetchError) {
          console.error('Error fetching existing matches:', fetchError);
          Alert.alert('Error', 'Failed to fetch existing matches');
          return;
        }

        const existingMatchIds = existingMatches?.map(m => m.match_id) || [];
        const newMatches = selectedMatches.filter(match => !existingMatchIds.includes(match.id));

        if (newMatches.length === 0) {
          Alert.alert('Info', 'All selected matches are already in this competition');
          router.back();
          return;
        }

        // Add only new matches
        const matchInserts = newMatches.map(match => ({
          competition_id: editingCompetition,
          match_id: match.id
        }));

        const { error: insertError } = await supabase
          .from('friendly_competition_matches')
          .insert(matchInserts);

        if (insertError) {
          console.error('Error adding matches:', insertError);
          Alert.alert('Error', 'Failed to add matches to competition');
          return;
        }

        Alert.alert('Success', `Added ${newMatches.length} new matches to competition!`);
        router.back();
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'An error occurred');
      }
    } else {
      // Navigate back to create competition screen
      router.back();
    }
  };

  const getTotalSelectedMatches = () => {
    return selectedMatches.length;
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
            <Text style={styles.title}>{isEditing ? 'Add More Matches' : 'Choose Matches'}</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.subtitle}>
            {isEditing ? 'Select additional matches to add to your competition' : 'Select competitions and matches your friends will bet on'}
          </Text>

          {/* Total Count */}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Total selected: {getTotalSelectedMatches()} {getTotalSelectedMatches() === 1 ? 'match' : 'matches'}
            </Text>
          </View>

          {/* Competitions List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading competitions...</Text>
            </View>
          ) : (
            <ScrollView style={styles.competitionsList} showsVerticalScrollIndicator={false}>
              {competitions.map((competition) => (
                <TouchableOpacity
                  key={competition.id}
                  style={[
                    styles.competitionItem,
                    competition.selectedMatchesCount > 0 && styles.selectedItem
                  ]}
                  onPress={() => handleCompetitionPress(competition)}
                >
                  <View style={styles.competitionInfo}>
                    <View style={styles.competitionLogoContainer}>
                      {competition.emblem ? (
                        <Image
                          source={{ uri: competition.emblem }}
                          style={styles.competitionEmblem}
                          defaultSource={require('@/assets/images/react-logo.png')}
                        />
                      ) : (
                        <Text style={styles.competitionLogo}>⚽</Text>
                      )}
                    </View>
                    <View style={styles.competitionDetails}>
                      <Text style={styles.competitionName}>{competition.name}</Text>
                      <Text style={styles.competitionCountry}>
                        {competition.code || competition.type}
                        {competition.selectedMatchesCount > 0 &&
                          ` • ${competition.selectedMatchesCount} selected matches`
                        }
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={[styles.doneButton, getTotalSelectedMatches() === 0 && styles.disabledButton]}
            onPress={handleDone}
            disabled={getTotalSelectedMatches() === 0}
          >
            <Text style={[styles.doneButtonText, getTotalSelectedMatches() === 0 && styles.disabledButtonText]}>
              {isEditing ? `Add Matches (${getTotalSelectedMatches()})` : `Done (${getTotalSelectedMatches()})`}
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
  competitionsList: {
    flex: 1,
    marginBottom: 20,
  },
  competitionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  competitionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  competitionLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  competitionLogo: {
    fontSize: 20,
    textDecorationLine: 'none',
  },
  competitionEmblem: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  competitionDetails: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textDecorationLine: 'none',
  },
  competitionCountry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'none',
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
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textDecorationLine: 'none',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
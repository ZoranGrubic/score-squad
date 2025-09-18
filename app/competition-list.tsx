import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useCompetition } from '@/contexts/competition-context';
import { CustomAlert } from '@/components/custom-alert';
import { useCustomAlert } from '@/hooks/use-custom-alert';

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
  const { selectedMatches, clearAll } = useCompetition();
  const { editingCompetition } = useLocalSearchParams<{ editingCompetition?: string }>();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  useEffect(() => {
    if (editingCompetition) {
      setIsEditing(true);
    }
    fetchCompetitions();
  }, [selectedMatches, editingCompetition]);

  // Additional effect to refresh when selectedMatches changes in edit mode
  useEffect(() => {
    if (isEditing && selectedMatches.length > 0) {
      console.log('EDIT MODE - Detected selectedMatches change, refreshing competitions');
      fetchCompetitions();
    }
  }, [selectedMatches.length, isEditing]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log(`FOCUS EFFECT - ${isEditing ? 'EDIT' : 'CREATE'} MODE - Refreshing competitions list`);
      console.log('Current selected matches in context:', selectedMatches.length);
      fetchCompetitions();
    }, [isEditing, selectedMatches])
  );

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching competitions:', error);
        showAlert('Error', 'Unable to load competitions');
        return;
      }

      const competitionsWithCounts = (data || []).map(comp => {
        const matchCount = selectedMatches.filter(m => m.competition_id === comp.id).length;

        if (matchCount > 0) {
          const mode = isEditing ? 'EDIT' : 'CREATE';
          console.log(`${mode} MODE - Competition ${comp.name}: ${matchCount} matches selected`);
        }

        return {
          ...comp,
          selectedMatchesCount: matchCount
        };
      });

      const mode = isEditing ? 'EDIT' : 'CREATE';
      console.log(`${mode} MODE - FETCH COMPETITIONS - Selected matches in context:`, selectedMatches.length);

      setCompetitions(competitionsWithCounts);
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionPress = (competition: Competition) => {
    const params: any = {
      competitionId: competition.id,
      competitionName: competition.name
    };

    // Pass editingCompetition if we're in edit mode
    if (isEditing && editingCompetition) {
      params.editingCompetition = editingCompetition;
    }

    router.push({
      pathname: '/competition-matches',
      params
    });
  };

  const handleBack = () => {
    // If in CREATE mode and going back, clear context
    if (!isEditing) {
      console.log('CREATE MODE - Going back from competition-list, clearing context');
      // Clear selections since we're abandoning the create flow
      clearAll();
    }
    router.back();
  };

  const handleDone = async () => {
    // In EDIT mode, there's no "done" action - changes are applied immediately
    if (isEditing) {
      console.log('EDIT MODE - No done action needed, going back');
      router.back();
      return;
    }

    // CREATE mode validation
    if (selectedMatches.length === 0) {
      showAlert('Error', 'Please select at least one match');
      return;
    }

    // This should never happen now since we return early for edit mode
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
          showAlert('Error', 'Failed to fetch existing matches');
          return;
        }

        const existingMatchIds = existingMatches?.map(m => m.match_id) || [];
        const newMatches = selectedMatches.filter(match => !existingMatchIds.includes(match.id));

        if (newMatches.length === 0) {
          showAlert('Info', 'All selected matches are already in this competition');
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
          showAlert('Error', 'Failed to add matches to competition');
          return;
        }

        showAlert('Success', `Added ${newMatches.length} new matches to competition!`);
        router.back();
      } catch (error) {
        console.error('Error:', error);
        showAlert('Error', 'An error occurred');
      }
    } else {
      // Navigate back to create competition screen
      router.back();
    }
  };

  const getTotalSelectedMatches = () => {
    if (isEditing) {
      // In EDIT mode, we don't track global count
      return 0;
    }
    // In CREATE mode, count all selected matches
    return selectedMatches.length;
  };

  const getCreateModeText = () => {
    const total = getTotalSelectedMatches();
    return `Total selected: ${total} ${total === 1 ? 'match' : 'matches'}`;
  };

  const getEditModeText = () => {
    return 'Select additional matches to add';
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
              {isEditing ? getEditModeText() : getCreateModeText()}
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
                          ` • ✓ ${competition.selectedMatchesCount} selected`
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
            style={[styles.doneButton, !isEditing && getTotalSelectedMatches() === 0 && styles.disabledButton]}
            onPress={handleDone}
            disabled={!isEditing && getTotalSelectedMatches() === 0}
          >
            <Text style={[styles.doneButtonText, !isEditing && getTotalSelectedMatches() === 0 && styles.disabledButtonText]}>
              {isEditing ? 'Done Editing' : `Done (${getTotalSelectedMatches()})`}
            </Text>
          </TouchableOpacity>

          <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} />
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
          onClose={hideAlert}
        />
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
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.6)',
    borderWidth: 2,
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
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompetition } from '@/contexts/competition-context';
import { CustomAlert } from '@/components/custom-alert';
import { useCustomAlert } from '@/hooks/use-custom-alert';

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
  const { competitionId, competitionName, editingCompetition } = useLocalSearchParams<{
    competitionId: string;
    competitionName: string;
    editingCompetition?: string;
  }>();
  const { selectedMatches, setSelectedMatches, clearAll } = useCompetition();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [existingMatchIds, setExistingMatchIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  useEffect(() => {
    if (editingCompetition) {
      // EDIT MODE: Load existing matches from friendly competition
      initializeEditMode();
    } else {
      // CREATE MODE: Use context to show selected matches
      initializeCreateMode();
    }

    // Always fetch matches for this competition
    if (competitionId) {
      fetchMatches();
    }
  }, [competitionId, editingCompetition]);

  // Only for CREATE mode - update when context changes
  useEffect(() => {
    if (!isEditing && !editingCompetition) {
      setSelectedMatchIds(selectedMatches.map(m => m.id));
    }
  }, [selectedMatches, isEditing, editingCompetition]);

  const initializeCreateMode = () => {
    console.log('=== INITIALIZING CREATE MODE ===');
    setIsEditing(false);
    setExistingMatchIds([]);

    // Set selected matches from context (user's selections)
    const contextMatchIds = selectedMatches
      .filter(m => m.competition_id === competitionId)
      .map(m => m.id);

    setSelectedMatchIds(contextMatchIds);
    console.log('CREATE MODE - Set selected from context:', contextMatchIds.length, 'matches');
  };

  const initializeEditMode = async () => {
    console.log('=== INITIALIZING EDIT MODE ===');
    setIsEditing(true);

    // Clear context first, then load existing matches into it for UI display
    setSelectedMatches([]);
    console.log('EDIT MODE - Cleared context, will load existing matches for UI');

    // Load existing matches from database AND populate context for UI
    await loadExistingMatches();
  };

  const loadExistingMatches = async () => {
    if (!editingCompetition) return;

    try {
      const { data, error } = await supabase
        .from('friendly_competition_matches')
        .select(`
          match_id,
          matches (
            id,
            external_id,
            competition_id,
            status,
            match_date,
            stage,
            home_team:home_team_id(id, name, short_name, crest),
            away_team:away_team_id(id, name, short_name, crest)
          )
        `)
        .eq('competition_id', editingCompetition);

      if (error) {
        console.error('Error fetching existing matches:', error);
        return;
      }

      const existingMatches = (data || [])
        .map(item => item.matches)
        .filter(Boolean) as Match[];

      const existingIds = existingMatches.map(m => m.id);

      setExistingMatchIds(existingIds);
      setSelectedMatchIds(existingIds);

      // ADD existing matches to context for UI display (competition-list should show counts)
      setSelectedMatches(existingMatches);
      console.log('EDIT MODE - Loaded', existingIds.length, 'existing matches, added to context for UI display');
    } catch (error) {
      console.error('Error loading existing matches:', error);
    }
  };

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
        showAlert('Error', 'Unable to load matches');
        return;
      }

      setMatches(data || []);
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchToggle = async (matchId: string) => {
    if (isEditing) {
      await handleEditModeToggle(matchId);
    } else {
      handleCreateModeToggle(matchId);
    }
  };

  const handleCreateModeToggle = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isSelected = selectedMatchIds.includes(matchId);

    if (isSelected) {
      // REMOVE from selection in CREATE mode
      setSelectedMatchIds(prev => prev.filter(id => id !== matchId));
      setSelectedMatches(prev => {
        const newMatches = prev.filter(m => m.id !== matchId);
        console.log('CREATE MODE - REMOVED match, context now has:', newMatches.length, 'matches');
        return newMatches;
      });
    } else {
      // ADD to selection in CREATE mode
      setSelectedMatchIds(prev => [...prev, matchId]);
      setSelectedMatches(prev => {
        const newMatches = [...prev, match];
        console.log('CREATE MODE - ADDED match, context now has:', newMatches.length, 'matches');
        console.log('Match added:', match.id, 'from competition:', match.competition_id);
        return newMatches;
      });
    }
  };

  const handleEditModeToggle = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const matchHasStarted = match.match_date * 1000 < Date.now();
    const isExistingMatch = existingMatchIds.includes(matchId);

    // Don't allow removal of matches that have started
    if (isExistingMatch && matchHasStarted) {
      showAlert('Cannot Remove', 'Matches that have already started cannot be removed from the competition.');
      return;
    }

    const isSelected = selectedMatchIds.includes(matchId);

    if (isSelected) {
      // REMOVE from competition in EDIT mode
      if (isExistingMatch) {
        const success = await removeMatchFromCompetition(matchId);
        if (!success) return;
      }

      setSelectedMatchIds(prev => prev.filter(id => id !== matchId));
      // Also remove from context for UI consistency
      setSelectedMatches(prev => prev.filter(m => m.id !== matchId));
      console.log('EDIT MODE - REMOVED match from database and context:', matchId);
    } else {
      // ADD to competition in EDIT mode - save immediately to database
      const success = await addMatchToCompetition(matchId);
      if (success) {
        setSelectedMatchIds(prev => [...prev, matchId]);
        setExistingMatchIds(prev => [...prev, matchId]);
        // Also add to context for UI consistency
        setSelectedMatches(prev => [...prev, match]);
        console.log('EDIT MODE - ADDED match to database and context:', matchId);
      }
    }

    // IMPORTANT: In edit mode, context is updated for UI consistency
    // But all database changes are applied immediately
  };

  const removeMatchFromCompetition = async (matchId: string): Promise<boolean> => {
    if (!editingCompetition) return false;

    try {
      const { error } = await supabase
        .from('friendly_competition_matches')
        .delete()
        .eq('competition_id', editingCompetition)
        .eq('match_id', matchId);

      if (error) {
        console.error('Error removing match from competition:', error);
        showAlert('Error', 'Failed to remove match from competition');
        return false;
      }

      // Update existing match IDs
      setExistingMatchIds(prev => prev.filter(id => id !== matchId));
      console.log('Match removed from competition successfully');
      return true;
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred while removing the match');
      return false;
    }
  };

  const addMatchToCompetition = async (matchId: string): Promise<boolean> => {
    if (!editingCompetition) return false;

    try {
      const { error } = await supabase
        .from('friendly_competition_matches')
        .insert([{
          competition_id: editingCompetition,
          match_id: matchId
        }]);

      if (error) {
        console.error('Error adding match to competition:', error);
        showAlert('Error', 'Failed to add match to competition');
        return false;
      }

      console.log('Successfully added match to competition:', matchId);
      return true;
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred while adding the match');
      return false;
    }
  };

  const handleBack = () => {
    if (isEditing) {
      handleEditModeBack();
    } else {
      handleCreateModeBack();
    }
  };

  const handleCreateModeBack = () => {
    // In CREATE mode, keep selections in context UNLESS we're completely backing out
    // For now, keep selections so user can go back to competition-list and see counts
    console.log('CREATE MODE - Going back, keeping', selectedMatches.length, 'matches in context');
    router.back();
  };

  const handleEditModeBack = () => {
    // In EDIT mode, keep context for UI display (shows match counts in competition list)
    console.log('EDIT MODE - Going back, keeping context for UI display');
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
                    // Selected state - for all selected matches (both create and edit mode)
                    selectedMatchIds.includes(match.id) && styles.selectedMatch,
                    // Locked state - for matches that have started in edit mode (overrides selected style)
                    isEditing && existingMatchIds.includes(match.id) && match.match_date * 1000 < Date.now() && styles.lockedMatch
                  ]}
                  onPress={() => handleMatchToggle(match.id)}
                  disabled={isEditing && existingMatchIds.includes(match.id) && match.match_date * 1000 < Date.now()}
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
                    <View style={styles.statusContainer}>
                      {/* Show checkmark for all selected matches */}
                      {selectedMatchIds.includes(match.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                      {/* Show lock icon for started matches in edit mode */}
                      {isEditing && existingMatchIds.includes(match.id) && match.match_date * 1000 < Date.now() && (
                        <Text style={styles.lockedMatchLabel}>🔒</Text>
                      )}
                    </View>
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  existingMatchLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    textDecorationLine: 'none',
  },
  lockedMatchLabel: {
    fontSize: 14,
    textDecorationLine: 'none',
  },
  existingMatch: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  lockedMatch: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
    opacity: 0.7,
  },
});
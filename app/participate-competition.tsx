import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { CustomAlert } from '@/components/custom-alert';
import { useCustomAlert } from '@/hooks/use-custom-alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface Match {
  id: string;
  external_id: number;
  status: string;
  match_date: number;
  home_score?: number;
  away_score?: number;
  winner?: string;
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

interface UserPrediction {
  id: string;
  match_id: string;
  home_score?: number;
  away_score?: number;
  predicted_winner?: string;
  points_earned: number;
}

export default function ParticipateCompetitionScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { user } = useAuth();
  const { competitionId, competitionName } = useLocalSearchParams<{
    competitionId: string;
    competitionName: string;
  }>();

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<{ [matchId: string]: UserPrediction }>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [predictionModalVisible, setPredictionModalVisible] = useState(false);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionData();
    }
  }, [competitionId]);

  const fetchCompetitionData = async () => {
    try {
      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('friendly_competition_matches')
        .select(`
          matches (
            id,
            external_id,
            status,
            match_date,
            home_score,
            away_score,
            winner,
            home_team:home_team_id(id, name, short_name, crest),
            away_team:away_team_id(id, name, short_name, crest)
          )
        `)
        .eq('competition_id', competitionId);

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        showAlert('Error', 'Unable to load matches');
        return;
      }

      const formattedMatches = matchesData?.map(item => item.matches).filter(Boolean) || [];
      setMatches(formattedMatches);

      // Fetch user predictions
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('competition_id', competitionId)
        .eq('user_id', user?.id);

      if (predictionsError) {
        console.error('Error fetching predictions:', predictionsError);
      } else {
        const predictionsMap = (predictionsData || []).reduce((acc, prediction) => {
          acc[prediction.match_id] = prediction;
          return acc;
        }, {} as { [matchId: string]: UserPrediction });
        setPredictions(predictionsMap);
      }

    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPress = (match: Match) => {
    setSelectedMatch(match);
    const existingPrediction = predictions[match.id];
    if (existingPrediction) {
      setHomeScore(existingPrediction.home_score?.toString() || '');
      setAwayScore(existingPrediction.away_score?.toString() || '');
    } else {
      setHomeScore('');
      setAwayScore('');
    }
    setPredictionModalVisible(true);
  };

  const handleSavePrediction = async () => {
    if (!selectedMatch) return;

    const homeScoreNum = parseInt(homeScore);
    const awayScoreNum = parseInt(awayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum) || homeScoreNum < 0 || awayScoreNum < 0) {
      showAlert('Error', 'Please enter valid scores (0 or higher)');
      return;
    }

    let predictedWinner = 'draw';
    if (homeScoreNum > awayScoreNum) {
      predictedWinner = 'home';
    } else if (awayScoreNum > homeScoreNum) {
      predictedWinner = 'away';
    }

    try {
      const existingPrediction = predictions[selectedMatch.id];

      if (existingPrediction) {
        // Update existing prediction
        const { error } = await supabase
          .from('user_predictions')
          .update({
            home_score: homeScoreNum,
            away_score: awayScoreNum,
            predicted_winner: predictedWinner,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPrediction.id);

        if (error) {
          console.error('Error updating prediction:', error);
          showAlert('Error', 'Failed to update prediction');
          return;
        }
      } else {
        // Create new prediction
        const { error } = await supabase
          .from('user_predictions')
          .insert([{
            competition_id: competitionId,
            match_id: selectedMatch.id,
            user_id: user?.id,
            home_score: homeScoreNum,
            away_score: awayScoreNum,
            predicted_winner: predictedWinner
          }]);

        if (error) {
          console.error('Error creating prediction:', error);
          showAlert('Error', 'Failed to save prediction');
          return;
        }
      }

      // Update local state
      setPredictions(prev => ({
        ...prev,
        [selectedMatch.id]: {
          id: existingPrediction?.id || '',
          match_id: selectedMatch.id,
          home_score: homeScoreNum,
          away_score: awayScoreNum,
          predicted_winner: predictedWinner,
          points_earned: existingPrediction?.points_earned || 0
        }
      }));

      setPredictionModalVisible(false);
      setSelectedMatch(null);
      setHomeScore('');
      setAwayScore('');

      showAlert('Success', 'Prediction saved successfully!');
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'An error occurred');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPastMatch = (timestamp: number) => {
    return timestamp * 1000 < Date.now();
  };

  if (loading) {
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading competition...</Text>
            </View>
          </View>
        </LinearGradient>
      </>
    );
  }

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
            Tap on matches to make your predictions
          </Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {matches.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>No matches available yet</Text>
              </View>
            ) : (
              matches.map((match) => {
                const prediction = predictions[match.id];
                const isMatchPast = isPastMatch(match.match_date);

                return (
                  <TouchableOpacity
                    key={match.id}
                    style={[
                      styles.matchCard,
                      prediction && styles.matchCardWithPrediction,
                      isMatchPast && styles.matchCardPast
                    ]}
                    onPress={() => !isMatchPast && handleMatchPress(match)}
                    disabled={isMatchPast}
                  >
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchDate}>
                        {formatDate(match.match_date)} • {formatTime(match.match_date)}
                      </Text>
                      <Text style={[styles.matchStatus, isMatchPast && styles.matchStatusPast]}>
                        {isMatchPast ? 'FINISHED' : match.status}
                      </Text>
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

                      <View style={styles.scoreContainer}>
                        {match.status === 'FINISHED' && match.home_score !== null && match.away_score !== null ? (
                          // Show actual match score only for finished matches with real scores
                          <>
                            <Text style={styles.actualScore}>{match.home_score}</Text>
                            <Text style={styles.versus}>-</Text>
                            <Text style={styles.actualScore}>{match.away_score}</Text>
                          </>
                        ) : (
                          // Show VS for all unfinished matches (regardless of predictions)
                          <Text style={styles.versus}>VS</Text>
                        )}
                      </View>

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

                    {prediction && (
                      <View style={styles.predictionInfo}>
                        <Text style={styles.predictionText}>
                          Your prediction: {prediction.home_score} - {prediction.away_score}
                        </Text>
                        {match.status === 'FINISHED' && match.home_score !== null && match.away_score !== null && (
                          <Text style={styles.actualResultText}>
                            Actual result: {match.home_score} - {match.away_score}
                          </Text>
                        )}
                        {prediction.points_earned > 0 && (
                          <Text style={styles.pointsText}>
                            Points earned: {prediction.points_earned}
                          </Text>
                        )}
                        {match.status === 'FINISHED' && prediction.points_earned === 0 && (
                          <Text style={styles.noPointsText}>
                            No points earned
                          </Text>
                        )}
                      </View>
                    )}

                    {!prediction && !isMatchPast && (
                      <View style={styles.noPredictionContainer}>
                        <Text style={styles.noPredictionText}>Tap to predict</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} />
        </View>

        {/* Prediction Modal */}
        <Modal
          visible={predictionModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPredictionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={gradientColors}
              style={styles.modalContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header with close button */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setPredictionModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Make Your Prediction</Text>
                <View style={styles.modalPlaceholder} />
              </View>

              {selectedMatch && (
                <View style={styles.modalMatchInfo}>
                  <View style={styles.modalTeamsContainer}>
                    <View style={styles.modalTeam}>
                      <View style={styles.modalTeamLogoContainer}>
                        {selectedMatch.home_team?.crest ? (
                          <Image
                            source={{ uri: selectedMatch.home_team.crest }}
                            style={styles.modalTeamCrest}
                            defaultSource={require('@/assets/images/react-logo.png')}
                          />
                        ) : (
                          <Text style={styles.modalTeamLogo}>⚽</Text>
                        )}
                      </View>
                      <Text style={styles.modalTeamName} numberOfLines={2}>
                        {selectedMatch.home_team?.short_name || selectedMatch.home_team?.name || 'TBA'}
                      </Text>
                    </View>

                    <Text style={styles.modalVersus}>VS</Text>

                    <View style={styles.modalTeam}>
                      <View style={styles.modalTeamLogoContainer}>
                        {selectedMatch.away_team?.crest ? (
                          <Image
                            source={{ uri: selectedMatch.away_team.crest }}
                            style={styles.modalTeamCrest}
                            defaultSource={require('@/assets/images/react-logo.png')}
                          />
                        ) : (
                          <Text style={styles.modalTeamLogo}>⚽</Text>
                        )}
                      </View>
                      <Text style={styles.modalTeamName} numberOfLines={2}>
                        {selectedMatch.away_team?.short_name || selectedMatch.away_team?.name || 'TBA'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.scoreInputContainer}>
                <View style={styles.scoreInput}>
                  <Text style={styles.inputLabel}>Home Score</Text>
                  <TextInput
                    style={styles.input}
                    value={homeScore}
                    onChangeText={setHomeScore}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>

                <Text style={styles.scoreSeparator}>-</Text>

                <View style={styles.scoreInput}>
                  <Text style={styles.inputLabel}>Away Score</Text>
                  <TextInput
                    style={styles.input}
                    value={awayScore}
                    onChangeText={setAwayScore}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setPredictionModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonSave}
                  onPress={handleSavePrediction}
                >
                  <Text style={styles.modalButtonTextSave}>Save Prediction</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>

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
  scrollView: {
    flex: 1,
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  matchCardWithPrediction: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  matchCardPast: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'none',
  },
  matchStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'none',
  },
  matchStatusPast: {
    color: 'rgba(158, 158, 158, 0.8)',
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  versus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  predictionScore: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  actualScore: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  predictionInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  predictionText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  actualResultText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'none',
  },
  pointsText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'none',
  },
  noPointsText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'none',
  },
  noPredictionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  noPredictionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    textDecorationLine: 'none',
  },
  emptySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  modalPlaceholder: {
    width: 36,
  },
  modalMatchInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalTeamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTeam: {
    alignItems: 'center',
    flex: 1,
  },
  modalTeamLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalTeamLogo: {
    fontSize: 20,
    textDecorationLine: 'none',
  },
  modalTeamCrest: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalTeamName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'none',
    maxWidth: 100,
  },
  modalVersus: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 'bold',
    textDecorationLine: 'none',
    marginHorizontal: 20,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scoreInput: {
    alignItems: 'center',
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    marginHorizontal: 24,
    textDecorationLine: 'none',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    textDecorationLine: 'none',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonTextSave: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '700',
    textDecorationLine: 'none',
  },
});
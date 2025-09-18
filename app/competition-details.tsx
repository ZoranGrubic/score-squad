import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { CustomAlert } from '@/components/custom-alert';
import { CustomConfirmation } from '@/components/custom-confirmation';

interface Match {
  id: string;
  external_id: number;
  status: string;
  match_date: number;
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

interface Participant {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    full_name?: string;
    username?: string;
  };
}

interface CompetitionDetails {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  created_by: string;
}

export default function CompetitionDetailsScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { user } = useAuth();
  const { competitionId, competitionName } = useLocalSearchParams<{
    competitionId: string;
    competitionName: string;
  }>();

  const [competition, setCompetition] = useState<CompetitionDetails | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionDetails();
    }
  }, [competitionId]);

  // Refresh data when screen comes into focus (after editing matches)
  useFocusEffect(
    useCallback(() => {
      if (competitionId) {
        fetchCompetitionDetails();
      }
    }, [competitionId])
  );

  const fetchCompetitionDetails = async () => {
    try {
      // Fetch competition info
      const { data: competitionData, error: competitionError } = await supabase
        .from('friendly_competitions')
        .select('id, name, description, status, created_at, created_by')
        .eq('id', competitionId)
        .single();

      if (competitionError) {
        console.error('Error fetching competition:', competitionError);
        setAlertMessage('Unable to load competition details');
        setShowErrorAlert(true);
        return;
      }

      setCompetition(competitionData);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('friendly_competition_matches')
        .select(`
          matches (
            id,
            external_id,
            status,
            match_date,
            home_team:home_team_id(id, name, short_name, crest),
            away_team:away_team_id(id, name, short_name, crest)
          )
        `)
        .eq('competition_id', competitionId);

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
      } else {
        const formattedMatches = matchesData?.map(item => item.matches).filter(Boolean) || [];
        setMatches(formattedMatches);
      }

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('friendly_competition_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          profiles!friendly_competition_participants_user_id_fkey (
            id,
            email,
            full_name,
            username
          )
        `)
        .eq('competition_id', competitionId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
      } else {
        setParticipants(participantsData || []);
      }

    } catch (error) {
      console.error('Error:', error);
      setAlertMessage('An error occurred');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMatches = () => {
    router.push({
      pathname: '/competition-list',
      params: {
        editingCompetition: competitionId
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleDeleteCompetition = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteCompetition = async () => {
    try {
      setLoading(true);

      console.log('Attempting to delete competition:', competitionId);
      console.log('Current user ID:', user?.id);
      console.log('Competition created by:', competition?.created_by);

      const { data, error } = await supabase
        .from('friendly_competitions')
        .delete()
        .eq('id', competitionId);

      console.log('Delete result:', { data, error });

      if (error) {
        console.error('Detailed error deleting competition:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setAlertMessage(`Failed to delete competition: ${error.message}`);
        setShowErrorAlert(true);
        return;
      }

      console.log('Competition deleted successfully');
      setAlertMessage('Competition deleted successfully');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAlertMessage('An unexpected error occurred while deleting the competition');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessAlertClose = () => {
    setShowSuccessAlert(false);
    router.back();
  };

  const isCreator = competition && user && competition.created_by === user.id;

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
            <Text style={styles.title} numberOfLines={1}>{competition?.name}</Text>
            {isCreator ? (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCompetition}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Competition Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Competition Details</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[styles.infoValue, { color: competition?.status === 'active' ? '#4CAF50' : '#9E9E9E' }]}>
                  {competition?.status?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {competition?.created_at ? new Date(competition.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Matches Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Matches ({matches.length})</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddMatches}>
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {matches.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No matches added yet</Text>
                  <TouchableOpacity style={styles.emptyActionButton} onPress={handleAddMatches}>
                    <Text style={styles.emptyActionText}>Add Matches</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                matches.map((match) => (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchDate}>
                        {formatDate(match.match_date)} • {formatTime(match.match_date)}
                      </Text>
                      <Text style={styles.matchStatus}>{match.status}</Text>
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
                  </View>
                ))
              )}
            </View>

            {/* Participants Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
              {participants.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No participants yet</Text>
                </View>
              ) : (
                participants.map((participant) => (
                  <View key={participant.id} style={styles.participantCard}>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.profiles.full_name || participant.profiles.username || participant.profiles.email.split('@')[0]}
                      </Text>
                      <Text style={styles.participantEmail}>{participant.profiles.email}</Text>
                    </View>
                    <View style={[styles.participantStatus, {
                      backgroundColor: participant.status === 'accepted' ? '#4CAF50' :
                                     participant.status === 'declined' ? '#F44336' : '#FF9800'
                    }]}>
                      <Text style={styles.participantStatusText}>{participant.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} />
        </View>
      </LinearGradient>

      {/* Custom Modals */}
      <CustomAlert
        visible={showErrorAlert}
        title="Error"
        message={alertMessage}
        buttons={[{ text: 'OK' }]}
        onClose={() => setShowErrorAlert(false)}
      />

      <CustomAlert
        visible={showSuccessAlert}
        title="Success"
        message={alertMessage}
        buttons={[{ text: 'OK' }]}
        onClose={handleSuccessAlertClose}
      />

      <CustomConfirmation
        visible={showDeleteConfirmation}
        title="Delete Competition"
        message="Are you sure you want to delete this competition? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={confirmDeleteCompetition}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'none',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'none',
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  participantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textDecorationLine: 'none',
  },
  participantEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'none',
  },
  participantStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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
    marginBottom: 16,
    textDecorationLine: 'none',
  },
  emptyActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
});
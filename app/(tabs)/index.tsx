import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
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
  const [pendingInvitations, setPendingInvitations] = useState<ParticipatingCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchParticipatingCompetitions();
  }, [user?.id]);

  // Refresh competitions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchParticipatingCompetitions();
      }
    }, [user?.id])
  );

  const fetchParticipatingCompetitions = async () => {
    if (!user?.id) return;

    try {
      console.log('Fetching participating competitions for user:', user.id);
      console.log('Full user object:', user);

      // Get current auth user to compare
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Auth user:', authUser.user?.id);
      console.log('Auth user email:', authUser.user?.email);

      // First, ensure the user exists in profiles table
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // User doesn't exist in profiles, create them
        console.log('Creating user profile...');
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{
            id: user?.id,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || null
          }]);

        if (profileCreateError) {
          console.error('Error creating user profile:', profileCreateError);
        } else {
          console.log('User profile created successfully');
        }
      }

      // Get competitions where user is a participant - separate invited and accepted
      const { data: acceptedData, error: acceptedError } = await supabase
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
        .eq('status', 'accepted');

      const { data: invitedData, error: invitedError } = await supabase
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
        .eq('status', 'invited');

      console.log('Accepted competitions data:', acceptedData);
      console.log('Invited competitions data:', invitedData);

      const data = acceptedData;
      const error = acceptedError;

      console.log('Participating competitions raw data:', { data, error, userId: user.id, dataCount: data?.length });

      // Also check if there are any participants records at all for this user
      const { data: allParticipants } = await supabase
        .from('friendly_competition_participants')
        .select('*')
        .eq('user_id', user.id);

      console.log('All participant records for this user:', allParticipants);

      // Check if user exists in profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('User profile exists:', userProfile);

      // Check all participants in the system to see if our user is there somewhere
      const { data: allParticipantsInSystem } = await supabase
        .from('friendly_competition_participants')
        .select('*');

      console.log('All participants in system:', allParticipantsInSystem);
      console.log('Looking for user_id:', user.id);

      // Test without RLS - use service role to see raw data
      const { data: directQuery } = await supabase
        .from('friendly_competition_participants')
        .select('*, friendly_competitions(*)')
        .eq('user_id', user.id);

      console.log('Direct query result:', directQuery);

      if (error) {
        console.error('Error fetching participating competitions:', error);
        return;
      }

      // Get match and prediction counts for each competition
      const competitionsWithCounts = await Promise.all(
        (data || []).map(async (participation) => {
          console.log('Processing participation:', participation);
          const competition = participation.friendly_competitions;
          if (!competition) {
            console.log('No competition found for participation:', participation);
            return null;
          }

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

          const result = {
            id: participation.id,
            name: competition.name,
            status: competition.status,
            created_at: competition.created_at,
            matches_count: matchesResult.count || 0,
            my_predictions_count: predictionsResult.count || 0,
            friendly_competitions: competition
          };

          console.log('Processed competition:', result);
          return result;
        })
      );

      console.log('All processed competitions:', competitionsWithCounts);
      const filteredCompetitions = competitionsWithCounts.filter(Boolean) as ParticipatingCompetition[];
      console.log('Filtered competitions:', filteredCompetitions);
      setParticipatingCompetitions(filteredCompetitions);

      // Process invited competitions for pending invitations
      if (invitedData && !invitedError) {
        const invitedCompetitionsWithCounts = await Promise.all(
          invitedData.map(async (participation) => {
            const competition = participation.friendly_competitions;
            if (!competition) return null;

            const [matchesResult] = await Promise.all([
              supabase
                .from('friendly_competition_matches')
                .select('id', { count: 'exact' })
                .eq('competition_id', competition.id)
            ]);

            return {
              id: participation.id,
              name: competition.name,
              status: competition.status,
              created_at: competition.created_at,
              matches_count: matchesResult.count || 0,
              my_predictions_count: 0,
              friendly_competitions: competition
            };
          })
        );

        const filteredInvitations = invitedCompetitionsWithCounts.filter(Boolean) as ParticipatingCompetition[];
        setPendingInvitations(filteredInvitations);
      }
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


  const handleCompetitionPress = (competition: ParticipatingCompetition) => {
    router.push({
      pathname: '/participate-competition',
      params: {
        competitionId: competition.friendly_competitions.id,
        competitionName: competition.name
      }
    });
  };

  const handleAcceptInvitation = async (participation: ParticipatingCompetition) => {
    console.log('Accepting invitation for participation:', participation.id);
    try {
      const { data, error } = await supabase
        .from('friendly_competition_participants')
        .update({ status: 'accepted' })
        .eq('id', participation.id)
        .select();

      console.log('Accept invitation result:', { data, error });

      if (error) {
        console.error('Error accepting invitation:', error);
        Alert.alert('Error', `Failed to accept invitation: ${error.message}`);
        return;
      }

      console.log('Successfully accepted invitation, refreshing data...');
      // Refresh the data
      fetchParticipatingCompetitions();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleDeclineInvitation = async (participation: ParticipatingCompetition) => {
    try {
      const { error } = await supabase
        .from('friendly_competition_participants')
        .update({ status: 'declined' })
        .eq('id', participation.id);

      if (error) {
        console.error('Error declining invitation:', error);
        return;
      }

      // Refresh the data
      fetchParticipatingCompetitions();
    } catch (error) {
      console.error('Error:', error);
    }
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

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Competition Invitations</Text>
                {pendingInvitations.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationCard}>
                    <View style={styles.competitionHeader}>
                      <View style={styles.competitionInfo}>
                        <Text style={styles.competitionName}>{invitation.name}</Text>
                        <Text style={styles.competitionDate}>
                          Invited: {formatDate(invitation.created_at)}
                        </Text>
                        <Text style={styles.competitionDate}>
                          {invitation.matches_count} matches to predict
                        </Text>
                      </View>
                      <View style={styles.invitationBadge}>
                        <Text style={styles.invitationText}>INVITED</Text>
                      </View>
                    </View>

                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptInvitation(invitation)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => handleDeclineInvitation(invitation)}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

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
  invitationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  invitationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  invitationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    textDecorationLine: 'none',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textDecorationLine: 'none',
  },
});

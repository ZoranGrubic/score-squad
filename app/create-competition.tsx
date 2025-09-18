import { useAuth } from '@/contexts/auth-context';
import { useCompetition } from '@/contexts/competition-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function CreateCompetitionScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { user } = useAuth();
  const {
    competitionName,
    setCompetitionName,
    selectedMatches,
    selectedFriends,
    clearAll
  } = useCompetition();
  const [loading, setLoading] = useState(false);
  const [competitionCreated, setCompetitionCreated] = useState(false);

  // Clear context only when completely leaving create flow without creating
  useFocusEffect(
    useCallback(() => {
      return () => {
        // This runs when screen loses focus (user navigates away)
        // Don't clear context when navigating to select screens within create flow
        // Only clear when abandoning the entire create process
        console.log('CREATE SCREEN losing focus - NOT clearing context to preserve selections');
      };
    }, [competitionCreated, clearAll])
  );


  const handleSelectMatches = () => {
    router.push('/competition-list');
  };

  const handleSelectFriends = () => {
    router.push('/select-friends');
  };

  const handleCreateCompetition = async () => {
    console.log('Creating competition with:');
    console.log('- Competition name:', competitionName);
    console.log('- Selected matches:', selectedMatches.length);
    console.log('- Selected friends:', selectedFriends.length);
    console.log('- Selected friends data:', selectedFriends);

    if (!competitionName.trim()) {
      Alert.alert('Error', 'Please enter a competition name');
      return;
    }
    if (selectedMatches.length === 0) {
      Alert.alert('Error', 'Please select at least one match');
      return;
    }
    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    setLoading(true);
    try {
      // First, ensure the user exists in profiles table
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // User doesn't exist in profiles, create them
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{
            id: user?.id,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || null
          }]);

        if (profileCreateError) {
          console.error('Error creating user profile:', profileCreateError);
          Alert.alert('Error', 'Failed to create user profile');
          return;
        }
      }

      // Create the friendly competition
      const { data: competition, error: competitionError } = await supabase
        .from('friendly_competitions')
        .insert([
          {
            name: competitionName.trim(),
            created_by: user?.id
          }
        ])
        .select()
        .single();

      if (competitionError) {
        console.error('Error creating competition:', competitionError);
        Alert.alert('Error', 'Failed to create competition');
        return;
      }

      // Debug: Log competition and auth details
      console.log('=== DEBUG COMPETITION CREATION ===');
      console.log('Created competition:', competition);
      console.log('Competition created_by:', competition.created_by);
      console.log('Current user?.id:', user?.id);

      // Get current auth user ID for comparison
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Current auth.uid():', authUser?.user?.id);
      console.log('Auth user matches competition creator:', authUser?.user?.id === competition.created_by);
      console.log('==========================');

      // Add selected matches to the competition
      const matchInserts = selectedMatches.map(match => ({
        competition_id: competition.id,
        match_id: match.id
      }));

      const { error: matchesError } = await supabase
        .from('friendly_competition_matches')
        .insert(matchInserts);

      if (matchesError) {
        console.error('Error adding matches:', matchesError);
        Alert.alert('Error', 'Failed to add matches to competition');
        return;
      }

      // Ensure all selected friends exist in profiles table
      for (const friend of selectedFriends) {
        const { data: existingFriendProfile, error: friendCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', friend.id)
          .single();

        // If friend doesn't have a profile, they might be from an old auth.users record
        // We'll still add them as participants - their profile will be created when they log in
        if (friendCheckError && friendCheckError.code === 'PGRST116') {
          console.log(`Friend ${friend.email} doesn't have a profile yet, but adding as participant`);
        }
      }

      // Add selected friends as participants
      console.log('About to create participant inserts for friends:', selectedFriends);

      // Detailed logging of each friend
      selectedFriends.forEach((friend, index) => {
        console.log(`Friend ${index + 1}:`, {
          id: friend.id,
          email: friend.email,
          full_name: friend.full_name
        });
      });

      // First, verify the competition exists and we have proper access
      console.log('Verifying competition exists and checking creator access...');
      const { data: verifyCompetition, error: verifyError } = await supabase
        .from('friendly_competitionss')
        .select('id, created_by')
        .eq('i d', competition.id)
        .eq('created_by', user?.id)
        .single();

      console.log('Competition verification:', { verifyCompetition, verifyError });

      if (verifyError || !verifyCompetition) {
        console.error('Competition verification failed:', verifyError);
        Alert.alert('Error', 'Competition verification failed. Cannot add participants.');
        return;
      }

      // Add participants one by one for better error handling
      const allParticipants = [
        // Add the creator first (auto-accepted)
        {
          competition_id: competition.id,
          user_id: user?.id,
          invited_by: user?.id,
          status: 'accepted'
        },
        // Add selected friends
        ...selectedFriends.map(friend => ({
          competition_id: competition.id,
          user_id: friend.id,
          invited_by: user?.id,
          status: 'invited'
        }))
      ];

      // First, let's check if all participants exist in profiles table
      console.log('Checking if all participants exist in profiles table...');
      for (const participant of allParticipants) {
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', participant.user_id)
          .single();

        console.log(`Profile check for ${participant.user_id}:`, { profileCheck, profileError });
      }

      console.log('Adding participants one by one...', allParticipants);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < allParticipants.length; i++) {
        const participant = allParticipants[i];
        console.log(`Adding participant ${i + 1}/${allParticipants.length}:`, participant);

        const { data: insertedParticipant, error: participantError } = await supabase
          .from('friendly_competition_participants')
          .insert([participant])
          .select();

        if (participantError) {
          errorCount++;
          const errorMsg = `Participant ${participant.user_id}: ${participantError.message}`;
          errors.push(errorMsg);
          console.error(`ERROR adding participant ${i + 1}:`, {
            participant,
            error: participantError,
            code: participantError.code,
            details: participantError.details,
            hint: participantError.hint
          });
        } else {
          successCount++;
          console.log(`SUCCESS adding participant ${i + 1}:`, insertedParticipant);
        }
      }

      console.log(`FINAL RESULTS: ${successCount} successful, ${errorCount} failed out of ${allParticipants.length} total`);
      if (errors.length > 0) {
        console.log('Detailed errors:', errors);
      }

      console.log(`Successfully added ${successCount}/${allParticipants.length} participants`);

      if (successCount === 0) {
        Alert.alert('Error', 'Failed to add any participants to the competition');
        return;
      }

      if (errorCount > 0) {
        console.error('Not all participants were added successfully');
        const failedList = errors.join('\n');
        setCompetitionCreated(true); // Mark as created so context won't be cleared
        Alert.alert(
          'Partial Success',
          `Competition created successfully!\n\n${successCount} participants added, ${errorCount} failed.\n\nFailed:\n${failedList}`,
          [
            {
              text: 'OK',
              onPress: () => {
                clearAll();
                router.push('/(tabs)');
              }
            }
          ]
        );
      } else {
        // Full success!
        setCompetitionCreated(true); // Mark as created so context won't be cleared
        Alert.alert(
          'Success!',
          `Competition "${competitionName}" created successfully with ${selectedMatches.length} matches and ${successCount} participants!`,
          [
            {
              text: 'OK',
              onPress: () => {
                clearAll();
                router.push('/(tabs)');
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('Error creating competition:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Clear context when leaving create flow without creating
    console.log('CREATE SCREEN - Going back, clearing context');
    clearAll();
    router.back();
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
            <Text style={styles.title}>Create Competition</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Competition Name Input */}
          <View style={styles.titleInputContainer}>
            <Text style={styles.inputLabel}>Competition Name:</Text>
            <TextInput
              style={styles.titleInput}
              value={competitionName}
              onChangeText={setCompetitionName}
              placeholder="Enter your competition name..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>


          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSelectMatches}>
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>⚽</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.actionButtonTitle}>Choose Matches</Text>
                <Text style={styles.actionButtonDescription}>
                  {selectedMatches.length > 0 ? `${selectedMatches.length} selected matches` : 'Select matches for betting'}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSelectFriends}>
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>👥</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.actionButtonTitle}>Choose Friends</Text>
                <Text style={styles.actionButtonDescription}>
                  {selectedFriends.length > 0 ? `${selectedFriends.length} selected friends` : 'Invite friends to competition'}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!competitionName.trim() || selectedMatches.length === 0 || selectedFriends.length === 0 || loading) && styles.disabledButton
            ]}
            onPress={handleCreateCompetition}
            disabled={!competitionName.trim() || selectedMatches.length === 0 || selectedFriends.length === 0 || loading}
          >
            <Text style={[
              styles.createButtonText,
              (!competitionName.trim() || selectedMatches.length === 0 || selectedFriends.length === 0 || loading) && styles.disabledButtonText
            ]}>
              {loading ? 'Creating...' : 'Create Competition'}
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
    marginBottom: 30,
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
  titleInputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  titleInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtons: {
    flex: 1,
    gap: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  buttonIconText: {
    fontSize: 24,
    textDecorationLine: 'none',
  },
  buttonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textDecorationLine: 'none',
  },
  actionButtonDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  arrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textDecorationLine: 'none',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
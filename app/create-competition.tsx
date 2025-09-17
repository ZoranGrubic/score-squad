import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { useState } from 'react';
import { useCompetition } from '@/contexts/competition-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

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


  const handleSelectMatches = () => {
    router.push('/competition-list');
  };

  const handleSelectFriends = () => {
    router.push('/select-friends');
  };

  const handleCreateCompetition = async () => {
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

      // Add selected friends as participants
      const participantInserts = selectedFriends.map(friend => ({
        competition_id: competition.id,
        user_id: friend.id,
        invited_by: user?.id,
        status: 'invited'
      }));

      const { error: participantsError } = await supabase
        .from('friendly_competition_participants')
        .insert(participantInserts);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        Alert.alert('Error', 'Failed to add participants to competition');
        return;
      }

      // Success!
      Alert.alert(
        'Success!',
        `Competition "${competitionName}" created with ${selectedMatches.length} matches and ${selectedFriends.length} friends!`,
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

    } catch (error) {
      console.error('Error creating competition:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
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
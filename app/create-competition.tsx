import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { useState } from 'react';

export default function CreateCompetitionScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const [selectedMatchesCount, setSelectedMatchesCount] = useState(0);
  const [selectedFriendsCount, setSelectedFriendsCount] = useState(0);

  const handleSelectMatches = () => {
    router.push('/competition-list');
  };

  const handleSelectFriends = () => {
    router.push('/select-friends');
  };

  const handleCreateCompetition = () => {
    if (selectedMatchesCount === 0) {
      alert('Please select at least one match');
      return;
    }
    if (selectedFriendsCount === 0) {
      alert('Please select at least one friend');
      return;
    }

    alert(`Competition created with ${selectedMatchesCount} matches and ${selectedFriendsCount} friends!`);
    router.push('/(tabs)');
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


          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSelectMatches}>
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>⚽</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.actionButtonTitle}>Choose Matches</Text>
                <Text style={styles.actionButtonDescription}>
                  {selectedMatchesCount > 0 ? `${selectedMatchesCount} selected matches` : 'Select matches for betting'}
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
                  {selectedFriendsCount > 0 ? `${selectedFriendsCount} selected friends` : 'Invite friends to competition'}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (selectedMatchesCount === 0 || selectedFriendsCount === 0) && styles.disabledButton
            ]}
            onPress={handleCreateCompetition}
            disabled={selectedMatchesCount === 0 || selectedFriendsCount === 0}
          >
            <Text style={[
              styles.createButtonText,
              (selectedMatchesCount === 0 || selectedFriendsCount === 0) && styles.disabledButtonText
            ]}>
              Create Competition
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
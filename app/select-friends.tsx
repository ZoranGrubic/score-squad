import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useCompetition } from '@/contexts/competition-context';

interface Friend {
  id: string;
  full_name?: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

interface Competition {
  id: string;
  name: string;
}

export default function SelectFriendsScreen() {
  const insets = useSafeAreaInsets();
  const gradientColors = useThemeColor({}, 'gradientColors') as readonly [string, string, string];
  const { user } = useAuth();
  const {
    selectedMatches,
    selectedFriends,
    setSelectedFriends,
    selectedCompetitions
  } = useCompetition();

  const [searchText, setSearchText] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  useEffect(() => {
    // Set current selected friends from context
    setSelectedFriendIds(selectedFriends.map(f => f.id));

    fetchFriends();
  }, [selectedFriends, user?.id]);

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id) // Exclude current user
        .order('full_name');

      if (error) {
        console.error('Error fetching friends:', error);
        Alert.alert('Error', 'Unable to load friends');
        return;
      }

      setFriends(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    (friend.full_name?.toLowerCase().includes(searchText.toLowerCase()) || false) ||
    friend.email.toLowerCase().includes(searchText.toLowerCase()) ||
    (friend.username?.toLowerCase().includes(searchText.toLowerCase()) || false)
  );

  const handleFriendToggle = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    const isSelected = selectedFriendIds.includes(friendId);

    if (isSelected) {
      // Remove from selection
      setSelectedFriendIds(prev => prev.filter(id => id !== friendId));
      setSelectedFriends(selectedFriends.filter(f => f.id !== friendId));
    } else {
      // Add to selection
      setSelectedFriendIds(prev => [...prev, friendId]);
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const handleNext = () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    // Navigate back to create competition screen
    router.back();
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
            <Text style={styles.title}>Invite Friends</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Summary */}
          {selectedMatches.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Selected {selectedMatches.length} matches for betting
              </Text>
            </View>
          )}

          {/* Search Input */}
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search friends..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
          />

          {/* Selected Count */}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Selected: {selectedFriendIds.length} {selectedFriendIds.length === 1 ? 'friend' : 'friends'}
            </Text>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.noFriendsContainer}>
              <Text style={styles.noFriendsText}>
                {searchText ? 'No friends match your search' : 'No registered users found'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
              {filteredFriends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    selectedFriendIds.includes(friend.id) && styles.selectedFriend
                  ]}
                  onPress={() => handleFriendToggle(friend.id)}
                >
                  <View style={styles.friendInfo}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.friendAvatar}>👤</Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{friend.full_name || friend.username || friend.email.split('@')[0]}</Text>
                      <Text style={styles.friendEmail}>{friend.email}</Text>
                    </View>
                  </View>
                  {selectedFriendIds.includes(friend.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              selectedFriendIds.length === 0 && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={selectedFriendIds.length === 0}
          >
            <Text style={[
              styles.createButtonText,
              selectedFriendIds.length === 0 && styles.disabledButtonText
            ]}>
              Done ({selectedFriendIds.length})
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
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  friendsList: {
    flex: 1,
    marginBottom: 20,
  },
  friendItem: {
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
  selectedFriend: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  friendAvatar: {
    fontSize: 24,
    textDecorationLine: 'none',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textDecorationLine: 'none',
  },
  friendEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'none',
  },
  checkmark: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textDecorationLine: 'none',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
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
  noFriendsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  noFriendsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    textDecorationLine: 'none',
  },
});
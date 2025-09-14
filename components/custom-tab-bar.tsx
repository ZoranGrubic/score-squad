import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string, focused: boolean) => {
    const color = focused ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
    switch (routeName) {
      case 'index':
        return <IconSymbol size={26} name="house.fill" color={color} />;
      case 'profile':
        return <IconSymbol size={26} name="person" color={color} />;
      default:
        return null;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Home';
      case 'profile':
        return 'Profile';
      default:
        return routeName;
    }
  };

  return (
    <View style={[
      styles.container,
      Platform.OS === 'android' ? styles.androidContainer : styles.iosContainer,
      {
        paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 15, 25) : Math.max(insets.bottom, 10),
        height: Platform.OS === 'android' ? Math.max(insets.bottom + 85, 95) : Math.max(insets.bottom + 60, 70)
      }
    ]}>
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.8}
            >
              {getIcon(route.name, isFocused)}
              <Text style={[
                styles.label,
                { color: isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.8)' }
              ]}>
                {getLabel(route.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 15,
  },
  androidContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    minHeight: 120,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: 30,
    marginBottom: -30,
  },
  iosContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    minHeight: 70,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 45,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
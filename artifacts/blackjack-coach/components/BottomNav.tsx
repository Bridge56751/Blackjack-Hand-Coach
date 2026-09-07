import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  
  const tabs = [
    { name: 'Home', path: '/', icon: 'cards-spade', testID: 'nav-home' },
    { name: 'Table History', path: '/history', icon: 'cards-diamond', testID: 'nav-history' },
    { name: 'Dealer Settings', path: '/settings', icon: 'cards-club', testID: 'nav-settings' },
  ];

  return (
    <View style={[styles.container, { 
      paddingBottom: Math.max(insets.bottom, webBottomInset),
    }]}>
      {tabs.map(tab => {
        // Simple active check. In Expo Router, root is '/'
        const isActive = pathname === tab.path || (tab.path === '/' && pathname === '/index');
        
        return (
          <TouchableOpacity
            key={tab.name}
            testID={tab.testID}
            activeOpacity={0.7}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => {
              if (!isActive) {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                router.replace(tab.path as any);
              }
            }}
          >
            <View style={[styles.suitMedallion, isActive && styles.activeSuitMedallion]}>
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={isActive ? 21 : 19}
                color={isActive ? '#E6C65C' : 'rgba(255,255,255,0.48)'}
              />
            </View>
            <Text style={[styles.label, { color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.4)' }]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#07110C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.24)',
    paddingTop: 8,
    paddingHorizontal: 10,
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 56,
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  suitMedallion: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  activeSuitMedallion: {
    borderColor: 'rgba(212,175,55,0.58)',
    backgroundColor: 'rgba(212,175,55,0.13)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.35,
  }
});

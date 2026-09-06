import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  
  const tabs = [
    { name: 'Home', path: '/', icon: 'home', testID: 'nav-home' },
    { name: 'Table History', path: '/history', icon: 'clock', testID: 'nav-history' },
    { name: 'Settings', path: '/settings', icon: 'settings', testID: 'nav-settings' },
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
            style={styles.tab}
            onPress={() => {
              if (!isActive) {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                router.replace(tab.path as any);
              }
            }}
          >
            <Feather 
              name={tab.icon as any} 
              size={22} 
              color={isActive ? '#D4AF37' : 'rgba(255,255,255,0.4)'} 
            />
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
    backgroundColor: '#08100B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
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
    gap: 5,
    height: 50,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  }
});

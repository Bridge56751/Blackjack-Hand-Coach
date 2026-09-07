import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { Card, isRed } from '../lib/game';

export function CardView({ card, hidden, index }: { card?: Card; hidden?: boolean; index: number }) {
  const cardW = 76;
  const cardH = 110;
  const margin = index ? -52 : 0;

  const containerStyle = [
    styles.cardContainer,
    { width: cardW, height: cardH, marginLeft: margin }
  ];

  if (hidden) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={containerStyle}>
        <View style={[styles.card, { padding: 4, borderColor: '#fff' }]}>
          <LinearGradient colors={['#b4211e', '#7a1918']} style={styles.hiddenInner}>
             <View style={styles.hiddenInnerBorder}>
               <View style={styles.hiddenCenterCircle}>
                 <FontAwesome5 name="crown" size={20} color="rgba(255,255,255,0.4)" />
               </View>
             </View>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  }

  if (!card) return null;
  const red = isRed(card);
  const color = red ? '#D92534' : '#11181C';
  const rank = card.rank === 'T' ? '10' : card.rank;

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={containerStyle}>
      <View style={styles.card}>
        <View style={styles.topLeft}>
          <Text style={[styles.indexRank, { color }]}>{rank}</Text>
          <Text style={[styles.indexSuit, { color }]}>{card.suit}</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.centerSuit, { color }]}>{card.suit}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    overflow: 'hidden'
  },
  hiddenInner: {
    flex: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInnerBorder: {
    width: '85%',
    height: '90%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenCenterCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: {
    position: 'absolute',
    top: 4,
    left: 4,
    alignItems: 'center',
    width: 24,
    zIndex: 2,
  },
  indexRank: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -1,
  },
  indexSuit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 16,
  },
  center: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerSuit: {
    fontSize: 44,
    opacity: 0.9,
  }
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, isRed } from '../lib/game';

export function CardView({ card, hidden, index }: { card?: Card; hidden?: boolean; index: number }) {
  if (hidden) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={[styles.card, styles.hiddenCard, { marginLeft: index ? -34 : 0 }]}>
        <View style={styles.hiddenInner}>
           <View style={styles.hiddenPattern} />
        </View>
      </Animated.View>
    );
  }
  
  if (!card) return null;
  const red = isRed(card);
  const color = red ? '#E63946' : '#11181C';
  const rank = card.rank === 'T' ? '10' : card.rank;
  
  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={[styles.card, { marginLeft: index ? -34 : 0 }]}>
      <View style={styles.topLeft}>
        <Text style={[styles.indexRank, { color }]}>{rank}</Text>
        <Text style={[styles.indexSuit, { color }]}>{card.suit}</Text>
      </View>
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { color }]}>{card.suit}</Text>
      </View>
      <View style={styles.bottomRight}>
        <Text style={[styles.indexRank, { color, transform: [{ rotate: '180deg' }] }]}>{rank}</Text>
        <Text style={[styles.indexSuit, { color, transform: [{ rotate: '180deg' }] }]}>{card.suit}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 66,
    height: 96,
    borderRadius: 6,
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#E0DCD3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    padding: 4,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  hiddenCard: {
    padding: 4,
  },
  hiddenInner: {
    flex: 1,
    backgroundColor: '#0A2E1C',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenPattern: {
    width: 34,
    height: 54,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderRadius: 4,
    borderStyle: 'dashed'
  },
  topLeft: {
    alignItems: 'center',
    width: 16,
  },
  bottomRight: {
    alignItems: 'center',
    width: 16,
    alignSelf: 'flex-end',
  },
  indexRank: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 15,
    letterSpacing: -1,
  },
  indexSuit: {
    fontSize: 12,
    lineHeight: 13,
  },
  center: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  centerSuit: {
    fontSize: 38,
    opacity: 0.9,
  }
});
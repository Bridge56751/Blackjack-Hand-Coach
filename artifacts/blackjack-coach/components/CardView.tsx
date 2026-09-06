import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, isRed } from '../lib/game';

export function CardView({ card, hidden, index, isShort }: { card?: Card; hidden?: boolean; index: number; isShort?: boolean }) {
  const cardW = isShort ? 68 : 76;
  const cardH = isShort ? 98 : 110;
  const margin = index ? (isShort ? -34 : -38) : 0;
  const patternW = isShort ? 34 : 38;
  const patternH = isShort ? 50 : 60;
  const rankSize = isShort ? 16 : 18;
  const suitSize = isShort ? 12 : 14;
  const centerSize = isShort ? 36 : 42;

  if (hidden) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={[styles.card, styles.hiddenCard, { width: cardW, height: cardH, marginLeft: margin }]}>
        <View style={styles.hiddenInner}>
           <View style={[styles.hiddenPattern, { width: patternW, height: patternH }]} />
        </View>
      </Animated.View>
    );
  }

  if (!card) return null;
  const red = isRed(card);
  const color = red ? '#E63946' : '#11181C';
  const rank = card.rank === 'T' ? '10' : card.rank;

  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={[styles.card, { width: cardW, height: cardH, marginLeft: margin }]}>
      <View style={styles.topLeft}>
        <Text style={[styles.indexRank, { color, fontSize: rankSize, lineHeight: rankSize }]}>{rank}</Text>
        <Text style={[styles.indexSuit, { color, fontSize: suitSize, lineHeight: suitSize + 1 }]}>{card.suit}</Text>
      </View>
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { color, fontSize: centerSize }]}>{card.suit}</Text>
      </View>
      <View style={styles.bottomRight}>
        <Text style={[styles.indexRank, { color, fontSize: rankSize, lineHeight: rankSize, transform: [{ rotate: '180deg' }] }]}>{rank}</Text>
        <Text style={[styles.indexSuit, { color, fontSize: suitSize, lineHeight: suitSize + 1, transform: [{ rotate: '180deg' }] }]}>{card.suit}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    padding: 6,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  hiddenCard: {
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  hiddenInner: {
    flex: 1,
    backgroundColor: '#0F52BA',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenPattern: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
    borderStyle: 'dashed'
  },
  topLeft: {
    alignItems: 'center',
    width: 18,
  },
  bottomRight: {
    alignItems: 'center',
    width: 18,
    alignSelf: 'flex-end',
  },
  indexRank: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  indexSuit: {
  },
  center: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  centerSuit: {
    opacity: 0.9,
  }
});

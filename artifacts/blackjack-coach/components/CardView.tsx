import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, isRed } from '../lib/game';

export function CardView({ card, hidden, index, isShort, isDealer }: { card?: Card; hidden?: boolean; index: number; isShort?: boolean; isDealer?: boolean }) {
  const cardW = isShort ? 60 : (isDealer ? 70 : 80);
  const cardH = isShort ? 88 : (isDealer ? 100 : 115);
  const margin = index ? (isShort ? -28 : (isDealer ? -35 : -40)) : 0;

  const patternW = cardW * 0.5;
  const patternH = cardH * 0.6;
  const rankSize = isShort ? 15 : (isDealer ? 16 : 18);
  const suitSize = isShort ? 12 : (isDealer ? 12 : 14);
  const centerSize = isShort ? 32 : (isDealer ? 38 : 46);

  const rotateZ = index === 0 ? '-3deg' : index === 1 ? '1deg' : index === 2 ? '4deg' : '7deg';

  const containerStyle = [
    styles.cardContainer,
    { width: cardW, height: cardH, marginLeft: margin, transform: [{ rotateZ }] }
  ];

  if (hidden) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 90).duration(220)} style={containerStyle}>
        <View style={[styles.card, styles.hiddenCard]}>
          <LinearGradient colors={['#0A3078', '#05183D']} style={styles.hiddenInner}>
             <View style={[styles.hiddenPattern, { width: patternW, height: patternH }]} />
             <View style={[styles.hiddenPattern, { width: patternW - 10, height: patternH - 10, position: 'absolute' }]} />
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
        <LinearGradient colors={['#FFFFFF', '#F0F0F0']} style={[StyleSheet.absoluteFill, { borderRadius: 6 }]} />

        <View style={styles.topLeft}>
          <Text style={[styles.indexRank, { color, fontSize: rankSize, lineHeight: rankSize + 2 }]}>{rank}</Text>
          <Text style={[styles.indexSuit, { color, fontSize: suitSize, lineHeight: suitSize + 2 }]}>{card.suit}</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.centerSuit, { color, fontSize: centerSize }]}>{card.suit}</Text>
        </View>
        <View style={styles.bottomRight}>
          <Text style={[styles.indexRank, { color, fontSize: rankSize, lineHeight: rankSize + 2, transform: [{ rotate: '180deg' }] }]}>{rank}</Text>
          <Text style={[styles.indexSuit, { color, fontSize: suitSize, lineHeight: suitSize + 2, transform: [{ rotate: '180deg' }] }]}>{card.suit}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  hiddenCard: {
    padding: 4,
    borderColor: '#FFF',
  },
  hiddenInner: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenPattern: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    borderStyle: 'dashed'
  },
  topLeft: {
    alignItems: 'center',
    width: 20,
    zIndex: 2,
  },
  bottomRight: {
    alignItems: 'center',
    width: 20,
    alignSelf: 'flex-end',
    zIndex: 2,
  },
  indexRank: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  indexSuit: {
    fontFamily: 'Inter_400Regular',
  },
  center: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerSuit: {
    opacity: 0.85,
  }
});

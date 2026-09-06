import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

const CHIP_COLORS = {
  5: '#E63946', // Red
  25: '#28A745', // Green
  100: '#212529', // Black
  250: '#1C39BB', // Royal Blue
  500: '#6C5B7B', // Purple
};

export function Chip({ amount, size = 52, style, disabled }: { amount: number, size?: number, style?: ViewStyle, disabled?: boolean }) {
  const color = CHIP_COLORS[amount as keyof typeof CHIP_COLORS] || '#F4A261';
  
  return (
    <View style={[
      styles.chipOuter, 
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      disabled && { opacity: 0.35 },
      style
    ]}>
      {/* Simplified crisp edge pattern for mobile readability */}
      <View style={[styles.chipDashed, { width: size * 0.88, height: size * 0.88, borderRadius: size * 0.44, borderWidth: Math.max(2, size * 0.08) }]} />
      <View style={[styles.chipInner, { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 }]}>
        <Text style={[styles.chipText, { fontSize: size * 0.24, color }]}>
          {amount >= 1000 ? `${amount/1000}k` : amount}
        </Text>
      </View>
    </View>
  );
}

export function ChipStack({ amount, size = 48 }: { amount: number, size?: number }) {
  let chipToUse = 5;
  if (amount >= 500) chipToUse = 500;
  else if (amount >= 250) chipToUse = 250;
  else if (amount >= 100) chipToUse = 100;
  else if (amount >= 25) chipToUse = 25;
  
  const count = Math.min(Math.max(Math.floor(amount / chipToUse), 1), 5);
  const stack = Array.from({ length: count });
  
  return (
    <View style={{ width: size, height: size + (count - 1) * 5 }}>
      {stack.map((_, i) => (
        <View key={i} style={{ position: 'absolute', bottom: i * 5, width: '100%', alignItems: 'center' }}>
          <Chip amount={chipToUse} size={size} style={{ shadowOpacity: 0, elevation: 0 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  chipDashed: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  chipInner: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipText: {
    fontFamily: 'Inter_700Bold',
  }
});

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

const CHIP_COLORS = {
  5: '#E63946',
  25: '#2A9D8F',
  100: '#212529',
  500: '#6C5B7B',
};

export function Chip({ amount, size = 54, style, disabled }: { amount: number, size?: number, style?: ViewStyle, disabled?: boolean }) {
  const color = CHIP_COLORS[amount as keyof typeof CHIP_COLORS] || '#D4AF37';
  
  return (
    <View style={[
      styles.chipOuter, 
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      disabled && { opacity: 0.4 },
      style
    ]}>
      <View style={[styles.chipDashed, { width: size * 0.85, height: size * 0.85, borderRadius: size * 0.425, borderWidth: size * 0.12 }]} />
      <View style={[styles.chipInner, { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275 }]}>
        <Text style={[styles.chipText, { fontSize: size * 0.22, color }]}>
          {amount >= 1000 ? `${amount/1000}k` : amount}
        </Text>
      </View>
    </View>
  );
}

export function ChipStack({ amount, size = 44 }: { amount: number, size?: number }) {
  let chipToUse = 5;
  if (amount >= 500) chipToUse = 500;
  else if (amount >= 100) chipToUse = 100;
  else if (amount >= 25) chipToUse = 25;
  
  const count = Math.min(Math.max(Math.floor(amount / chipToUse), 1), 4);
  const stack = Array.from({ length: count });
  
  return (
    <View style={{ width: size, height: size + (count - 1) * 4 }}>
      {stack.map((_, i) => (
        <View key={i} style={{ position: 'absolute', bottom: i * 4, width: '100%', alignItems: 'center' }}>
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  chipDashed: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: 'rgba(253, 251, 247, 0.7)',
  },
  chipInner: {
    backgroundColor: '#FDFBF7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
  },
  chipText: {
    fontFamily: 'Inter_700Bold',
  }
});
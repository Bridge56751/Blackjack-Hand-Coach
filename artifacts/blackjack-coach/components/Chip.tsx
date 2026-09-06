import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

const CHIP_COLORS = {
  5: { face: '#b7353c', edge: '#5d1720', strip: '#f3d49a' },
  25: { face: '#286f68', edge: '#123e3b', strip: '#f5ddb0' },
  100: { face: '#25262c', edge: '#090a0c', strip: '#c3a25e' },
  250: { face: '#344f91', edge: '#18254b', strip: '#f5ddb0' },
  500: { face: '#b2782e', edge: '#654017', strip: '#f6df9d' },
};

export function Chip({ amount, size = 52, style, disabled }: { amount: number, size?: number, style?: ViewStyle, disabled?: boolean }) {
  const colors = CHIP_COLORS[amount as keyof typeof CHIP_COLORS] || CHIP_COLORS[5];
  const thickness = Math.max(3, size * 0.12);

  return (
    <View style={[{ width: size, height: size + thickness, alignItems: 'center', justifyContent: 'flex-end' }, disabled && { opacity: 0.4 }, style]}>
      <View style={{ backgroundColor: colors.edge, width: size, height: size, borderRadius: size / 2, position: 'absolute', bottom: 0 }} />
      <View style={{ position: 'absolute', bottom: thickness / 2, width: size * 0.82, height: thickness, flexDirection: 'row', justifyContent: 'space-between', opacity: 0.9 }}>
         <View style={{ width: size * 0.1, height: thickness, backgroundColor: colors.strip, transform: [{ skewX: '-15deg' }] }} />
         <View style={{ width: size * 0.1, height: thickness, backgroundColor: colors.strip }} />
         <View style={{ width: size * 0.1, height: thickness, backgroundColor: colors.strip, transform: [{ skewX: '15deg' }] }} />
      </View>

      <View style={[styles.chipFaceOuter, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.face, position: 'absolute', bottom: thickness }]}>
        <View style={[styles.chipDashed, { borderColor: colors.strip, width: size * 0.88, height: size * 0.88, borderRadius: size * 0.44, borderWidth: Math.max(1, size * 0.06) }]} />
        <View style={[styles.chipInner, { width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28 }]}>
          <Text style={[styles.chipText, { fontSize: size * 0.22, color: colors.face }]}>
             {amount >= 1000 ? `${amount / 1000}k` : amount}
          </Text>
        </View>
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
  const thickness = Math.max(3, size * 0.12);
  const step = thickness + 1;

  return (
    <View style={{ width: size, height: size + (count - 1) * step + thickness }}>
      {stack.map((_, i) => (
        <View key={i} style={{ position: 'absolute', bottom: i * step, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 1, elevation: i }}>
          <Chip amount={chipToUse} size={size} style={{ shadowOpacity: 0, elevation: 0 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipFaceOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(38,21,8,0.72)',
  },
  chipDashed: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  chipInner: {
    backgroundColor: '#f5e6c7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
  },
  chipText: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.4,
  }
});

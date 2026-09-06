import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

const CHIP_COLORS = {
  5: { face: '#E63946', edge: '#A11E28', strip: '#FFFFFF' },
  25: { face: '#28A745', edge: '#166E2B', strip: '#FFFFFF' },
  100: { face: '#212529', edge: '#0A0A0C', strip: '#F4D03F' },
  250: { face: '#1C39BB', edge: '#102272', strip: '#FFFFFF' },
  500: { face: '#6C5B7B', edge: '#463952', strip: '#F4D03F' },
};

export function Chip({ amount, size = 52, style, disabled }: { amount: number, size?: number, style?: ViewStyle, disabled?: boolean }) {
  const colors = CHIP_COLORS[amount as keyof typeof CHIP_COLORS] || CHIP_COLORS[5];
  const thickness = Math.max(3, size * 0.12);

  return (
    <View style={[{ width: size, height: size + thickness, alignItems: 'center', justifyContent: 'flex-end' }, disabled && { opacity: 0.4 }, style]}>
      {/* 3D Edge */}
      <View style={[styles.chipEdge, { backgroundColor: colors.edge, width: size, height: size, borderRadius: size / 2, position: 'absolute', bottom: 0 }]} />

      {/* Edge Stripes (Fake 3D texture) */}
      <View style={{ position: 'absolute', bottom: thickness/2, width: size * 0.8, height: thickness, flexDirection: 'row', justifyContent: 'space-between', opacity: 0.8 }}>
         <View style={{ width: 4, height: thickness, backgroundColor: colors.strip, transform: [{ skewX: '-15deg' }] }} />
         <View style={{ width: 4, height: thickness, backgroundColor: colors.strip }} />
         <View style={{ width: 4, height: thickness, backgroundColor: colors.strip, transform: [{ skewX: '15deg' }] }} />
      </View>

      {/* Face */}
      <View style={[styles.chipFaceOuter, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.face, position: 'absolute', bottom: thickness }]}>
        <View style={[styles.chipDashed, { borderColor: colors.strip, width: size * 0.88, height: size * 0.88, borderRadius: size * 0.44, borderWidth: Math.max(2, size * 0.08) }]} />
        <View style={[styles.chipInner, { width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28 }]}>
          <Text style={[styles.chipText, { fontSize: size * 0.22, color: colors.face }]}>
            {amount >= 1000 ? `${amount/1000}k` : amount}
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
  
  const count = Math.min(Math.max(Math.floor(amount / chipToUse), 1), 8);
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
  chipEdge: {
  },
  chipFaceOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  chipDashed: {
    position: 'absolute',
    borderStyle: 'dashed',
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
    borderColor: 'rgba(0,0,0,0.15)',
  },
  chipText: {
    fontFamily: 'Inter_700Bold',
  }
});

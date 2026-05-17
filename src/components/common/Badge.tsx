import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, color = colors.primary, bgColor, size = 'md', style }: BadgeProps) {
  const bg = bgColor || `${color}22`;
  return (
    <View style={[styles.base, styles[size], { backgroundColor: bg }, style]}>
      <Text style={[styles.text, styles[`text_${size}`], { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontWeight: '600', letterSpacing: 0.3 },
  text_sm: { fontSize: 10 },
  text_md: { fontSize: 12 },
});

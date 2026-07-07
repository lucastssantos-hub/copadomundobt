import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AXIS_CONFIG, FundamentalAxis } from '../../types/students';
import { colors, borderRadius, typography } from '../../theme';

interface AxisRatingRowProps {
  axis: FundamentalAxis;
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function AxisRatingRow({ axis, value, onChange }: AxisRatingRowProps) {
  const config = AXIS_CONFIG[axis];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={styles.label}>{config.label}</Text>
        {value != null && (
          <TouchableOpacity onPress={() => onChange(undefined)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clear}>limpar</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.buttonsRow}>
        {[1, 2, 3, 4, 5].map(n => {
          const active = value === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              activeOpacity={0.7}
              style={[
                styles.scoreBtn,
                active && { backgroundColor: config.color, borderColor: config.color },
              ]}
            >
              <Text style={[styles.scoreText, active && styles.scoreTextActive]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  clear: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  scoreTextActive: {
    color: colors.white,
  },
});

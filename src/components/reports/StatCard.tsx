import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function StatCard({ label, value, icon, color = colors.primary, subtitle, style }: StatCardProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
      )}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    flex: 1,
  },
  iconContainer: {
    borderRadius: borderRadius.full,
    padding: 8,
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});

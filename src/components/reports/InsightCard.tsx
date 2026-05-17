import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TacticalInsight } from '../../types';
import { colors, borderRadius } from '../../theme';

interface InsightCardProps {
  insight: TacticalInsight;
}

const severityConfig = {
  info: { color: colors.info, bg: colors.infoBg, icon: 'information-circle' },
  warning: { color: colors.warning, bg: colors.warningBg, icon: 'warning' },
  success: { color: colors.success, bg: colors.successBg, icon: 'checkmark-circle' },
};

export function InsightCard({ insight }: InsightCardProps) {
  const config = severityConfig[insight.severity];

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: `${config.color}44` }]}>
      <View style={styles.header}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.title, { color: config.color }]}>{insight.title}</Text>
      </View>
      <Text style={styles.description}>{insight.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

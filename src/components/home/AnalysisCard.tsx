import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Analysis } from '../../types';
import { Badge } from '../common/Badge';
import { PressableScale } from '../common/PressableScale';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { formatRelativeDate, formatDuration, getAnalysisTypeLabel, getAnalysisTypeColor } from '../../utils/formatters';

interface AnalysisCardProps {
  analysis: Analysis;
  onPress: () => void;
  onLongPress?: () => void;
}

export function AnalysisCard({ analysis, onPress, onLongPress }: AnalysisCardProps) {
  const typeColor = getAnalysisTypeColor(analysis.type);
  const typeLabel = getAnalysisTypeLabel(analysis.type);
  const athletes = analysis.athletes.map(a => a.name).join(', ');
  const eventCount = analysis.events.length;
  const rallyCount = analysis.rallies.length;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      // A card is a large surface — keep the press restrained (§1 feedback,
      // §4 no overshoot) so it reads as a settle, not a bounce.
      scaleTo={0.98}
      accessibilityLabel={analysis.title}
      style={styles.container}
    >
      <View style={[styles.accent, { backgroundColor: typeColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Badge label={typeLabel} color={typeColor} size="sm" />
          {analysis.videoUri && (
            <View style={styles.videoIndicator}>
              <Ionicons name="videocam" size={12} color={colors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{analysis.title}</Text>

        {analysis.tournament && (
          <Text style={styles.tournament} numberOfLines={1}>
            <Ionicons name="trophy-outline" size={11} color={colors.textMuted} /> {analysis.tournament}
          </Text>
        )}

        <Text style={styles.athletes} numberOfLines={1}>{athletes}</Text>

        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{formatRelativeDate(analysis.createdAt)}</Text>
          </View>

          {rallyCount > 0 && (
            <View style={styles.stat}>
              <Ionicons name="tennisball-outline" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{rallyCount} rallies</Text>
            </View>
          )}

          {eventCount > 0 && (
            <View style={styles.stat}>
              <Ionicons name="flash-outline" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{eventCount} eventos</Text>
            </View>
          )}

          {analysis.videoDuration && (
            <View style={styles.stat}>
              <Ionicons name="film-outline" size={12} color={colors.textMuted} />
              <Text style={styles.statText}>{formatDuration(analysis.videoDuration)}</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.arrow} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoIndicator: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  tournament: {
    ...typography.caption,
    color: colors.textMuted,
  },
  athletes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  arrow: {
    alignSelf: 'center',
    marginRight: spacing.sm,
  },
});

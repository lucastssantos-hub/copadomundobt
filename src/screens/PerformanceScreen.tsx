import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAnalysisStore } from '../store/analysisStore';
import { colors, spacing, borderRadius, typography } from '../theme';
import { formatDate, formatPercentage } from '../utils/formatters';
import { generateReport } from '../utils/analytics';
import { SCOUT_EVENT_CONFIG } from '../types';

export function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { analyses, loadAnalyses } = useAnalysisStore();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const reports = useMemo(() => {
    return analyses.slice(0, 10).map(a => ({
      analysis: a,
      report: generateReport(a),
    }));
  }, [analyses]);

  const aggregated = useMemo(() => {
    if (reports.length === 0) return null;
    const total = reports.reduce((acc, { report: r }) => ({
      winners: acc.winners + r.winners,
      errors: acc.errors + r.errors,
      totalPoints: acc.totalPoints + r.totalPoints,
      pointsWon: acc.pointsWon + r.pointsWon,
      offEff: acc.offEff + r.offensiveEfficiency,
      defEff: acc.defEff + r.defensiveEfficiency,
    }), { winners: 0, errors: 0, totalPoints: 0, pointsWon: 0, offEff: 0, defEff: 0 });

    return {
      ...total,
      winRate: total.totalPoints > 0 ? Math.round((total.pointsWon / total.totalPoints) * 100) : 0,
      avgOffEff: Math.round(total.offEff / reports.length),
      avgDefEff: Math.round(total.defEff / reports.length),
    };
  }, [reports]);

  const topAthletes = useMemo(() => {
    const athleteMap: Record<string, { winners: number; errors: number; count: number }> = {};
    analyses.forEach(a => {
      a.events.forEach(e => {
        if (!athleteMap[e.player]) athleteMap[e.player] = { winners: 0, errors: 0, count: 0 };
        athleteMap[e.player].count++;
        if (e.type === 'winner') athleteMap[e.player].winners++;
        if (e.type === 'erro_nao_forcado') athleteMap[e.player].errors++;
      });
    });
    return Object.entries(athleteMap)
      .filter(([, v]) => v.count >= 3)
      .map(([name, v]) => ({
        name,
        ...v,
        efficiency: v.winners + v.errors > 0 ? Math.round((v.winners / (v.winners + v.errors)) * 100) : 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);
  }, [analyses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.subtitle}>{analyses.length} análises registradas</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Aggregate stats */}
        {aggregated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visão Geral</Text>
            <View style={styles.overviewGrid}>
              <View style={[styles.overviewCard, { borderColor: `${colors.primary}44` }]}>
                <Text style={[styles.overviewValue, { color: colors.primary }]}>{aggregated.winRate}%</Text>
                <Text style={styles.overviewLabel}>Taxa de pontos</Text>
              </View>
              <View style={[styles.overviewCard, { borderColor: `${colors.success}44` }]}>
                <Text style={[styles.overviewValue, { color: colors.success }]}>{aggregated.winners}</Text>
                <Text style={styles.overviewLabel}>Winners totais</Text>
              </View>
              <View style={[styles.overviewCard, { borderColor: `${colors.error}44` }]}>
                <Text style={[styles.overviewValue, { color: colors.error }]}>{aggregated.errors}</Text>
                <Text style={styles.overviewLabel}>Erros totais</Text>
              </View>
              <View style={[styles.overviewCard, { borderColor: `${colors.info}44` }]}>
                <Text style={[styles.overviewValue, { color: colors.info }]}>{aggregated.avgDefEff}%</Text>
                <Text style={styles.overviewLabel}>Ef. defensiva</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trend — last 5 analyses */}
        {reports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Análises</Text>
            {reports.slice(0, 5).map(({ analysis, report }) => {
              const wr = report.totalPoints > 0
                ? Math.round((report.pointsWon / report.totalPoints) * 100)
                : 0;
              return (
                <TouchableOpacity
                  key={analysis.id}
                  style={styles.trendRow}
                  onPress={() => navigation.navigate('Home', { screen: 'AnalysisDetail', params: { analysisId: analysis.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.trendLeft}>
                    <Text style={styles.trendTitle} numberOfLines={1}>{analysis.title}</Text>
                    <Text style={styles.trendDate}>{formatDate(analysis.date)}</Text>
                  </View>
                  <View style={styles.trendStats}>
                    <Text style={[styles.trendWR, { color: wr >= 50 ? colors.success : colors.error }]}>
                      {wr}%
                    </Text>
                    <Text style={styles.trendWRLabel}>pontos</Text>
                  </View>
                  <View style={styles.trendBar}>
                    <View style={[
                      styles.trendBarFill,
                      { width: `${wr}%`, backgroundColor: wr >= 50 ? colors.success : colors.error }
                    ]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Top athletes */}
        {topAthletes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Atletas</Text>
            {topAthletes.map((a, i) => (
              <View key={a.name} style={styles.athleteRow}>
                <View style={[styles.rank, { backgroundColor: i === 0 ? `${colors.primary}33` : colors.surface }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? colors.primary : colors.textMuted }]}>
                    #{i + 1}
                  </Text>
                </View>
                <Text style={styles.athleteName}>{a.name}</Text>
                <View style={styles.athleteStats}>
                  <Text style={[styles.athleteStat, { color: colors.success }]}>{a.winners}W</Text>
                  <Text style={[styles.athleteStat, { color: colors.error }]}>{a.errors}E</Text>
                </View>
                <View style={[styles.effChip, {
                  backgroundColor: a.efficiency >= 50 ? colors.successBg : colors.errorBg
                }]}>
                  <Text style={[styles.effText, {
                    color: a.efficiency >= 50 ? colors.success : colors.error
                  }]}>{a.efficiency}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Most used shots across all analyses */}
        {analyses.length > 0 && (() => {
          const allCounts: Record<string, number> = {};
          analyses.forEach(a => a.events.forEach(e => {
            allCounts[e.type] = (allCounts[e.type] || 0) + 1;
          }));
          const total = Object.values(allCounts).reduce((a, b) => a + b, 0);
          const sorted = Object.entries(allCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
          if (sorted.length === 0) return null;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Golpes Mais Registrados</Text>
              <View style={styles.shotGrid}>
                {sorted.map(([type, count]) => {
                  const config = SCOUT_EVENT_CONFIG[type as keyof typeof SCOUT_EVENT_CONFIG];
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <View key={type} style={[styles.shotCard, { borderColor: `${config.color}44`, backgroundColor: `${config.color}11` }]}>
                      <Text style={[styles.shotCardCount, { color: config.color }]}>{count}</Text>
                      <Text style={[styles.shotCardLabel, { color: config.color }]}>{config.label}</Text>
                      <Text style={styles.shotCardPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {analyses.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum dado ainda</Text>
            <Text style={styles.emptyText}>Crie análises e registre eventos para ver sua performance aqui.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },

  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 12 },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  overviewValue: { fontSize: 28, fontWeight: '800' },
  overviewLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  trendRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  trendLeft: { flex: 1 },
  trendTitle: { ...typography.label, color: colors.text },
  trendDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  trendStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  trendWR: { fontSize: 20, fontWeight: '800' },
  trendWRLabel: { fontSize: 11, color: colors.textMuted },
  trendBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trendBarFill: { height: '100%', borderRadius: 2 },

  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rank: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  athleteName: { flex: 1, ...typography.label, color: colors.text },
  athleteStats: { flexDirection: 'row', gap: 10 },
  athleteStat: { fontSize: 12, fontWeight: '700' },
  effChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  effText: { fontSize: 11, fontWeight: '700' },

  shotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shotCard: {
    minWidth: '30%',
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  shotCardCount: { fontSize: 22, fontWeight: '800' },
  shotCardLabel: { fontSize: 11, fontWeight: '600' },
  shotCardPct: { fontSize: 10, color: colors.textMuted },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});

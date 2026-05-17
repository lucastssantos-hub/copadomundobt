import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAnalysisStore } from '../store/analysisStore';
import { Header } from '../components/common/Header';
import { StatCard } from '../components/reports/StatCard';
import { InsightCard } from '../components/reports/InsightCard';
import { generateReport } from '../utils/analytics';
import { pdfService } from '../services/pdfService';
import { colors, spacing, borderRadius, typography } from '../theme';
import { formatDuration } from '../utils/formatters';
import { SCOUT_EVENT_CONFIG } from '../types';

type RouteParams = { analysisId: string };

export function ReportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { activeAnalysis, loadAnalysis } = useAnalysisStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalysis(route.params.analysisId);
  }, [route.params.analysisId]);

  const report = useMemo(() => {
    if (!activeAnalysis) return null;
    return generateReport(activeAnalysis);
  }, [activeAnalysis]);

  async function handleExport() {
    if (!activeAnalysis || !report) return;
    setExporting(true);
    try {
      await pdfService.generateAndShare(activeAnalysis, report);
    } catch (err) {
      Alert.alert('Erro ao exportar', 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }

  if (!activeAnalysis || !report) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const winRate = report.totalPoints > 0
    ? Math.round((report.pointsWon / report.totalPoints) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <Header
        title="Relatório"
        subtitle={activeAnalysis.title}
        onBack={() => navigation.goBack()}
        rightAction={{ icon: 'share-outline', onPress: handleExport }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Win rate hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Taxa de Pontos Ganhos</Text>
            <Text style={[
              styles.heroValue,
              { color: winRate >= 50 ? colors.success : colors.error }
            ]}>
              {winRate}%
            </Text>
            <View style={styles.heroBar}>
              <View style={[styles.heroBarFill, { width: `${winRate}%`, backgroundColor: winRate >= 50 ? colors.success : colors.error }]} />
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroRight}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: colors.success }]}>{report.pointsWon}</Text>
              <Text style={styles.heroStatLabel}>Ganhos</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: colors.error }]}>{report.pointsLost}</Text>
              <Text style={styles.heroStatLabel}>Perdidos</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{report.totalPoints}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Winners"
            value={report.winners}
            icon="flash"
            color={colors.success}
          />
          <StatCard
            label="Erros NF"
            value={report.errors}
            icon="close-circle"
            color={colors.error}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Ef. Ofensiva"
            value={`${report.offensiveEfficiency}%`}
            icon="trending-up"
            color={colors.primary}
          />
          <StatCard
            label="Ef. Defensiva"
            value={`${report.defensiveEfficiency}%`}
            icon="shield"
            color={colors.info}
          />
        </View>

        {report.averageRallyLength > 0 && (
          <View style={styles.statsGrid}>
            <StatCard
              label="Rally Médio"
              value={formatDuration(report.averageRallyLength)}
              icon="time"
              color={colors.warning}
            />
            <StatCard
              label="Rally Mais Longo"
              value={formatDuration(report.longestRally)}
              icon="trophy"
              color={colors.warning}
            />
          </View>
        )}

        {/* Shot distribution */}
        {report.shotDistribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribuição de Golpes</Text>
            <View style={styles.shotList}>
              {report.shotDistribution.map(shot => {
                const config = SCOUT_EVENT_CONFIG[shot.type];
                return (
                  <View key={shot.type} style={styles.shotRow}>
                    <Text style={[styles.shotLabel, { color: config.color }]}>{shot.label}</Text>
                    <View style={styles.shotBarContainer}>
                      <View style={[styles.shotBar, { width: `${shot.percentage}%`, backgroundColor: config.color }]} />
                    </View>
                    <Text style={styles.shotCount}>{shot.count}</Text>
                    <Text style={styles.shotPct}>{shot.percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Player stats */}
        {report.playerStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas por Atleta</Text>
            {report.playerStats.map(ps => (
              <View key={ps.playerId} style={styles.playerCard}>
                <View style={styles.playerCardHeader}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerInitial}>{ps.playerName[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.playerCardName}>{ps.playerName}</Text>
                  <View style={[styles.effBadge, { backgroundColor: ps.efficiency >= 50 ? colors.successBg : colors.errorBg }]}>
                    <Text style={[styles.effText, { color: ps.efficiency >= 50 ? colors.success : colors.error }]}>
                      {ps.efficiency}% ef.
                    </Text>
                  </View>
                </View>
                <View style={styles.playerStatsRow}>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniVal, { color: colors.success }]}>{ps.winners}</Text>
                    <Text style={styles.miniLabel}>Winners</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniVal, { color: colors.error }]}>{ps.errors}</Text>
                    <Text style={styles.miniLabel}>Erros NF</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniVal, { color: colors.warning }]}>{ps.smashes}</Text>
                    <Text style={styles.miniLabel}>Smashes</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniVal, { color: colors.info }]}>{ps.lobs}</Text>
                    <Text style={styles.miniLabel}>Lobs</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={[styles.miniVal, { color: colors.primary }]}>{ps.pressureReceived}</Text>
                    <Text style={styles.miniLabel}>Pressão</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tactical insights */}
        {report.tacticalInsights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Insights Táticos</Text>
            </View>
            {report.tacticalInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        )}

        {report.tacticalInsights.length === 0 && activeAnalysis.events.length === 0 && (
          <View style={styles.emptyInsights}>
            <Ionicons name="analytics-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Registre eventos no scout para gerar insights táticos automáticos.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Export bar */}
      <View style={styles.exportBar}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.white} />
          )}
          <Text style={styles.exportBtnText}>
            {exporting ? 'Gerando PDF...' : 'Exportar Relatório PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },

  exportBar: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLeft: { flex: 1, gap: 8 },
  heroLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  heroBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  heroBarFill: { height: '100%', borderRadius: 3 },
  heroDivider: { width: 1, height: 80, backgroundColor: colors.border, marginHorizontal: 16 },
  heroRight: { gap: 12 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: 22, fontWeight: '800', color: colors.text },
  heroStatLabel: { fontSize: 11, color: colors.textMuted },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  section: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 12 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  shotList: { gap: 8 },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shotLabel: { width: 70, fontSize: 12, fontWeight: '600' },
  shotBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  shotBar: { height: '100%', borderRadius: 4 },
  shotCount: { width: 24, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  shotPct: { width: 36, fontSize: 12, color: colors.textMuted, textAlign: 'right' },

  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    gap: 12,
  },
  playerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitial: { fontSize: 14, fontWeight: '800', color: colors.primary },
  playerCardName: { ...typography.h4, color: colors.text, flex: 1 },
  effBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  effText: { fontSize: 11, fontWeight: '700' },
  playerStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniStat: { alignItems: 'center', gap: 2 },
  miniVal: { fontSize: 18, fontWeight: '800' },
  miniLabel: { fontSize: 10, color: colors.textMuted },

  emptyInsights: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { RadarChart } from '../../components/students/RadarChart';
import { AXIS_CONFIG, LEVEL_CONFIG } from '../../types/students';
import { currentProfile, previousProfile, axisTrends, overallScore } from '../../utils/evolution';
import { reportCardService } from '../../services/reportCardService';
import { formatDate } from '../../utils/formatters';
import { colors, spacing, borderRadius, typography } from '../../theme';

export function StudentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const studentId: string = route.params?.studentId;

  const { students, assessmentsForStudent } = useStudentStore();
  const student = students.find(s => s.id === studentId);
  const [sharing, setSharing] = useState(false);

  if (!student) {
    return (
      <View style={styles.container}>
        <Header title="Aluno" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aluno não encontrado.</Text>
        </View>
      </View>
    );
  }

  const assessments = assessmentsForStudent(student.id);
  const profile = currentProfile(assessments);
  const previous = previousProfile(assessments);
  const trends = axisTrends(assessments);
  const overall = overallScore(profile);
  const hasAssessments = assessments.length > 0;
  const hasPrevious = Object.keys(previous).length > 0;
  const level = LEVEL_CONFIG[student.level];

  const sortedAssessments = [...assessments].sort((a, b) => b.date.localeCompare(a.date));

  async function handleShareReport() {
    if (!student) return;
    setSharing(true);
    try {
      await reportCardService.generateAndShare(student, assessments);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro ao gerar boletim', msg);
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header
        title={student.name}
        subtitle={level.label}
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'create-outline',
          onPress: () => navigation.navigate('StudentForm', { studentId: student.id }),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasAssessments ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem avaliações ainda</Text>
            <Text style={styles.emptyText}>
              Avalie {student.name} após uma aula para começar a acompanhar a evolução por fundamento.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.overallRow}>
                <View>
                  <Text style={styles.cardLabel}>Nota geral</Text>
                  <Text style={styles.overallValue}>{overall?.toFixed(1) ?? '—'}</Text>
                </View>
                <View style={styles.assessCount}>
                  <Text style={styles.assessCountValue}>{assessments.length}</Text>
                  <Text style={styles.assessCountLabel}>
                    avaliaç{assessments.length === 1 ? 'ão' : 'ões'}
                  </Text>
                </View>
              </View>

              <RadarChart values={profile} compareValues={hasPrevious ? previous : undefined} />

              {hasPrevious && (
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Atual</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendLine, styles.legendDashed]} />
                    <Text style={styles.legendText}>Anterior</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Evolução por fundamento</Text>
              {trends.map(t => {
                const config = AXIS_CONFIG[t.axis];
                return (
                  <View key={t.axis} style={styles.trendRow}>
                    <View style={[styles.trendDot, { backgroundColor: config.color }]} />
                    <Text style={styles.trendLabel}>{config.label}</Text>
                    <Text style={styles.trendValue}>
                      {t.current != null ? t.current.toFixed(0) : '—'}
                    </Text>
                    {t.delta != null && t.delta !== 0 && (
                      <View style={styles.deltaBadge}>
                        <Ionicons
                          name={t.delta > 0 ? 'trending-up' : 'trending-down'}
                          size={14}
                          color={t.delta > 0 ? colors.success : colors.error}
                        />
                        <Text
                          style={[
                            styles.deltaText,
                            { color: t.delta > 0 ? colors.success : colors.error },
                          ]}
                        >
                          {t.delta > 0 ? '+' : ''}{t.delta}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Button
          label="Avaliar agora"
          onPress={() => navigation.navigate('QuickAssess', { studentId: student.id })}
          fullWidth
          size="lg"
        />

        {hasAssessments && (
          <Button
            label="Compartilhar boletim 📄"
            onPress={handleShareReport}
            loading={sharing}
            variant="secondary"
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        )}

        {sortedAssessments.length > 0 && (
          <View style={[styles.card, { marginTop: spacing.lg }]}>
            <Text style={styles.cardTitle}>Histórico</Text>
            {sortedAssessments.slice(0, 12).map(a => {
              const score = overallScore(a.scores);
              return (
                <View key={a.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDate(a.date)}</Text>
                  {a.note ? (
                    <Text style={styles.historyNote} numberOfLines={1}>{a.note}</Text>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <Text style={styles.historyScore}>{score != null ? score.toFixed(1) : '—'}</Text>
                </View>
              );
            })}
          </View>
        )}

        {student.notes && (
          <View style={[styles.card, { marginTop: spacing.lg }]}>
            <Text style={styles.cardTitle}>Observações</Text>
            <Text style={styles.notesText}>{student.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm + 4,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overallValue: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 46,
  },
  assessCount: {
    alignItems: 'center',
  },
  assessCountValue: {
    ...typography.h2,
    color: colors.text,
  },
  assessCountLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  legendDashed: {
    backgroundColor: colors.textMuted,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  trendValue: {
    ...typography.h4,
    color: colors.text,
    minWidth: 24,
    textAlign: 'right',
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 48,
    justifyContent: 'flex-end',
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    minWidth: 80,
  },
  historyNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
    fontStyle: 'italic',
  },
  historyScore: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});

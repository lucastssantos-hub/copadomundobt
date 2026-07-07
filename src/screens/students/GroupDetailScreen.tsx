import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { AXIS_CONFIG, LEVEL_CONFIG, WEEKDAY_LABELS } from '../../types/students';
import { groupInsights, currentProfile, overallScore } from '../../utils/evolution';
import { colors, spacing, borderRadius, typography } from '../../theme';

export function GroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId: string = route.params?.groupId;

  const { students, groups, assessmentsByStudent, assessmentsForStudent } = useStudentStore();
  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return (
      <View style={styles.container}>
        <Header title="Turma" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Turma não encontrada.</Text>
        </View>
      </View>
    );
  }

  const members = group.studentIds
    .map(id => students.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const insights = groupInsights(members, assessmentsByStudent(members.map(m => m.id)));
  const hasData = insights.groupOverall != null;
  const level = LEVEL_CONFIG[group.level];
  const days = group.weekdays.map(d => WEEKDAY_LABELS[d]).join(' · ');

  return (
    <View style={styles.container}>
      <Header
        title={group.name}
        subtitle={`${level.label}${days ? ` — ${days}` : ''}${group.time ? ` ${group.time}` : ''}`}
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'create-outline',
          onPress: () => navigation.navigate('GroupForm', { groupId: group.id }),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Button
          label="Avaliar aula de hoje"
          onPress={() => navigation.navigate('QuickAssess', { groupId: group.id })}
          fullWidth
          size="lg"
          style={{ marginBottom: spacing.md }}
        />

        {hasData && insights.focusAxes.length > 0 && (
          <View style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <Ionicons name="flag" size={18} color={colors.primary} />
              <Text style={styles.focusTitle}>Foco sugerido para a próxima aula</Text>
            </View>
            <Text style={styles.focusText}>
              Os fundamentos mais fracos da turma são{' '}
              {insights.focusAxes.map((axis, i) => (
                <Text key={axis} style={[styles.focusAxis, { color: AXIS_CONFIG[axis].color }]}>
                  {i > 0 ? ' e ' : ''}{AXIS_CONFIG[axis].label.toLowerCase()}
                </Text>
              ))}
              . Monte os exercícios da próxima aula em cima deles.
            </Text>
          </View>
        )}

        {hasData && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Média da turma por fundamento</Text>
              <View style={styles.overallBadge}>
                <Text style={styles.overallText}>{insights.groupOverall?.toFixed(1)}</Text>
              </View>
            </View>
            {insights.axisStats.map(stat => {
              const config = AXIS_CONFIG[stat.axis];
              const pct = stat.average != null ? (stat.average / 5) * 100 : 0;
              return (
                <View key={stat.axis} style={styles.axisRow}>
                  <Text style={styles.axisLabel}>{config.label}</Text>
                  <View style={styles.axisBarTrack}>
                    <View
                      style={[styles.axisBarFill, { width: `${pct}%`, backgroundColor: config.color }]}
                    />
                  </View>
                  <Text style={styles.axisValue}>
                    {stat.average != null ? stat.average.toFixed(1) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {insights.outliers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alunos fora do nível da turma</Text>
            <Text style={styles.outlierHint}>
              Considere ajustar a turma destes alunos para equilibrar as aulas.
            </Text>
            {insights.outliers.map(o => (
              <TouchableOpacity
                key={o.student.id}
                style={styles.outlierRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('StudentDetail', { studentId: o.student.id })}
              >
                <Ionicons
                  name={o.diff > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={20}
                  color={o.diff > 0 ? colors.success : colors.warning}
                />
                <Text style={styles.outlierName}>{o.student.name}</Text>
                <Text style={[styles.outlierDiff, { color: o.diff > 0 ? colors.success : colors.warning }]}>
                  {o.diff > 0 ? '+' : ''}{o.diff} vs média
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alunos ({members.length})</Text>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum aluno na turma. Toque no lápis acima para adicionar.
            </Text>
          ) : (
            members.map(m => {
              const overall = overallScore(currentProfile(assessmentsForStudent(m.id)));
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.memberRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('StudentDetail', { studentId: m.id })}
                >
                  <View style={[styles.levelDot, { backgroundColor: LEVEL_CONFIG[m.level].color }]} />
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberScore}>
                    {overall != null ? overall.toFixed(1) : '—'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {!hasData && members.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Avalie a primeira aula desta turma para ver a média por fundamento e o foco sugerido.
            </Text>
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
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm + 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallBadge: {
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm + 4,
  },
  overallText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  focusCard: {
    backgroundColor: `${colors.primary}14`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.primary}55`,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  focusTitle: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  focusText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  focusAxis: {
    fontWeight: '700',
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  axisLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 90,
  },
  axisBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  axisBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  axisValue: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  outlierHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  outlierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  outlierName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  outlierDiff: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  memberScore: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

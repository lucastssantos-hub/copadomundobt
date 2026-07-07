import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { ClassGroup, Student, LEVEL_CONFIG, WEEKDAY_LABELS } from '../../types/students';
import { currentProfile, overallScore } from '../../utils/evolution';
import { colors, spacing, borderRadius, typography } from '../../theme';

type TabKey = 'turmas' | 'alunos';

export function StudentsHomeScreen() {
  const navigation = useNavigation<any>();
  const { students, groups, loadAll, assessmentsForStudent } = useStudentStore();
  const [tab, setTab] = useState<TabKey>('turmas');

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  function renderGroup({ item }: { item: ClassGroup }) {
    const level = LEVEL_CONFIG[item.level];
    const days = item.weekdays.map(d => WEEKDAY_LABELS[d]).join(' · ');
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.levelBadge, { backgroundColor: `${level.color}22` }]}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
        </View>
        <View style={styles.cardMetaRow}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={styles.cardMeta}>{item.studentIds.length} aluno{item.studentIds.length === 1 ? '' : 's'}</Text>
          {days.length > 0 && (
            <>
              <Text style={styles.cardMetaDivider}>•</Text>
              <Text style={styles.cardMeta}>{days}{item.time ? ` — ${item.time}` : ''}</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.assessBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('QuickAssess', { groupId: item.id })}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
          <Text style={styles.assessBtnText}>Avaliar aula de hoje</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  function renderStudent({ item }: { item: Student }) {
    const level = LEVEL_CONFIG[item.level];
    const overall = overallScore(currentProfile(assessmentsForStudent(item.id)));
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('StudentDetail', { studentId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          {overall != null ? (
            <View style={styles.overallBadge}>
              <Text style={styles.overallText}>{overall.toFixed(1)}</Text>
            </View>
          ) : (
            <Text style={styles.noAssessment}>sem avaliação</Text>
          )}
        </View>
        <View style={styles.cardMetaRow}>
          <View style={[styles.levelDot, { backgroundColor: level.color }]} />
          <Text style={styles.cardMeta}>{level.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const isGroups = tab === 'turmas';
  const data = isGroups ? groups : [...students].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      <Header
        title="Alunos"
        subtitle="Evolução e turmas"
        rightAction={{
          icon: 'add-circle-outline',
          onPress: () =>
            isGroups
              ? navigation.navigate('GroupForm', {})
              : navigation.navigate('StudentForm', {}),
        }}
      />

      <View style={styles.tabsRow}>
        {(['turmas', 'alunos'] as TabKey[]).map(key => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === 'turmas' ? `Turmas (${groups.length})` : `Alunos (${students.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data as any[]}
        keyExtractor={item => item.id}
        renderItem={isGroups ? renderGroup : (renderStudent as any)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={isGroups ? 'people-circle-outline' : 'person-add-outline'}
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {isGroups ? 'Nenhuma turma ainda' : 'Nenhum aluno ainda'}
            </Text>
            <Text style={styles.emptyText}>
              {isGroups
                ? 'Crie sua primeira turma para começar a avaliar seus alunos após cada aula.'
                : 'Cadastre seus alunos para acompanhar a evolução deles por fundamento.'}
            </Text>
            <Button
              label={isGroups ? 'Criar turma' : 'Cadastrar aluno'}
              onPress={() =>
                isGroups
                  ? navigation.navigate('GroupForm', {})
                  : navigation.navigate('StudentForm', {})
              }
              style={{ marginTop: spacing.md }}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  cardMeta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  cardMetaDivider: {
    color: colors.textMuted,
    fontSize: 10,
  },
  overallBadge: {
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  overallText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  noAssessment: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  assessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assessBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

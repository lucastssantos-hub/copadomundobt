import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { AxisRatingRow } from '../../components/students/AxisRatingRow';
import { AXES, AxisScores, LEVEL_CONFIG } from '../../types/students';
import { currentProfile } from '../../utils/evolution';
import { colors, spacing, borderRadius, typography } from '../../theme';

/**
 * Avaliação rápida pós-aula.
 * - Com groupId: percorre os alunos da turma um a um.
 * - Com studentId: avalia um único aluno.
 * As notas iniciam pré-preenchidas com o perfil atual do aluno — o professor
 * só ajusta o que mudou, mantendo o fluxo em ~30s por aluno.
 */
export function QuickAssessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId: string | undefined = route.params?.groupId;
  const singleStudentId: string | undefined = route.params?.studentId;

  const { students, groups, addAssessment, assessmentsForStudent } = useStudentStore();

  const group = groupId ? groups.find(g => g.id === groupId) : undefined;
  const roster = useMemo(() => {
    if (singleStudentId) {
      const s = students.find(st => st.id === singleStudentId);
      return s ? [s] : [];
    }
    if (group) {
      return group.studentIds
        .map(id => students.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => s != null)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [singleStudentId, group, students]);

  const [index, setIndex] = useState(0);
  const student = roster[index];

  const [scores, setScores] = useState<AxisScores>(() =>
    student ? { ...currentProfile(assessmentsForStudent(student.id)) } : {}
  );
  const [note, setNote] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  function loadStudentAt(nextIndex: number) {
    const next = roster[nextIndex];
    setIndex(nextIndex);
    setScores(next ? { ...currentProfile(assessmentsForStudent(next.id)) } : {});
    setNote('');
  }

  function finish(totalSaved: number) {
    if (totalSaved > 0) {
      Alert.alert(
        'Aula avaliada! 🎾',
        `${totalSaved} aluno${totalSaved === 1 ? '' : 's'} avaliado${totalSaved === 1 ? '' : 's'}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      navigation.goBack();
    }
  }

  function advance(totalSaved: number) {
    if (index + 1 < roster.length) {
      loadStudentAt(index + 1);
    } else {
      finish(totalSaved);
    }
  }

  async function handleSaveAndNext() {
    if (!student) return;
    const ratedAxes = AXES.filter(a => scores[a] != null);
    if (ratedAxes.length === 0) {
      Alert.alert('Nenhuma nota', 'Dê nota em pelo menos um fundamento ou pule o aluno.');
      return;
    }
    setSaving(true);
    try {
      await addAssessment({
        studentId: student.id,
        groupId,
        date: new Date().toISOString(),
        scores: { ...scores },
        note: note.trim() || undefined,
      });
      const total = savedCount + 1;
      setSavedCount(total);
      advance(total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro ao salvar', msg);
    } finally {
      setSaving(false);
    }
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <Header title="Avaliar aula" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {group
              ? 'Esta turma ainda não tem alunos. Edite a turma e adicione alunos primeiro.'
              : 'Aluno não encontrado.'}
          </Text>
          <Button label="Voltar" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    );
  }

  const levelConfig = LEVEL_CONFIG[student.level];
  const progress = `${index + 1}/${roster.length}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={group ? group.name : 'Avaliação'}
        subtitle={roster.length > 1 ? `Aluno ${progress}` : undefined}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.studentCard}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <View style={[styles.levelBadge, { backgroundColor: `${levelConfig.color}22` }]}>
              <Text style={[styles.levelText, { color: levelConfig.color }]}>{levelConfig.label}</Text>
            </View>
          </View>
          {roster.length > 1 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((index + 1) / roster.length) * 100}%` }]} />
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          Ajuste só o que mudou nesta aula — as notas começam no nível atual do aluno.
        </Text>

        {AXES.map(axis => (
          <AxisRatingRow
            key={`${student.id}-${axis}`}
            axis={axis}
            value={scores[axis]}
            onChange={v => setScores(prev => ({ ...prev, [axis]: v }))}
          />
        ))}

        <TextInput
          style={styles.noteInput}
          placeholder="Observação da aula (opcional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Button
          label={index + 1 < roster.length ? 'Salvar e próximo →' : 'Salvar e concluir'}
          onPress={handleSaveAndNext}
          loading={saving}
          fullWidth
          size="lg"
        />

        {roster.length > 1 && (
          <Button
            label="Pular aluno (faltou)"
            onPress={() => advance(savedCount)}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
    ...typography.h3,
    color: colors.text,
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
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
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
    textAlign: 'center',
  },
});

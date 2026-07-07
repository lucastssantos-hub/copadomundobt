import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { StudentLevel, LEVELS, LEVEL_CONFIG, WEEKDAY_LABELS } from '../../types/students';
import { colors, spacing, borderRadius, typography } from '../../theme';

export function GroupFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groupId: string | undefined = route.params?.groupId;

  const { students, groups, saveGroup, deleteGroup } = useStudentStore();
  const existing = groupId ? groups.find(g => g.id === groupId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [level, setLevel] = useState<StudentLevel>(existing?.level ?? 'iniciante');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? []);
  const [time, setTime] = useState(existing?.time ?? '');
  const [studentIds, setStudentIds] = useState<string[]>(existing?.studentIds ?? []);
  const [loading, setLoading] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  function toggleStudent(id: string) {
    setStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da turma.');
      return;
    }
    setLoading(true);
    try {
      await saveGroup(
        {
          name: name.trim(),
          level,
          weekdays,
          time: time.trim() || undefined,
          studentIds,
        },
        groupId
      );
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro ao salvar', msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    if (!groupId) return;
    Alert.alert(
      'Excluir turma',
      `Excluir ${existing?.name}? Os alunos e as avaliações não serão apagados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(groupId);
            navigation.popToTop();
          },
        },
      ]
    );
  }

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={existing ? 'Editar Turma' : 'Nova Turma'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Turma Intermediária — Ter/Qui 19h"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nível da turma</Text>
          <View style={styles.levelRow}>
            {LEVELS.map(l => {
              const config = LEVEL_CONFIG[l];
              const active = level === l;
              return (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[
                    styles.levelCard,
                    active && { borderColor: config.color, backgroundColor: `${config.color}18` },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.levelLabel, active && { color: config.color }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dias da semana</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, day) => {
              const active = weekdays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleWeekday(day)}
                  style={[styles.weekdayChip, active && styles.weekdayChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Horário (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 19:00"
            placeholderTextColor={colors.textMuted}
            value={time}
            onChangeText={setTime}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Alunos da turma ({studentIds.length} selecionado{studentIds.length === 1 ? '' : 's'})
          </Text>
          {sortedStudents.length === 0 ? (
            <Text style={styles.emptyStudents}>
              Nenhum aluno cadastrado ainda. Cadastre alunos na aba Alunos e volte aqui para montá-la.
            </Text>
          ) : (
            sortedStudents.map(s => {
              const selected = studentIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleStudent(s.id)}
                  style={[styles.studentRow, selected && styles.studentRowSelected]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.studentName}>{s.name}</Text>
                  <View style={[styles.levelDot, { backgroundColor: LEVEL_CONFIG[s.level].color }]} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <Button
          label={existing ? 'Salvar alterações' : 'Criar turma'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />

        {existing && (
          <Button
            label="Excluir turma"
            onPress={handleDelete}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing.sm }}
            textStyle={{ color: colors.error }}
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 15,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  levelCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  weekdayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: colors.white,
  },
  emptyStudents: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  studentRowSelected: {
    borderColor: colors.primary,
  },
  studentName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

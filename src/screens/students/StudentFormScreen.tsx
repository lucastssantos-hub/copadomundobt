import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStudentStore } from '../../store/studentStore';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { StudentLevel, LEVELS, LEVEL_CONFIG } from '../../types/students';
import { colors, spacing, borderRadius, typography } from '../../theme';

export function StudentFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const studentId: string | undefined = route.params?.studentId;

  const { students, saveStudent, deleteStudent } = useStudentStore();
  const existing = studentId ? students.find(s => s.id === studentId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [level, setLevel] = useState<StudentLevel>(existing?.level ?? 'iniciante');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do aluno.');
      return;
    }
    setLoading(true);
    try {
      await saveStudent(
        {
          name: name.trim(),
          level,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        studentId
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
    if (!studentId) return;
    Alert.alert(
      'Excluir aluno',
      `Excluir ${existing?.name}? As avaliações dele também serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteStudent(studentId);
            navigation.popToTop();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={existing ? 'Editar Aluno' : 'Novo Aluno'}
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
            placeholder="Nome do aluno"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nível</Text>
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
          <Text style={styles.sectionLabel}>WhatsApp (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Observações (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Ex: destro, joga há 6 meses, dificuldade no saque..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <Button
          label={existing ? 'Salvar alterações' : 'Cadastrar aluno'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />

        {existing && (
          <Button
            label="Excluir aluno"
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAnalysisStore } from '../store/analysisStore';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { AnalysisType, Athlete, TeamSide } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { v4 as uuidv4 } from 'uuid';

const TYPES: { label: string; value: AnalysisType; icon: string }[] = [
  { label: 'Treino', value: 'treino', icon: 'fitness' },
  { label: 'Torneio', value: 'torneio', icon: 'trophy' },
  { label: 'Amistoso', value: 'amistoso', icon: 'people' },
];

const CATEGORIES = ['Masculino A', 'Masculino B', 'Feminino A', 'Feminino B', 'Misto A', 'Misto B', 'Sub-18', 'Master'];

export function NewAnalysisScreen() {
  const navigation = useNavigation<any>();
  const { createAnalysis } = useAnalysisStore();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AnalysisType>('treino');
  const [category, setCategory] = useState('Masculino A');
  const [tournament, setTournament] = useState('');
  const [athleteNames, setAthleteNames] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);

  function updateAthlete(index: number, value: string) {
    const updated = [...athleteNames];
    updated[index] = value;
    setAthleteNames(updated);
  }

  const athleteSides: TeamSide[] = ['dupla_a', 'dupla_a', 'dupla_b', 'dupla_b'];
  const athleteLabels = ['Dupla A — Jogador 1', 'Dupla A — Jogador 2', 'Dupla B — Jogador 1', 'Dupla B — Jogador 2'];

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Campo obrigatório', 'Informe um título para a análise.');
      return;
    }

    const filledAthletes = athleteNames.filter(n => n.trim().length > 0);
    if (filledAthletes.length < 2) {
      Alert.alert('Atletas insuficientes', 'Informe pelo menos 2 atletas.');
      return;
    }

    setLoading(true);
    try {
      const athletes: Athlete[] = athleteNames
        .map((name, i) => ({ id: uuidv4(), name: name.trim(), side: athleteSides[i] }))
        .filter(a => a.name.length > 0);

      const analysis = await createAnalysis({
        title: title.trim(),
        type,
        athletes,
        category,
        tournament: tournament.trim() || undefined,
        date: new Date().toISOString(),
      });

      navigation.replace('AnalysisDetail', { analysisId: analysis.id });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Nova Análise" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino Dupla A vs B"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />
        </View>

        {/* Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo</Text>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={[styles.typeCard, type === t.value && styles.typeCardActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon as any}
                  size={20}
                  color={type === t.value ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tournament (only if torneio) */}
        {type === 'torneio' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Torneio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Copa Regional 2024"
              placeholderTextColor={colors.textMuted}
              value={tournament}
              onChangeText={setTournament}
            />
          </View>
        )}

        {/* Athletes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Atletas</Text>

          <View style={styles.teamsContainer}>
            <View style={styles.teamBlock}>
              <View style={[styles.teamHeader, { backgroundColor: `${colors.primary}22` }]}>
                <Text style={[styles.teamTitle, { color: colors.primary }]}>Dupla A</Text>
              </View>
              {[0, 1].map(i => (
                <TextInput
                  key={i}
                  style={styles.input}
                  placeholder={`Jogador ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={athleteNames[i]}
                  onChangeText={v => updateAthlete(i, v)}
                />
              ))}
            </View>

            <View style={styles.vsContainer}>
              <View style={styles.vsDivider} />
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.vsDivider} />
            </View>

            <View style={styles.teamBlock}>
              <View style={[styles.teamHeader, { backgroundColor: `${colors.info}22` }]}>
                <Text style={[styles.teamTitle, { color: colors.info }]}>Dupla B</Text>
              </View>
              {[2, 3].map(i => (
                <TextInput
                  key={i}
                  style={styles.input}
                  placeholder={`Jogador ${i - 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={athleteNames[i]}
                  onChangeText={v => updateAthlete(i, v)}
                />
              ))}
            </View>
          </View>
        </View>

        <Button
          label="Criar Análise"
          onPress={handleCreate}
          loading={loading}
          fullWidth
          size="lg"
          style={styles.createButton}
        />
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
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  teamsContainer: {
    gap: 0,
  },
  teamBlock: {
    gap: 0,
  },
  teamHeader: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  teamTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  vsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  createButton: {
    marginTop: spacing.sm,
  },
});

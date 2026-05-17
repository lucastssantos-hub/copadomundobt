import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAnalysisStore } from '../store/analysisStore';
import { AnalysisCard } from '../components/home/AnalysisCard';
import { Badge } from '../components/common/Badge';
import { Analysis, AnalysisType } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getAnalysisTypeLabel, getAnalysisTypeColor } from '../utils/formatters';

const FILTERS: { label: string; value: AnalysisType | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Treino', value: 'treino' },
  { label: 'Torneio', value: 'torneio' },
  { label: 'Amistoso', value: 'amistoso' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { analyses, loadAnalyses, seedDemo, deleteAnalysis, isLoading, setFilter } = useAnalysisStore();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<AnalysisType | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [])
  );

  useEffect(() => {
    seedDemo();
  }, []);

  useEffect(() => {
    setFilter({
      type: activeFilter === 'all' ? undefined : activeFilter,
      search: search || undefined,
    });
  }, [search, activeFilter]);

  function handleDelete(analysis: Analysis) {
    Alert.alert(
      'Excluir análise',
      `Excluir "${analysis.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteAnalysis(analysis.id) },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>BT Vision</Text>
          <Text style={styles.appSubtitle}>Análise de Beach Tennis</Text>
        </View>
        <View style={styles.logoContainer}>
          <Ionicons name="analytics" size={28} color={colors.primary} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar análises..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setActiveFilter(f.value)}
            activeOpacity={0.7}
            style={[
              styles.filterChip,
              activeFilter === f.value && styles.filterChipActive,
            ]}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === f.value && styles.filterChipTextActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={analyses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AnalysisCard
            analysis={item}
            onPress={() => navigation.navigate('AnalysisDetail', { analysisId: item.id })}
            onLongPress={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAnalyses}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="videocam-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma análise</Text>
            <Text style={styles.emptyText}>
              Toque em "Nova Análise" para começar a registrar suas partidas.
            </Text>
          </View>
        }
        contentContainerStyle={analyses.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => navigation.navigate('NewAnalysis')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={colors.white} />
        <Text style={styles.fabText}>Nova Análise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoContainer: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: borderRadius.lg,
    padding: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});

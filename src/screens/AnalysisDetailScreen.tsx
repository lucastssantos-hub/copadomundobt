import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAnalysisStore } from '../store/analysisStore';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { aiService } from '../services/aiService';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { formatDate, formatDuration, getAnalysisTypeLabel, getAnalysisTypeColor } from '../utils/formatters';
import { SCOUT_EVENT_CONFIG } from '../types';

type RouteParams = { analysisId: string };

export function AnalysisDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { analysisId } = route.params;

  const { activeAnalysis, loadAnalysis, updateVideoUri, deleteAnalysis } = useAnalysisStore();
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiRallies, setAiRallies] = useState<number | null>(null);

  useEffect(() => {
    loadAnalysis(analysisId);
  }, [analysisId]);

  const analysis = activeAnalysis;

  async function handlePickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Acesse as configurações para permitir o acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setLoadingVideo(true);
      try {
        const asset = result.assets[0];
        await updateVideoUri(analysisId, asset.uri, asset.duration ? asset.duration / 1000 : undefined);

        setAnalyzing(true);
        const aiResult = await aiService.analyzeVideo(asset.uri);
        setAiRallies(aiResult.ralliesDetected);
      } finally {
        setLoadingVideo(false);
        setAnalyzing(false);
      }
    }
  }

  async function handleRecordVideo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Acesse as configurações para permitir o acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await updateVideoUri(analysisId, asset.uri, asset.duration ? asset.duration / 1000 : undefined);
    }
  }

  function handleDelete() {
    if (!analysis) return;
    Alert.alert(
      'Excluir análise',
      `Excluir "${analysis.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: () => {
            deleteAnalysis(analysisId);
            navigation.goBack();
          }
        },
      ]
    );
  }

  if (!analysis) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const typeColor = getAnalysisTypeColor(analysis.type);
  const eventCounts = analysis.events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <Header
        title={analysis.title}
        subtitle={formatDate(analysis.date)}
        onBack={() => navigation.goBack()}
        rightAction={{ icon: 'trash-outline', onPress: handleDelete }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Badge label={getAnalysisTypeLabel(analysis.type)} color={typeColor} />
            <Badge label={analysis.category} color={colors.textSecondary} bgColor={colors.surface} />
          </View>
          {analysis.tournament && (
            <View style={styles.infoRow}>
              <Ionicons name="trophy-outline" size={14} color={colors.textMuted} />
              <Text style={styles.infoText}>{analysis.tournament}</Text>
            </View>
          )}
          <View style={styles.athletesGrid}>
            <View style={styles.teamColumn}>
              <Text style={[styles.teamLabel, { color: colors.primary }]}>Dupla A</Text>
              {analysis.athletes.filter(a => a.side === 'dupla_a').map(a => (
                <Text key={a.id} style={styles.athleteName}>{a.name}</Text>
              ))}
            </View>
            <Text style={styles.vsSmall}>VS</Text>
            <View style={styles.teamColumn}>
              <Text style={[styles.teamLabel, { color: colors.info }]}>Dupla B</Text>
              {analysis.athletes.filter(a => a.side === 'dupla_b').map(a => (
                <Text key={a.id} style={styles.athleteName}>{a.name}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Video section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vídeo</Text>
          {analysis.videoUri ? (
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => navigation.navigate('VideoPlayer', { analysisId })}
              activeOpacity={0.8}
            >
              <View style={styles.videoIcon}>
                <Ionicons name="play-circle" size={44} color={colors.primary} />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>Vídeo importado</Text>
                {analysis.videoDuration && (
                  <Text style={styles.videoDuration}>{formatDuration(analysis.videoDuration)}</Text>
                )}
                {aiRallies !== null && (
                  <Text style={styles.aiResult}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} /> {aiRallies} rallies detectados pela IA
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.videoButtons}>
              <TouchableOpacity
                style={styles.videoButton}
                onPress={handlePickVideo}
                disabled={loadingVideo}
                activeOpacity={0.8}
              >
                {loadingVideo ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                )}
                <Text style={styles.videoButtonTitle}>
                  {analyzing ? 'Analisando...' : 'Importar Vídeo'}
                </Text>
                <Text style={styles.videoButtonSub}>Galeria</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.videoButton}
                onPress={handleRecordVideo}
                activeOpacity={0.8}
              >
                <Ionicons name="videocam-outline" size={28} color={colors.primary} />
                <Text style={styles.videoButtonTitle}>Gravar</Text>
                <Text style={styles.videoButtonSub}>Câmera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{analysis.events.length}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{analysis.rallies.length}</Text>
              <Text style={styles.statLabel}>Rallies</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{analysis.events.filter(e => e.type === 'winner').length}</Text>
              <Text style={styles.statLabel}>Winners</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{analysis.events.filter(e => e.type === 'erro_nao_forcado').length}</Text>
              <Text style={styles.statLabel}>Erros NF</Text>
            </View>
          </View>
        </View>

        {/* Top events */}
        {topEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eventos mais marcados</Text>
            <View style={styles.eventsGrid}>
              {topEvents.map(([type, count]) => {
                const config = SCOUT_EVENT_CONFIG[type as keyof typeof SCOUT_EVENT_CONFIG];
                return (
                  <View key={type} style={[styles.eventPill, { borderColor: config.color, backgroundColor: `${config.color}18` }]}>
                    <Text style={[styles.eventPillLabel, { color: config.color }]}>{config.label}</Text>
                    <Text style={[styles.eventPillCount, { color: config.color }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Scout', { analysisId })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="flash" size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Scout</Text>
            <Text style={styles.actionSub}>Marcar eventos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Report', { analysisId })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${colors.success}22` }]}>
              <Ionicons name="bar-chart" size={22} color={colors.success} />
            </View>
            <Text style={styles.actionTitle}>Relatório</Text>
            <Text style={styles.actionSub}>Ver estatísticas</Text>
          </TouchableOpacity>

          {analysis.videoUri && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('VideoPlayer', { analysisId })}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.info}22` }]}>
                <Ionicons name="play" size={22} color={colors.info} />
              </View>
              <Text style={styles.actionTitle}>Player</Text>
              <Text style={styles.actionSub}>Assistir vídeo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },

  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: 'row', gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { ...typography.bodySmall, color: colors.textMuted },
  athletesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teamColumn: { flex: 1, gap: 4 },
  teamLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  athleteName: { ...typography.body, color: colors.text },
  vsSmall: { fontSize: 12, fontWeight: '800', color: colors.textMuted, paddingHorizontal: 12 },

  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 12 },

  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 12,
    ...shadows.sm,
  },
  videoIcon: {},
  videoInfo: { flex: 1 },
  videoTitle: { ...typography.h4, color: colors.text },
  videoDuration: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  aiResult: { ...typography.caption, color: colors.primary, marginTop: 4 },

  videoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  videoButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  videoButtonTitle: { ...typography.label, color: colors.text },
  videoButtonSub: { ...typography.caption, color: colors.textMuted },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  eventPillLabel: { fontSize: 12, fontWeight: '600' },
  eventPillCount: { fontSize: 12, fontWeight: '800' },

  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 8,
    ...shadows.sm,
  },
  actionIcon: {
    borderRadius: borderRadius.md,
    padding: 10,
  },
  actionTitle: { ...typography.label, color: colors.text },
  actionSub: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});

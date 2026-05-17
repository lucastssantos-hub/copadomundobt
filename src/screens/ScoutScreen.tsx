import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAnalysisStore } from '../store/analysisStore';
import { Header } from '../components/common/Header';
import { ScoutButton } from '../components/scout/ScoutButton';
import { ScoutEventType, SCOUT_EVENT_CONFIG, TeamSide } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { formatTimestamp } from '../utils/formatters';

type RouteParams = { analysisId: string };

const SCOUT_GROUPS: { title: string; events: ScoutEventType[] }[] = [
  { title: 'Fundamentos', events: ['saque', 'devolucao'] },
  { title: 'Ataque', events: ['smash', 'ataque', 'pressao'] },
  { title: 'Defesa', events: ['lob', 'defesa', 'cobertura', 'recuperacao'] },
  { title: 'Resultado', events: ['winner', 'erro_nao_forcado'] },
  { title: 'Tático', events: ['neutro'] },
];

export function ScoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { activeAnalysis, loadAnalysis, addEvent, removeEvent } = useAnalysisStore();

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamSide>('dupla_a');
  const [noteModal, setNoteModal] = useState<{ type: ScoutEventType } | null>(null);
  const [note, setNote] = useState('');
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    loadAnalysis(route.params.analysisId);
  }, [route.params.analysisId]);

  useEffect(() => {
    if (activeAnalysis?.athletes[0]) {
      setSelectedPlayer(activeAnalysis.athletes[0].name);
      setSelectedTeam(activeAnalysis.athletes[0].side);
    }
  }, [activeAnalysis]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  function selectAthlete(name: string, side: TeamSide) {
    setSelectedPlayer(name);
    setSelectedTeam(side);
  }

  async function handleEvent(type: ScoutEventType) {
    if (!activeAnalysis) return;
    await addEvent(activeAnalysis.id, {
      type,
      timestamp: timer,
      player: selectedPlayer,
      team: selectedTeam,
    });
  }

  function handleLongPress(type: ScoutEventType) {
    setNoteModal({ type });
    setNote('');
  }

  async function submitWithNote() {
    if (!activeAnalysis || !noteModal) return;
    await addEvent(activeAnalysis.id, {
      type: noteModal.type,
      timestamp: timer,
      player: selectedPlayer,
      team: selectedTeam,
      note: note.trim() || undefined,
    });
    setNoteModal(null);
    setNote('');
  }

  function handleDeleteEvent(eventId: string) {
    if (!activeAnalysis) return;
    Alert.alert('Remover evento', 'Remover este evento do scout?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeEvent(activeAnalysis.id, eventId) },
    ]);
  }

  if (!activeAnalysis) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const eventCounts = activeAnalysis.events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentEvents = [...activeAnalysis.events].reverse().slice(0, 8);

  return (
    <View style={styles.container}>
      <Header
        title="Scout"
        subtitle={activeAnalysis.title}
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'bar-chart-outline',
          onPress: () => navigation.navigate('Report', { analysisId: activeAnalysis.id }),
        }}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerDisplay}>{formatTimestamp(timer)}</Text>
          <View style={styles.timerActions}>
            <TouchableOpacity
              style={[styles.timerBtn, timerRunning && styles.timerBtnStop]}
              onPress={() => setTimerRunning(v => !v)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={timerRunning ? 'pause' : 'play'}
                size={20}
                color={colors.white}
              />
              <Text style={styles.timerBtnText}>{timerRunning ? 'Pausar' : 'Iniciar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timerReset}
              onPress={() => { setTimer(0); setTimerRunning(false); }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Player selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Jogador</Text>
          <View style={styles.playerGrid}>
            {activeAnalysis.athletes.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => selectAthlete(a.name, a.side)}
                style={[
                  styles.playerCard,
                  selectedPlayer === a.name && styles.playerCardActive,
                  { borderColor: a.side === 'dupla_a' ? colors.primary : colors.info },
                ]}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.playerDot,
                  { backgroundColor: a.side === 'dupla_a' ? colors.primary : colors.info },
                ]} />
                <Text style={[
                  styles.playerName,
                  selectedPlayer === a.name && styles.playerNameActive,
                ]}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scout buttons grouped */}
        {SCOUT_GROUPS.map(group => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{group.title}</Text>
            <View style={styles.scoutGrid}>
              {group.events.map(type => (
                <ScoutButton
                  key={type}
                  type={type}
                  onPress={() => handleEvent(type)}
                  count={eventCounts[type] || 0}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Recent events */}
        {recentEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Últimos eventos</Text>
            <View style={styles.eventList}>
              {recentEvents.map(e => {
                const config = SCOUT_EVENT_CONFIG[e.type];
                return (
                  <TouchableOpacity
                    key={e.id}
                    onLongPress={() => handleDeleteEvent(e.id)}
                    style={styles.eventRow}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.eventDot, { backgroundColor: config.color }]} />
                    <Text style={styles.eventTime}>{formatTimestamp(e.timestamp)}</Text>
                    <Text style={[styles.eventType, { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.eventPlayer}>{e.player}</Text>
                    {e.note && <Text style={styles.eventNote}>"{e.note}"</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Note modal */}
      <Modal visible={!!noteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {noteModal ? SCOUT_EVENT_CONFIG[noteModal.type].label : ''} — Adicionar nota
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Observação opcional..."
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNoteModal(null)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitWithNote} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>Marcar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },

  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timerDisplay: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timerBtnStop: { backgroundColor: colors.error },
  timerBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  timerReset: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { marginBottom: spacing.md },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },

  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerCardActive: {
    backgroundColor: colors.surfaceElevated,
  },
  playerDot: { width: 8, height: 8, borderRadius: 4 },
  playerName: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  playerNameActive: { color: colors.text, fontWeight: '700' },

  scoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  eventList: { gap: 6 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventTime: { fontSize: 12, color: colors.textMuted, width: 40, fontVariant: ['tabular-nums'] },
  eventType: { fontSize: 13, fontWeight: '700', flex: 1 },
  eventPlayer: { fontSize: 12, color: colors.textSecondary },
  eventNote: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: 16,
  },
  modalTitle: { ...typography.h4, color: colors.text },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: { ...typography.label, color: colors.textSecondary },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmText: { ...typography.label, color: colors.white },
});

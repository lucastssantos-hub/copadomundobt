import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalysisStore } from '../store/analysisStore';
import { colors, borderRadius, typography } from '../theme';
import { formatTimestamp, formatDuration } from '../utils/formatters';
import { SCOUT_EVENT_CONFIG, ScoutEventType } from '../types';

type RouteParams = { analysisId: string };
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function VideoPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { activeAnalysis, loadAnalysis, addEvent } = useAnalysisStore();

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    loadAnalysis(route.params.analysisId);
  }, [route.params.analysisId]);

  useEffect(() => {
    if (activeAnalysis?.athletes[0]) {
      setSelectedPlayer(activeAnalysis.athletes[0].name);
    }
  }, [activeAnalysis]);

  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 3500);
    return () => clearTimeout(t);
  }, [showControls]);

  const isPlaying = status?.isLoaded && status.isPlaying;
  const currentTime = status?.isLoaded ? status.positionMillis / 1000 : 0;
  const duration = status?.isLoaded && status.durationMillis ? status.durationMillis / 1000 : 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  async function togglePlayPause() {
    if (!videoRef.current) return;
    if (isPlaying) await videoRef.current.pauseAsync();
    else await videoRef.current.playAsync();
  }

  async function seekRelative(seconds: number) {
    if (!videoRef.current || !status?.isLoaded) return;
    const newPos = Math.max(0, Math.min((currentTime + seconds) * 1000, (duration || 0) * 1000));
    await videoRef.current.setPositionAsync(newPos);
  }

  async function markEvent(type: ScoutEventType) {
    if (!activeAnalysis) return;
    const player = selectedPlayer || activeAnalysis.athletes[0]?.name || 'Atleta';
    const athlete = activeAnalysis.athletes.find(a => a.name === player);
    await addEvent(activeAnalysis.id, {
      type,
      timestamp: currentTime,
      player,
      team: athlete?.side || 'dupla_a',
    });
  }

  if (!activeAnalysis?.videoUri) {
    return (
      <View style={styles.noVideo}>
        <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
        <Text style={styles.noVideoText}>Nenhum vídeo importado</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quickEvents: ScoutEventType[] = ['smash', 'lob', 'winner', 'erro_nao_forcado', 'ataque', 'defesa'];
  const eventCounts = activeAnalysis.events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{activeAnalysis.title}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Scout', { analysisId: activeAnalysis.id })}
          style={styles.iconBtn}
        >
          <Ionicons name="flash" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(v => !v)}
        style={styles.videoContainer}
      >
        <Video
          ref={videoRef}
          source={{ uri: activeAnalysis.videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={setStatus}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          shouldPlay={false}
          useNativeControls={false}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity onPress={() => seekRelative(-5)} style={styles.controlBtn}>
              <Ionicons name="play-back" size={28} color={colors.white} />
              <Text style={styles.controlLabel}>-5s</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => seekRelative(5)} style={styles.controlBtn}>
              <Ionicons name="play-forward" size={28} color={colors.white} />
              <Text style={styles.controlLabel}>+5s</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.timeText}>{formatTimestamp(currentTime)}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          {activeAnalysis.events.map(e => (
            <View
              key={e.id}
              style={[
                styles.eventMarker,
                {
                  left: `${(e.timestamp / (duration || 1)) * 100}%`,
                  backgroundColor: SCOUT_EVENT_CONFIG[e.type]?.color || colors.primary,
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.timeText}>{formatTimestamp(duration)}</Text>
      </View>

      {/* Player selector */}
      <View style={styles.playerSelector}>
        <Text style={styles.selectorLabel}>Jogador:</Text>
        <View style={styles.playerChips}>
          {activeAnalysis.athletes.map(a => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelectedPlayer(a.name)}
              style={[
                styles.playerChip,
                selectedPlayer === a.name && styles.playerChipActive,
              ]}
            >
              <Text style={[
                styles.playerChipText,
                selectedPlayer === a.name && styles.playerChipTextActive,
              ]}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick scout buttons */}
      <View style={styles.quickScout}>
        <Text style={styles.quickLabel}>Scout rápido</Text>
        <View style={styles.quickGrid}>
          {quickEvents.map(type => {
            const config = SCOUT_EVENT_CONFIG[type];
            return (
              <TouchableOpacity
                key={type}
                onPress={() => markEvent(type)}
                style={[styles.quickBtn, { borderColor: config.color, backgroundColor: `${config.color}18` }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnLabel, { color: config.color }]}>{config.label}</Text>
                {(eventCounts[type] || 0) > 0 && (
                  <Text style={[styles.quickBtnCount, { color: config.color }]}>{eventCounts[type]}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  noVideo: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noVideoText: { ...typography.h4, color: colors.textMuted },
  backBtn: { marginTop: 8 },
  backBtnText: { color: colors.primary, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.black,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...typography.label, color: colors.text, textAlign: 'center' },

  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.5625,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  controlBtn: { alignItems: 'center', gap: 4 },
  controlLabel: { color: colors.white, fontSize: 11, opacity: 0.8 },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,107,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.background,
  },
  timeText: { fontSize: 11, color: colors.textMuted, width: 42, textAlign: 'center', fontVariant: ['tabular-nums'] },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  eventMarker: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 10,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },

  playerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectorLabel: { fontSize: 12, color: colors.textMuted, width: 56 },
  playerChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  playerChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  playerChipText: { fontSize: 12, color: colors.textMuted },
  playerChipTextActive: { color: colors.white, fontWeight: '700' },

  quickScout: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
  },
  quickLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  quickBtnLabel: { fontSize: 13, fontWeight: '700' },
  quickBtnCount: { fontSize: 12, fontWeight: '800', opacity: 0.8 },
});

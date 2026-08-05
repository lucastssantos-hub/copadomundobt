import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ScoutEventType, SCOUT_EVENT_CONFIG } from '../../types';
import { colors, borderRadius } from '../../theme';
import { PressableScale } from '../common/PressableScale';

interface ScoutButtonProps {
  type: ScoutEventType;
  onPress: () => void;
  count?: number;
  disabled?: boolean;
}

export function ScoutButton({ type, onPress, count = 0, disabled = false }: ScoutButtonProps) {
  const config = SCOUT_EVENT_CONFIG[type];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      // Deeper press for a big, glanceable live-scout target — the analyst is
      // watching the court, not the button, so the feedback has to be felt.
      scaleTo={0.93}
      hitSlop={6}
      accessibilityLabel={config.label}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.button,
          { borderColor: config.color, backgroundColor: `${config.color}18` },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.label, { color: config.color }]} numberOfLines={1}>
          {config.label}
        </Text>
        {count > 0 && (
          <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  button: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    position: 'relative',
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    // Small text wants a touch of positive tracking for legibility (§15).
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

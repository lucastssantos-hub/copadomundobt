import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { ScoutEventType, SCOUT_EVENT_CONFIG } from '../../types';
import { colors, borderRadius } from '../../theme';

interface ScoutButtonProps {
  type: ScoutEventType;
  onPress: () => void;
  count?: number;
  disabled?: boolean;
}

export function ScoutButton({ type, onPress, count = 0, disabled = false }: ScoutButtonProps) {
  const config = SCOUT_EVENT_CONFIG[type];
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    onPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.85}
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
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    position: 'relative',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
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

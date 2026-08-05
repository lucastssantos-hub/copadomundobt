import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/**
 * Press primitive built on the apple-design skill.
 *
 * - §1 Response: feedback fires on touch-DOWN (onBegin), never on release.
 * - §3 Interruptibility: the scale is a spring that always animates from its
 *   current on-screen value, so rapid taps blend instead of restarting a
 *   fixed-duration sequence.
 * - §4 Behavior over animation: critically damped springs (no overshoot) —
 *   a tap carries no momentum, so bounce would feel wrong.
 * - §10 Gesture feel: highlight on down, commit on up, cancel by dragging away
 *   (Gesture.Tap handles the movement threshold for us).
 * - §14 Reduced motion: swaps the scale for a gentle opacity cross-fade.
 */

// "Response" (settle time, in seconds) mapped to reanimated's `duration` (ms).
// Down is near-instant so the press feels direct; the release settles gracefully.
const PRESS_SPRING = { dampingRatio: 1, duration: 120 } as const;
const RELEASE_SPRING = { dampingRatio: 1, duration: 320 } as const;

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Pressed scale target. Buttons ~0.97, larger tap targets a bit deeper. */
  scaleTo?: number;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function PressableScale({
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.97,
  hitSlop = 8,
  style,
  accessibilityLabel,
  children,
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .hitSlop(hitSlop)
    // Respond the instant the finger lands (§1), animating from the live value (§3).
    .onBegin(() => {
      pressed.value = withSpring(1, PRESS_SPRING);
    })
    // Commit only on a successful touch-up; dragging away cancels (§10).
    .onEnd((_event, success) => {
      if (success && onPress) runOnJS(onPress)();
    })
    // Always settle back, whether the tap committed or was cancelled.
    .onFinalize(() => {
      pressed.value = withSpring(0, RELEASE_SPRING);
    });

  const gesture = onLongPress
    ? Gesture.Exclusive(
        Gesture.LongPress()
          .enabled(!disabled)
          .minDuration(400)
          .onStart(() => {
            runOnJS(onLongPress)();
          }),
        tap,
      )
    : tap;

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: interpolate(pressed.value, [0, 1], [1, 0.6]) };
    }
    return {
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    };
  }, [reduceMotion, scaleTo]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[style, animatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

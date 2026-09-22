import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/ui/components/ThemedText';
import { colors, spacing } from '@/ui/theme/theme';
import { AUTO_CLEAR_SECONDS, copyToClipboard } from '@/utils/clipboard';

type CopyButtonProps = {
  value: string;
  disabled?: boolean;
};

/**
 * Botón de copiar con confirmación visual y cuenta regresiva del
 * auto-borrado del portapapeles (ver plan.md, sección 5 y Fase 3/4).
 */
export function CopyButton({ value, disabled }: CopyButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (secondsLeft === null) {
      return;
    }
    if (secondsLeft <= 0) {
      setSecondsLeft(null);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function handlePress() {
    if (!value || disabled) {
      return;
    }
    await copyToClipboard(value);
    scale.value = withSequence(withTiming(1.15, { duration: 120 }), withTiming(1, { duration: 120 }));
    setSecondsLeft(AUTO_CLEAR_SECONDS);
  }

  const copied = secondsLeft !== null;

  return (
    <Pressable onPress={handlePress} disabled={disabled} hitSlop={8} style={styles.button}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <Ionicons
          name={copied ? 'checkmark-circle' : 'copy-outline'}
          size={15}
          color={copied ? colors.success : colors.accent}
        />
        <ThemedText type="small" colorToken={copied ? 'success' : 'accent'}>
          {copied ? `Copiado (${secondsLeft}s)` : 'Copiar'}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: spacing.one, paddingHorizontal: spacing.one },
  content: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

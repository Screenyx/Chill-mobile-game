import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptic, resumeMusicIfNeeded } from '@/audio/sound';
import { reputationLevel, SEASON_LABELS, seasonForDay } from '@/game/logic/calendar';
import { formatCoins } from '@/game/logic/economy';
import { useGameStore } from '@/store/gameStore';
import { colors, fonts, radius, softShadow, spacing } from '@/theme';

export const MAX_CONTENT_WIDTH = 520;

/** Largeur utile du contenu (plafonnée pour les tablettes et le web). */
export function useContentWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
}

export function Screen({ children, background = colors.cream }: { children: ReactNode; background?: string }) {
  return (
    <View style={[styles.screenOuter, { backgroundColor: background }]}>
      <SafeAreaView style={styles.screenInner} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function T({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'honey';
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Petite pulsation pour attirer doucement l'attention. */
  pulse?: boolean;
};

export function PillButton({ label, onPress, variant = 'primary', disabled, small, style, pulse }: ButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(1);

  useEffect(() => {
    glow.value = pulse
      ? withRepeat(withSequence(withTiming(1.05, { duration: 700 }), withTiming(1, { duration: 700 })), -1)
      : withTiming(1);
  }, [pulse, glow]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value * glow.value }] }));
  const palette = BUTTON_COLORS[variant];

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => (scale.value = withSpring(0.95, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        onPress={() => {
          haptic('soft');
          resumeMusicIfNeeded();
          onPress();
        }}
        style={[
          styles.button,
          small && styles.buttonSmall,
          { backgroundColor: palette.bg, borderColor: palette.border },
          disabled && styles.buttonDisabled,
        ]}>
        <T style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: palette.fg }]}>{label}</T>
      </Pressable>
    </Animated.View>
  );
}

const BUTTON_COLORS = {
  primary: { bg: colors.sageDark, fg: colors.white, border: colors.sageDark },
  secondary: { bg: colors.paper, fg: colors.text, border: colors.creamDark },
  ghost: { bg: 'transparent', fg: colors.textSoft, border: 'transparent' },
  honey: { bg: colors.honey, fg: colors.text, border: colors.honey },
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({
  value,
  color = colors.sage,
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 500 });
  }, [value, w]);
  const animated = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height }]}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, animated]} />
    </View>
  );
}

export function Stars({ count, max = 3, size = 16 }: { count: number; max?: number; size?: number }) {
  return (
    <T style={{ fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(count)}
      <T style={{ fontSize: size, color: colors.creamDark }}>{'★'.repeat(Math.max(0, max - count))}</T>
    </T>
  );
}

/** Barre du haut : jour, saison, pièces et réputation. */
export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  const day = useGameStore((s) => s.day);
  const coins = useGameStore((s) => s.coins);
  const reputation = useGameStore((s) => s.reputation);
  const season = SEASON_LABELS[seasonForDay(day)];

  return (
    <View style={styles.topBar}>
      <View style={{ flex: 1 }}>
        <T style={styles.topTitle} numberOfLines={1}>
          {title ?? `Jour ${day}`}
        </T>
        <T style={styles.topSub} numberOfLines={1}>
          {season.emoji} {season.name} · Jour {day}
        </T>
      </View>
      {right}
      <View style={styles.chip}>
        <T style={styles.chipText}>⭐ {reputationLevel(reputation)}</T>
      </View>
      <CoinChip amount={coins} />
      <HoneyChip />
    </View>
  );
}

/** Solde de miel 🍯 ; un appui ouvre la boutique. */
export function HoneyChip() {
  const honey = useGameStore((s) => s.honey);
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.15, { duration: 120 }), withSpring(1));
  }, [honey, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${honey} pots de miel, ouvrir la boutique`}
        onPress={() => router.push('/store')}
        style={[styles.chip, styles.honeyChip]}>
        <T style={styles.chipText}>🍯 {honey}</T>
        <T style={styles.plus}>+</T>
      </Pressable>
    </Animated.View>
  );
}

export function CoinChip({ amount }: { amount: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.15, { duration: 120 }), withSpring(1));
  }, [amount, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.chip, styles.coinChip, animated]}>
      <T style={styles.chipText}>🪙 {formatCoins(amount)}</T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screenOuter: { flex: 1, alignItems: 'center' },
  screenInner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  text: { color: colors.text, fontFamily: fonts.rounded, fontSize: 15 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { fontSize: 17, fontWeight: '700' },
  buttonLabelSmall: { fontSize: 14 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...softShadow,
  },
  progressTrack: { width: '100%', backgroundColor: colors.creamDark, overflow: 'hidden' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  topTitle: { fontSize: 18, fontWeight: '800' },
  topSub: { fontSize: 13, color: colors.textSoft },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...softShadow,
  },
  coinChip: { backgroundColor: colors.honeyLight },
  honeyChip: { backgroundColor: '#FCE9C2', gap: 4 },
  plus: { fontSize: 13, fontWeight: '900', color: colors.terracottaDark },
  chipText: { fontSize: 14, fontWeight: '700' },
});

/** Retour à l'écran précédent, ou à l'accueil si on est arrivé directement. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Horodatage figé à l'affichage de l'écran (évite d'appeler Date.now() pendant le rendu). */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}

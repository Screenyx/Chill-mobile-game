import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { T } from '@/components/ui';
import { getCosmetic } from '@/game/data/monetization';
import { useGameStore } from '@/store/gameStore';

/** Couleurs du ciel du lever au coucher du soleil. */
const SKY_STOPS = [0, 0.15, 0.5, 0.8, 1];
const SKY_TOP = ['#F7C8A8', '#BFE0EE', '#A9D6EC', '#F5C27A', '#E6917A'];
const SKY_BOTTOM = ['#FCE6C8', '#E8F4E8', '#E3F2EC', '#FBE0B0', '#F6C29A'];

type SkyProps = {
  /** Avancée de la journée entre 0 (lever) et 1 (coucher). */
  progress: number;
  width: number;
  height: number;
  children?: ReactNode;
};

export function Sky({ progress, width, height, children }: SkyProps) {
  const p = useSharedValue(progress);
  const drift = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(progress, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [progress, p]);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 60000, easing: Easing.linear }), -1, false);
  }, [drift]);

  const topStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, SKY_STOPS, SKY_TOP),
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, SKY_STOPS, SKY_BOTTOM),
  }));
  const sunStyle = useAnimatedStyle(() => {
    const x = interpolate(p.value, [0, 1], [18, width - 62]);
    const arc = Math.sin(p.value * Math.PI);
    return {
      transform: [{ translateX: x }, { translateY: height * 0.62 - arc * height * 0.5 }],
    };
  });
  const cloudA = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 1], [-80, width + 20]) }],
  }));
  const cloudB = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate((drift.value + 0.55) % 1, [0, 1], [-80, width + 20]) }],
  }));

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]} />
      <Animated.View style={[styles.skyBottom, bottomStyle]} />
      <Animated.View style={[styles.sun, sunStyle]}>
        <View style={styles.sunGlow} />
        <View style={styles.sunCore} />
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: height * 0.12 }, cloudA]}>
        <T style={styles.cloudText}>☁️</T>
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: height * 0.32 }, cloudB]}>
        <T style={[styles.cloudText, { fontSize: 28, opacity: 0.8 }]}>☁️</T>
      </Animated.View>
      <View style={styles.hills}>
        <View style={[styles.hill, { left: -40, width: width * 0.7, backgroundColor: '#C9DDBE' }]} />
        <View style={[styles.hill, { right: -60, width: width * 0.8, backgroundColor: '#B8D1AC' }]} />
      </View>
      {children}
    </View>
  );
}

/** Auvent rayé au-dessus de l'étal. */
export function Awning({ width, stripes = 8, cosmeticId }: { width: number; stripes?: number; cosmeticId?: string }) {
  const equipped = useGameStore((s) => s.awning);
  const [main, alt] = getCosmetic(cosmeticId ?? equipped).stripes;
  const stripeW = width / stripes;
  return (
    <View style={{ width, height: 34 }}>
      <View style={{ flexDirection: 'row', height: 22 }}>
        {Array.from({ length: stripes }, (_, i) => (
          <View key={i} style={{ width: stripeW, backgroundColor: i % 2 === 0 ? main : alt }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: stripes }, (_, i) => (
          <View
            key={i}
            style={{
              width: stripeW,
              height: 12,
              borderBottomLeftRadius: stripeW / 2,
              borderBottomRightRadius: stripeW / 2,
              backgroundColor: i % 2 === 0 ? main : alt,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skyBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  sun: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sunGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 224, 140, 0.45)',
  },
  sunCore: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD66B' },
  cloud: { position: 'absolute', left: 0 },
  cloudText: { fontSize: 36 },
  hills: { position: 'absolute', left: 0, right: 0, bottom: -60, height: 100 },
  hill: { position: 'absolute', bottom: 0, height: 100, borderTopLeftRadius: 200, borderTopRightRadius: 200 },
});

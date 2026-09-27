import { useEffect, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { T } from '@/components/ui';
import { getProduce } from '@/game/data/produce';
import { formatCoins } from '@/game/logic/economy';
import type { Lot, Slot } from '@/game/types';
import { colors, radius } from '@/theme';

/** Positions d'empilement des fruits dans une cagette (en fractions de la taille). */
const PILE = [
  { x: 0.08, y: 0.42 },
  { x: 0.38, y: 0.44 },
  { x: 0.66, y: 0.42 },
  { x: 0.22, y: 0.2 },
  { x: 0.52, y: 0.2 },
  { x: 0.37, y: 0.0 },
];

type CrateProps = {
  lot: Lot | null;
  size: number;
  capacity: number;
  price?: number;
  highlight?: boolean;
  sparkle?: boolean;
  dimmed?: boolean;
};

/** Une cagette en bois, remplie de fruits en fonction de la quantité. */
export function Crate({ lot, size, capacity, price, highlight, sparkle, dimmed }: CrateProps) {
  const scale = useSharedValue(1);
  const qty = lot?.qty ?? 0;

  useEffect(() => {
    scale.value = withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 10 }));
  }, [qty, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const produce = lot ? getProduce(lot.produceId) : null;
  const shown = lot ? Math.max(1, Math.min(PILE.length, Math.ceil((qty / capacity) * PILE.length))) : 0;
  const fontSize = size * 0.3;

  return (
    <Animated.View
      style={[
        styles.crate,
        { width: size, height: size },
        !lot && styles.crateEmpty,
        highlight && styles.crateHighlight,
        dimmed && { opacity: 0.5 },
        animated,
      ]}>
      {produce ? (
        <View style={StyleSheet.absoluteFill}>
          {PILE.slice(0, shown).map((pos, i) => (
            <T
              key={i}
              style={{
                position: 'absolute',
                left: pos.x * size,
                top: pos.y * size + size * 0.04,
                fontSize,
                lineHeight: fontSize * 1.25,
              }}>
              {produce.emoji}
            </T>
          ))}
        </View>
      ) : (
        <T style={styles.emptyPlus}>+</T>
      )}
      <View style={[styles.crateFront, { height: size * 0.22 }]}>
        <View style={styles.slat} />
      </View>
      {lot && (
        <View style={styles.qtyBadge}>
          <T style={styles.qtyText}>{qty}</T>
        </View>
      )}
      {lot && lot.age > 0 && (
        <View style={styles.ageBadge}>
          <T style={{ fontSize: 10 }}>🕰️</T>
        </View>
      )}
      {sparkle && <T style={styles.sparkle}>✨</T>}
      {lot && price !== undefined && (
        <View style={styles.priceTag}>
          <T style={styles.priceText}>{formatCoins(price)}</T>
        </View>
      )}
    </Animated.View>
  );
}

type StallGridProps = {
  stall: Slot[];
  cols: number;
  slotSize: number;
  gap: number;
  capacity: number;
  prices?: (lot: Lot) => number;
  highlightIndex?: number | null;
  sparkles?: Set<number>;
  onSlotPress?: (index: number) => void;
  gridRef?: Ref<View>;
  onLayout?: () => void;
};

export function StallGrid({
  stall,
  cols,
  slotSize,
  gap,
  capacity,
  prices,
  highlightIndex,
  sparkles,
  onSlotPress,
  gridRef,
  onLayout,
}: StallGridProps) {
  const width = cols * slotSize + (cols - 1) * gap;
  return (
    <View style={styles.table}>
      <View ref={gridRef} onLayout={onLayout} style={{ width, flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {stall.map((slot, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={slot ? `${getProduce(slot.produceId).name}, ${slot.qty}` : 'Emplacement vide'}
            onPress={() => onSlotPress?.(i)}>
            <Crate
              lot={slot}
              size={slotSize}
              capacity={capacity}
              price={slot && prices ? prices(slot) : undefined}
              highlight={highlightIndex === i}
              sparkle={sparkles?.has(i)}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: colors.woodLight,
    padding: 8,
    borderRadius: radius.md,
    borderBottomWidth: 6,
    borderBottomColor: colors.woodDark,
    alignSelf: 'center',
  },
  crate: {
    backgroundColor: '#EBCFA8',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.wood,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crateEmpty: { backgroundColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed', borderColor: colors.woodDark },
  crateHighlight: { borderColor: colors.sageDark, borderWidth: 3, backgroundColor: '#DDEBD5' },
  emptyPlus: { fontSize: 22, color: colors.woodDark, opacity: 0.6 },
  crateFront: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.wood,
    justifyContent: 'center',
  },
  slat: { height: 2, marginHorizontal: 4, backgroundColor: colors.woodDark, opacity: 0.4 },
  qtyBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: 'center',
  },
  qtyText: { fontSize: 11, fontWeight: '800' },
  ageBadge: { position: 'absolute', top: 3, left: 3 },
  sparkle: { position: 'absolute', top: 0, alignSelf: 'center', fontSize: 12 },
  priceTag: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    backgroundColor: '#3F4A3C',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  priceText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});

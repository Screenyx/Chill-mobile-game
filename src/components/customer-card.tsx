import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PillButton, Stars, T } from '@/components/ui';
import { getProduce } from '@/game/data/produce';
import { isOrderComplete } from '@/game/logic/customers';
import type { Customer } from '@/game/types';
import { colors, radius, softShadow } from '@/theme';

export type LiveCustomer = Customer & {
  say?: string;
  leaving?: { stars: number; comment: string };
};

type Props = {
  customer: LiveCustomer;
  width: number;
  selected: boolean;
  onSelect: () => void;
  onCheckout: () => void;
};

export function CustomerCard({ customer, width, selected, onSelect, onCheckout }: Props) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withDelay(
      (customer.uid % 5) * 180,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [bob, customer.uid]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));
  const complete = isOrderComplete(customer);

  return (
    <View style={[styles.wrap, { width }]}>
      <Pressable accessibilityLabel={`Choisir ${customer.name}`} onPress={onSelect} style={styles.wrap}>
        <View style={[styles.bubble, selected && styles.bubbleSelected]}>
          {customer.leaving ? (
            <>
              <Stars count={customer.leaving.stars} size={14} />
              <T style={styles.say}>{customer.leaving.comment}</T>
            </>
          ) : (
            <>
              <View style={styles.lines}>
                {customer.lines.map((l, i) => {
                  const shown = getProduce(l.substituteId ?? l.produceId);
                  const done = l.served >= l.qty;
                  return (
                    <View key={i} style={[styles.line, done && styles.lineDone]}>
                      <T style={styles.lineEmoji}>{shown.emoji}</T>
                      <T style={styles.lineQty}>{done ? '✓' : `${l.served}/${l.qty}`}</T>
                    </View>
                  );
                })}
              </View>
              <T style={styles.say} numberOfLines={2}>
                {customer.say ?? customer.greeting}
              </T>
            </>
          )}
          <View style={[styles.tail, selected && styles.tailSelected]} />
        </View>

        <Animated.View style={bobStyle}>
          <T style={styles.avatar}>{customer.emoji}</T>
        </Animated.View>
        <T style={styles.name} numberOfLines={1}>
          {customer.isRegular ? '💚 ' : ''}
          {customer.name}
        </T>
      </Pressable>
      {!customer.leaving && customer.units > 0 && (
        <PillButton
          small
          label="💰 Caisse"
          variant={complete ? 'primary' : 'honey'}
          pulse={complete}
          onPress={onCheckout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  bubble: {
    width: '100%',
    minHeight: 70,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...softShadow,
  },
  bubbleSelected: { borderColor: colors.sageDark },
  tail: {
    position: 'absolute',
    bottom: -8,
    width: 14,
    height: 14,
    backgroundColor: colors.paper,
    transform: [{ rotate: '45deg' }],
  },
  tailSelected: {
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.sageDark,
  },
  lines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  lineDone: { backgroundColor: '#DDEBD5' },
  lineEmoji: { fontSize: 16 },
  lineQty: { fontSize: 11, fontWeight: '800', marginLeft: 2 },
  say: { fontSize: 11, color: colors.textSoft, textAlign: 'center' },
  avatar: { fontSize: 40, marginTop: 8 },
  name: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
});

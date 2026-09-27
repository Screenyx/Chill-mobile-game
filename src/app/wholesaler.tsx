import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { Card, PillButton, Screen, T, TopBar } from '@/components/ui';
import { UNITS_PER_CRATE } from '@/game/data/produce';
import { reputationLevel, seasonForDay } from '@/game/logic/calendar';
import { formatCoins, round1, suggestedPrice, wholesaleOffers } from '@/game/logic/economy';
import { isInSeason } from '@/game/logic/stall';
import { useGameStore } from '@/store/gameStore';
import { colors, radius, softShadow, spacing } from '@/theme';

export default function Wholesaler() {
  const day = useGameStore((s) => s.day);
  const coins = useGameStore((s) => s.coins);
  const reputation = useGameStore((s) => s.reputation);
  const stock = useGameStore((s) => s.stock);
  const stall = useGameStore((s) => s.stall);
  const buyCrates = useGameStore((s) => s.buyCrates);

  const season = seasonForDay(day);
  const offers = useMemo(() => wholesaleOffers(day, season, reputationLevel(reputation)), [day, season, reputation]);
  const [cart, setCart] = useState<Record<string, number>>({});

  const total = round1(offers.reduce((sum, o) => sum + (cart[o.produce.id] ?? 0) * o.cratePrice, 0));
  const remaining = round1(coins - total);
  const owned = (id: string) =>
    stock.filter((l) => l.produceId === id).reduce((s, l) => s + l.qty, 0) +
    stall.reduce((s, l) => s + (l?.produceId === id ? l.qty : 0), 0);

  const change = (id: string, delta: number, cratePrice: number) => {
    const current = cart[id] ?? 0;
    const next = Math.max(0, current + delta);
    if (delta > 0 && cratePrice > remaining + 0.001) {
      haptic('soft');
      return;
    }
    haptic('light');
    if (delta > 0) playSfx('pop', 0.4);
    setCart({ ...cart, [id]: next });
  };

  const confirm = () => {
    const lines = offers
      .filter((o) => (cart[o.produce.id] ?? 0) > 0)
      .map((o) => ({ produceId: o.produce.id, crates: cart[o.produce.id], unitPrice: o.unitPrice }));
    buyCrates(lines);
    if (lines.length > 0) {
      playSfx('coin');
      haptic('success');
    } else {
      useGameStore.setState({ phase: 'arranging' });
    }
    router.replace('/stall-setup');
  };

  return (
    <Screen>
      <TopBar title="Chez le grossiste" />
      <T style={styles.hint}>
        Choisis tes cagettes du matin ({UNITS_PER_CRATE} produits par cagette). Pas de pression : ce qui ne se vend pas
        aujourd’hui se vendra demain !
      </T>

      <ScrollView contentContainerStyle={styles.list}>
        {offers.map((o, i) => {
          const qty = cart[o.produce.id] ?? 0;
          const have = owned(o.produce.id);
          return (
            <Animated.View key={o.produce.id} entering={FadeInDown.delay(i * 40).duration(400)}>
              <Card style={[styles.offer, qty > 0 && styles.offerSelected]}>
                <T style={styles.emoji}>{o.produce.emoji}</T>
                <View style={{ flex: 1 }}>
                  <T style={styles.name}>{o.produce.name}</T>
                  <T style={styles.soft}>
                    Cagette : <T style={styles.bold}>{formatCoins(o.cratePrice)} 🪙</T> · revente conseillée{' '}
                    {formatCoins(suggestedPrice(o.produce))}/u
                  </T>
                  <View style={styles.badges}>
                    {o.isBargain && <Badge label="Bon plan du jour -30 %" color={colors.honeyLight} />}
                    {isInSeason(o.produce.id, season) && <Badge label="De saison" color="#DDEBD5" />}
                    {o.produce.minReputation > 1 && <Badge label="Rare ✨" color="#EADCF2" />}
                    {have > 0 && <Badge label={`Déjà ${have} en stock`} color={colors.creamDark} />}
                  </View>
                </View>
                <View style={styles.stepper}>
                  <StepButton label="−" onPress={() => change(o.produce.id, -1, o.cratePrice)} disabled={qty === 0} />
                  <T style={styles.qty}>{qty}</T>
                  <StepButton
                    label="+"
                    onPress={() => change(o.produce.id, 1, o.cratePrice)}
                    disabled={o.cratePrice > remaining + 0.001}
                  />
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1, minWidth: 120 }}>
          <T style={styles.soft}>Panier : {formatCoins(total)} 🪙</T>
          <T style={styles.bold}>Reste : {formatCoins(remaining)} 🪙</T>
        </View>
        <PillButton label={total > 0 ? 'Charger 🚚' : 'Au rangement →'} onPress={confirm} />
      </View>
    </Screen>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <T style={styles.badgeText}>{label}</T>
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Ajouter une cagette' : 'Retirer une cagette'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.step, pressed && { transform: [{ scale: 0.9 }] }, disabled && { opacity: 0.35 }]}>
      <T style={styles.stepLabel}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { paddingHorizontal: spacing.lg, color: colors.textSoft, fontSize: 13, marginBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  offer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  offerSelected: { borderWidth: 2, borderColor: colors.sage },
  emoji: { fontSize: 38 },
  name: { fontSize: 17, fontWeight: '800' },
  soft: { color: colors.textSoft, fontSize: 13 },
  bold: { fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  qty: { fontSize: 16, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...softShadow,
  },
});

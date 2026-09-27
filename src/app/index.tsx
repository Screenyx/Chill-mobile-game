import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Awning, Sky } from '@/components/scenery';
import { Crate } from '@/components/stall';
import { Card, CoinChip, PillButton, ProgressBar, Screen, T, useContentWidth } from '@/components/ui';
import { CONFIG } from '@/game/config';
import { PRODUCE } from '@/game/data/produce';
import { reputationLevel, reputationProgress, SEASON_LABELS, dayInSeason, seasonForDay } from '@/game/logic/calendar';
import type { Phase } from '@/game/types';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

const CONTINUE: Record<Exclude<Phase, 'home'>, { label: string; href: Href }> = {
  buying: { label: 'Retourner chez le grossiste 🚚', href: '/wholesaler' },
  arranging: { label: 'Continuer le rangement 🧺', href: '/stall-setup' },
  selling: { label: 'Reprendre la vente ☀️', href: '/market' },
  summary: { label: 'Voir le récap du jour 🌙', href: '/summary' },
};

const DECOR = ['strawberry', 'lettuce', 'carrot', 'apple'];

export default function Home() {
  const width = useContentWidth();
  const day = useGameStore((s) => s.day);
  const coins = useGameStore((s) => s.coins);
  const reputation = useGameStore((s) => s.reputation);
  const phase = useGameStore((s) => s.phase);
  const collection = useGameStore((s) => s.collection);
  const startDay = useGameStore((s) => s.startDay);

  const season = SEASON_LABELS[seasonForDay(day)];
  const level = reputationLevel(reputation);
  const stallWidth = Math.min(width - 64, 320);
  const crate = (stallWidth - 16 - 3 * 6) / 4;

  const onMain = () => {
    if (phase === 'home') {
      startDay();
      router.push('/wholesaler');
    } else {
      router.push(CONTINUE[phase].href);
    }
  };

  return (
    <Screen>
      <Sky progress={0.12} width={width} height={200}>
        <View style={styles.titleWrap}>
          <T style={styles.title}>Le Petit Étal</T>
          <T style={styles.subtitle}>fruits & légumes du marché</T>
        </View>
      </Sky>

      <View style={styles.stallDecor}>
        <Awning width={stallWidth + 16} stripes={9} />
        <View style={styles.decorTable}>
          {DECOR.map((id) => (
            <Crate key={id} lot={{ produceId: id, qty: 12, age: 0 }} size={crate} capacity={CONFIG.slotCapacity} />
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(600)} style={styles.body}>
        <Card style={styles.infoCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <T style={styles.dayText}>Jour {day}</T>
              <T style={styles.soft}>
                {season.emoji} {season.name}, jour {dayInSeason(day)}/{CONFIG.daysPerSeason}
              </T>
            </View>
            <CoinChip amount={coins} />
          </View>
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <T style={styles.repText}>⭐ Réputation niveau {level}</T>
          </View>
          <ProgressBar value={reputationProgress(reputation)} color={colors.honey} />
        </Card>

        <PillButton
          label={phase === 'home' ? 'Commencer la journée ☀️' : CONTINUE[phase].label}
          onPress={onMain}
          style={{ marginTop: spacing.lg }}
        />

        <View style={styles.secondaryRow}>
          <PillButton
            small
            variant="secondary"
            label={`📖 Carnet ${collection.length}/${PRODUCE.length}`}
            onPress={() => router.push('/collection')}
            style={styles.flex}
          />
          <PillButton
            small
            variant="secondary"
            label="🛠️ Boutique"
            onPress={() => router.push('/shop')}
            style={styles.flex}
          />
        </View>
        <PillButton small variant="ghost" label="⚙️ Réglages" onPress={() => router.push('/settings')} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleWrap: { position: 'absolute', left: 0, right: 0, top: 54, alignItems: 'center' },
  title: { fontSize: 38, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSoft, marginTop: 2 },
  stallDecor: { alignItems: 'center', marginTop: -26 },
  decorTable: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    backgroundColor: colors.woodLight,
    borderRadius: 14,
    borderBottomWidth: 6,
    borderBottomColor: colors.woodDark,
  },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  infoCard: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  dayText: { fontSize: 22, fontWeight: '800' },
  soft: { color: colors.textSoft },
  repText: { fontWeight: '700', marginBottom: 4 },
  secondaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  flex: { flex: 1 },
});

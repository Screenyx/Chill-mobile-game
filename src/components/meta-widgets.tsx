import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { Card, PillButton, ProgressBar, T } from '@/components/ui';
import { DAILY_REWARDS, PASS_TIERS, PASS_XP_PER_TIER, SUBSCRIBER_DAILY_HONEY } from '@/game/data/monetization';
import {
  canClaimDaily,
  dateKey,
  isQuestDone,
  isSubscriber,
  passClaimable,
  passTier,
  rewardLabel,
  scaleReward,
} from '@/game/logic/meta';
import { useGameStore } from '@/store/gameStore';
import { colors, radius, softShadow, spacing } from '@/theme';

/** Calendrier de connexion : une petite surprise chaque jour, sans jamais perdre sa progression. */
export function DailyRewardSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const daily = useGameStore((s) => s.daily);
  const subscriptionUntil = useGameStore((s) => s.entitlements.subscriptionUntil);
  const claimDaily = useGameStore((s) => s.claimDaily);
  const claimSubscriberBonus = useGameStore((s) => s.claimSubscriberBonus);
  const [claimedLabel, setClaimedLabel] = useState<string | null>(null);

  const now = new Date();
  const subscriber = isSubscriber(subscriptionUntil, now.getTime());
  const available = canClaimDaily(daily, dateKey(now));
  const current = daily.claimed % DAILY_REWARDS.length;
  // Case mise en avant : celle du jour si disponible, sinon la dernière réclamée.
  const highlight = available ? current : (current + DAILY_REWARDS.length - 1) % DAILY_REWARDS.length;

  const claim = () => {
    const reward = claimDaily(new Date());
    if (!reward) return;
    const bonus = claimSubscriberBonus(new Date());
    playSfx('coin');
    haptic('success');
    setClaimedLabel(`${rewardLabel(reward)}${bonus ? ` + ${bonus} 🍯 (Ami·e du marché)` : ''}`);
  };

  const close = () => {
    setClaimedLabel(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.sheet}>
          <T style={styles.sheetTitle}>🌞 Cadeau du jour</T>
          <T style={styles.soft}>
            Reviens chaque jour pour la suite du calendrier. Pas de pression : une absence ne remet rien à zéro.
          </T>
          <View style={styles.calendar}>
            {DAILY_REWARDS.map((r, i) => {
              const done = available ? i < current : i <= highlight;
              return (
                <View
                  key={i}
                  style={[
                    styles.dayCell,
                    i === 6 && styles.dayBig,
                    done && styles.dayDone,
                    i === highlight && styles.dayToday,
                  ]}>
                  <T style={styles.dayLabel}>J{i + 1}</T>
                  <T style={styles.dayReward}>{rewardLabel(subscriber ? scaleReward(r, 2) : r)}</T>
                  {done && <T style={styles.check}>✓</T>}
                </View>
              );
            })}
          </View>
          {subscriber && (
            <T style={styles.sub}>💚 Ami·e du marché : cadeaux doublés + {SUBSCRIBER_DAILY_HONEY} 🍯 par jour</T>
          )}
          {claimedLabel ? (
            <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' }}>
              <T style={styles.got}>Reçu : {claimedLabel}</T>
              <PillButton label="Merci !" onPress={close} style={{ alignSelf: 'stretch' }} />
            </Animated.View>
          ) : available ? (
            <PillButton label="Récupérer 🎁" onPress={claim} pulse style={{ alignSelf: 'stretch' }} />
          ) : (
            <PillButton variant="secondary" label="À demain !" onPress={close} style={{ alignSelf: 'stretch' }} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Les 3 quêtes du jour réel. */
export function QuestsCard() {
  const quests = useGameStore((s) => s.quests.list);
  const claimQuest = useGameStore((s) => s.claimQuest);
  if (quests.length === 0) return null;
  const done = quests.filter((q) => q.claimed).length;

  return (
    <Card style={styles.questCard}>
      <View style={styles.rowBetween}>
        <T style={styles.cardTitle}>📋 Quêtes du jour</T>
        <T style={styles.soft}>
          {done}/{quests.length}
        </T>
      </View>
      {quests.map((q) => {
        const complete = isQuestDone(q);
        return (
          <View key={q.id} style={[styles.quest, q.claimed && { opacity: 0.5 }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <T style={styles.questLabel}>{q.label}</T>
              <ProgressBar value={q.progress / q.target} color={complete ? colors.sageDark : colors.honey} height={6} />
              <T style={styles.questReward}>{rewardLabel(q.reward)}</T>
            </View>
            {q.claimed ? (
              <T style={styles.check}>✓</T>
            ) : complete ? (
              <PillButton
                small
                label="🎁"
                pulse
                onPress={() => {
                  if (claimQuest(q.id)) {
                    playSfx('coin');
                    haptic('success');
                  }
                }}
              />
            ) : (
              <T style={styles.questCount}>
                {Math.floor(q.progress)}/{q.target}
              </T>
            )}
          </View>
        );
      })}
      <T style={styles.soft}>De nouvelles quêtes arrivent chaque jour.</T>
    </Card>
  );
}

/** Accès au Carnet de saison avec progression et récompenses à récupérer. */
export function PassCard() {
  const pass = useGameStore((s) => s.pass);
  const tier = passTier(pass.xp);
  const claimable = passClaimable(pass);
  const pending = claimable.free.length + claimable.premium.length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Carnet de saison" onPress={() => router.push('/pass')}>
      <Card style={styles.passCard}>
        <T style={{ fontSize: 30 }}>📗</T>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.rowBetween}>
            <T style={styles.cardTitle}>Carnet de saison{pass.premium ? ' ✨' : ''}</T>
            <T style={styles.soft}>
              {tier}/{PASS_TIERS}
            </T>
          </View>
          <ProgressBar
            value={tier >= PASS_TIERS ? 1 : (pass.xp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER}
            color={colors.sageDark}
          />
        </View>
        {pending > 0 && (
          <View style={styles.dot}>
            <T style={styles.dotText}>{pending}</T>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, pointerEvents: 'box-none' },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  sheetTitle: { fontSize: 22, fontWeight: '900' },
  soft: { color: colors.textSoft, fontSize: 12, textAlign: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: spacing.sm },
  dayCell: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...softShadow,
  },
  dayBig: { width: 154, backgroundColor: colors.honeyLight },
  dayDone: { backgroundColor: '#EEF5EA' },
  dayToday: { borderWidth: 3, borderColor: colors.terracotta },
  dayLabel: { fontSize: 11, fontWeight: '800', color: colors.textSoft },
  dayReward: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  check: { fontSize: 16, fontWeight: '900', color: colors.sageDark },
  sub: { fontSize: 12, fontWeight: '700', color: colors.sageDark, textAlign: 'center' },
  got: { fontWeight: '800', fontSize: 16, textAlign: 'center' },
  questCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '900', fontSize: 16 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  questLabel: { fontWeight: '700', fontSize: 13 },
  questReward: { fontSize: 11, color: colors.textSoft },
  questCount: { fontWeight: '800', color: colors.textSoft, fontSize: 12 },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dot: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dotText: { color: colors.white, fontWeight: '900', fontSize: 12 },
});

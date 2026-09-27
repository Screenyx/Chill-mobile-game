import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { haptic, playSfx } from '@/audio/sound';
import { PurchaseSheet } from '@/components/purchase-sheet';
import { Card, goBack, PillButton, ProgressBar, Screen, T, TopBar } from '@/components/ui';
import {
  getCosmetic,
  PASS_REWARDS,
  PASS_TIERS,
  PASS_XP_PER_TIER,
  SEASON_PASS,
  type Reward,
} from '@/game/data/monetization';
import { SEASON_LABELS, seasonForDay } from '@/game/logic/calendar';
import { passClaimable, passTier, rewardLabel } from '@/game/logic/meta';
import { useGameStore } from '@/store/gameStore';
import { colors, radius, spacing } from '@/theme';

function RewardCell({
  reward,
  reached,
  claimed,
  locked,
}: {
  reward?: Reward;
  reached: boolean;
  claimed: boolean;
  locked?: boolean;
}) {
  if (!reward) return <View style={[styles.cell, styles.cellEmpty]} />;
  const label = reward.cosmeticId ? `⛱️ ${getCosmetic(reward.cosmeticId).name}` : rewardLabel(reward);
  return (
    <View style={[styles.cell, reached && styles.cellReached, claimed && styles.cellClaimed]}>
      <T style={styles.cellText}>{label}</T>
      <T style={styles.cellState}>{claimed ? '✓' : locked ? '🔒' : reached ? '🎁' : ''}</T>
    </View>
  );
}

export default function Pass() {
  const day = useGameStore((s) => s.day);
  const pass = useGameStore((s) => s.pass);
  const claimPassRewards = useGameStore((s) => s.claimPassRewards);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tier = passTier(pass.xp);
  const claimable = passClaimable(pass);
  const toClaim = claimable.free.length + claimable.premium.length;
  const season = SEASON_LABELS[seasonForDay(day)];
  const xpInTier = pass.xp - tier * PASS_XP_PER_TIER;

  const claimAll = () => {
    const res = claimPassRewards();
    playSfx('coin');
    haptic('success');
    setMessage(`Récupéré : ${rewardLabel(res.reward)}${res.cosmetics.length ? ' + nouvel auvent 🎁' : ''}`);
  };

  return (
    <Screen>
      <TopBar title="Carnet de saison 📗" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: 6 }}>
          <T style={styles.title}>
            {season.emoji} Carnet du {season.name.toLowerCase()}
          </T>
          <T style={styles.soft}>
            Gagne de l’XP en servant tes clients, en terminant tes journées et tes quêtes. Nouveau carnet à chaque
            saison.
          </T>
          <View style={styles.tierRow}>
            <T style={styles.tier}>
              Palier {tier}/{PASS_TIERS}
            </T>
            <T style={styles.soft}>{tier >= PASS_TIERS ? 'Carnet terminé 🎉' : `${xpInTier}/${PASS_XP_PER_TIER} XP`}</T>
          </View>
          <ProgressBar
            value={tier >= PASS_TIERS ? 1 : xpInTier / PASS_XP_PER_TIER}
            color={colors.sageDark}
            height={10}
          />
          {toClaim > 0 && (
            <PillButton
              label={`Récupérer ${toClaim} récompense${toClaim > 1 ? 's' : ''} 🎁`}
              onPress={claimAll}
              pulse
            />
          )}
          {message && <T style={styles.message}>{message}</T>}
        </Card>

        {!pass.premium && (
          <Card style={styles.premiumCard}>
            <T style={styles.title}>📗 Passer au Carnet Premium</T>
            <T style={styles.soft}>
              Ligne premium à chaque palier (miel, pièces) et l’auvent exclusif « Or du marché ». Les paliers déjà
              atteints sont débloqués immédiatement.
            </T>
            <PillButton
              variant="honey"
              label={`Débloquer · ${SEASON_PASS.displayPrice}`}
              onPress={() => setBuying(true)}
            />
          </Card>
        )}

        <View style={styles.headerRow}>
          <T style={[styles.colHead, { width: 44 }]}>#</T>
          <T style={[styles.colHead, { flex: 1 }]}>Gratuit</T>
          <T style={[styles.colHead, { flex: 1 }]}>Premium</T>
        </View>
        {PASS_REWARDS.map((t) => {
          const reached = t.tier <= tier;
          return (
            <View key={t.tier} style={styles.tierLine}>
              <View style={[styles.badge, reached && styles.badgeReached]}>
                <T style={styles.badgeText}>{t.tier}</T>
              </View>
              <RewardCell reward={t.free} reached={reached} claimed={pass.claimedFree.includes(t.tier)} />
              <RewardCell
                reward={t.premium}
                reached={reached}
                claimed={pass.claimedPremium.includes(t.tier)}
                locked={!pass.premium}
              />
            </View>
          );
        })}
        <PillButton variant="secondary" label="← Retour" onPress={goBack} style={{ marginTop: spacing.md }} />
      </ScrollView>
      <PurchaseSheet product={buying ? SEASON_PASS : null} onClose={() => setBuying(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '900' },
  soft: { color: colors.textSoft, fontSize: 13 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tier: { fontWeight: '900', fontSize: 16 },
  message: { color: colors.sageDark, fontWeight: '700' },
  premiumCard: { gap: 8, backgroundColor: '#FFF8E6', borderWidth: 2, borderColor: colors.honey },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  colHead: { fontWeight: '800', color: colors.textSoft, textAlign: 'center' },
  tierLine: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  badge: {
    width: 44,
    borderRadius: radius.md,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeReached: { backgroundColor: colors.sage },
  badgeText: { fontWeight: '900' },
  cell: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.6,
  },
  cellEmpty: { backgroundColor: 'transparent' },
  cellReached: { opacity: 1, borderWidth: 2, borderColor: colors.honey },
  cellClaimed: { opacity: 0.6, borderColor: colors.sage, backgroundColor: '#EEF5EA' },
  cellText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  cellState: { fontSize: 13 },
});

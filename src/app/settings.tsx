import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Card, goBack, PillButton, Screen, T, TopBar } from '@/components/ui';
import { SPENDING_LIMITS } from '@/game/data/monetization';
import { spentThisMonth } from '@/game/logic/meta';
import type { Settings as SettingsType } from '@/game/types';
import { getPurchaseProvider } from '@/iap/purchases';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

const OPTIONS: { key: keyof SettingsType; label: string; emoji: string }[] = [
  { key: 'music', label: 'Musique douce', emoji: '🎵' },
  { key: 'sfx', label: 'Effets sonores', emoji: '🔔' },
  { key: 'haptics', label: 'Vibrations légères', emoji: '📳' },
];

export default function Settings() {
  const settings = useGameStore((s) => s.settings);
  const toggle = useGameStore((s) => s.toggleSetting);
  const resetGame = useGameStore((s) => s.resetGame);
  const [confirmReset, setConfirmReset] = useState(false);
  const spendingLimit = useGameStore((s) => s.spendingLimit);
  const setSpendingLimit = useGameStore((s) => s.setSpendingLimit);
  const history = useGameStore((s) => s.purchaseHistory);
  const [restoreLabel, setRestoreLabel] = useState('Restaurer mes achats');
  const provider = getPurchaseProvider();

  return (
    <Screen>
      <TopBar title="Réglages ⚙️" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          {OPTIONS.map((o) => (
            <View key={o.key} style={styles.row}>
              <T style={styles.label}>
                {o.emoji} {o.label}
              </T>
              <Switch
                value={settings[o.key]}
                onValueChange={() => toggle(o.key)}
                trackColor={{ true: colors.sage, false: colors.creamDark }}
                thumbColor={colors.paper}
              />
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <T style={styles.label}>🛡️ Achats intégrés</T>
          <T style={styles.soft}>
            Dépensé ce mois-ci : {spentThisMonth(history, new Date()).toFixed(2).replace('.', ',')} €
            {provider.isDemo ? ' (mode démo, aucun paiement réel)' : ''}
          </T>
          <T style={styles.soft}>Limite mensuelle (utile pour les enfants) :</T>
          <View style={styles.limits}>
            {SPENDING_LIMITS.map((l) => (
              <PillButton
                key={`${l}`}
                small
                variant={spendingLimit === l ? 'primary' : 'secondary'}
                label={l === null ? 'Aucune' : `${l} €`}
                onPress={() => setSpendingLimit(l)}
              />
            ))}
          </View>
          <PillButton
            small
            variant="secondary"
            label={restoreLabel}
            onPress={async () => {
              setRestoreLabel('Restauration…');
              const ids = await provider.restore();
              setRestoreLabel(ids.length > 0 ? `${ids.length} achat(s) restauré(s) ✓` : 'Achats à jour ✓');
            }}
          />
        </Card>

        <Card style={styles.card}>
          <T style={styles.label}>🌱 Nouvelle partie</T>
          <T style={styles.soft}>
            Recommencer au jour 1 avec 100 pièces. Ta progression sera effacée ; ton miel, tes auvents et tes achats
            sont conservés.
          </T>
          {confirmReset ? (
            <View style={styles.row}>
              <PillButton small variant="secondary" label="Annuler" onPress={() => setConfirmReset(false)} />
              <PillButton
                small
                label="Oui, recommencer"
                onPress={() => {
                  resetGame();
                  setConfirmReset(false);
                  router.replace('/');
                }}
              />
            </View>
          ) : (
            <PillButton small variant="secondary" label="Recommencer…" onPress={() => setConfirmReset(true)} />
          )}
        </Card>

        <T style={styles.about}>Le Petit Étal · un jeu tout doux, sans chrono ni game over. 🍓🥕</T>
        <PillButton variant="secondary" label="← Retour" onPress={goBack} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '700' },
  soft: { color: colors.textSoft, fontSize: 13 },
  limits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  about: { textAlign: 'center', color: colors.textSoft, fontSize: 13 },
});

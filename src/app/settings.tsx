import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Card, goBack, PillButton, Screen, T, TopBar } from '@/components/ui';
import type { Settings as SettingsType } from '@/game/types';
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

  return (
    <Screen>
      <TopBar title="Réglages ⚙️" />
      <View style={styles.content}>
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
          <T style={styles.label}>🌱 Nouvelle partie</T>
          <T style={styles.soft}>Recommencer au jour 1 avec 100 pièces. Ta progression actuelle sera effacée.</T>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '700' },
  soft: { color: colors.textSoft, fontSize: 13 },
  about: { textAlign: 'center', color: colors.textSoft, fontSize: 13 },
});

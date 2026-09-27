import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { Card, goBack, PillButton, Screen, T, TopBar } from '@/components/ui';
import { UPGRADES } from '@/game/data/upgrades';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

export default function Shop() {
  const coins = useGameStore((s) => s.coins);
  const upgrades = useGameStore((s) => s.upgrades);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);

  return (
    <Screen>
      <TopBar title="Boutique 🛠️" />
      <T style={styles.hint}>Embellis ton étal : les décorations attirent davantage de passants.</T>
      <ScrollView contentContainerStyle={styles.list}>
        {UPGRADES.map((u, i) => {
          const owned = upgrades.includes(u.id);
          return (
            <Animated.View key={u.id} entering={FadeInDown.delay(i * 50).duration(400)}>
              <Card style={[styles.item, owned && styles.owned]}>
                <T style={styles.emoji}>{u.emoji}</T>
                <View style={{ flex: 1 }}>
                  <T style={styles.name}>{u.name}</T>
                  <T style={styles.desc}>{u.description}</T>
                  {u.attractiveness > 0 && <T style={styles.bonus}>+{u.attractiveness} attractivité</T>}
                </View>
                {owned ? (
                  <T style={styles.ownedLabel}>Installé ✓</T>
                ) : (
                  <PillButton
                    small
                    variant="honey"
                    label={`${u.cost} 🪙`}
                    disabled={coins < u.cost}
                    onPress={() => {
                      if (buyUpgrade(u.id)) {
                        playSfx('coin');
                        haptic('success');
                      }
                    }}
                  />
                )}
              </Card>
            </Animated.View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <PillButton variant="secondary" label="← Retour" onPress={goBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { paddingHorizontal: spacing.lg, color: colors.textSoft, fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  owned: { backgroundColor: '#EEF5EA' },
  emoji: { fontSize: 36 },
  name: { fontSize: 16, fontWeight: '800' },
  desc: { fontSize: 13, color: colors.textSoft },
  bonus: { fontSize: 12, color: colors.terracottaDark, fontWeight: '700', marginTop: 2 },
  ownedLabel: { fontWeight: '800', color: colors.sageDark },
  footer: { padding: spacing.lg },
});

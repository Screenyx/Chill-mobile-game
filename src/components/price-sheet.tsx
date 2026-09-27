import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { haptic } from '@/audio/sound';
import { PillButton, T } from '@/components/ui';
import { getProduce } from '@/game/data/produce';
import { formatCoins, suggestedPrice } from '@/game/logic/economy';
import { priceOf, useGameStore } from '@/store/gameStore';
import { colors, radius, spacing } from '@/theme';

function mood(ratio: number): { emoji: string; label: string } {
  if (ratio <= 0.9) return { emoji: '🥰', label: 'Petit prix, les clients adorent' };
  if (ratio <= 1.05) return { emoji: '😊', label: 'Juste prix' };
  if (ratio <= 1.3) return { emoji: '🙂', label: 'Un peu cher, ça passe' };
  if (ratio <= 1.6) return { emoji: '🤔', label: 'Cher : moins de pourboires' };
  return { emoji: '😅', label: 'Trop cher pour la plupart' };
}

/** Feuille pour régler le prix de vente de chaque produit présent. */
export function PriceSheet({
  visible,
  produceIds,
  onClose,
}: {
  visible: boolean;
  produceIds: string[];
  onClose: () => void;
}) {
  const prices = useGameStore((s) => s.prices);
  const setPrice = useGameStore((s) => s.setPrice);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <T style={styles.title}>Mes prix 🏷️</T>
        <T style={styles.soft}>
          Prix à l’unité. Les produits de la veille sont automatiquement vendus 20 % moins cher.
        </T>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
          {produceIds.length === 0 && <T style={styles.soft}>Pose d’abord quelques cagettes sur l’étal.</T>}
          {produceIds.map((id) => {
            const p = getProduce(id);
            const price = priceOf(prices, id);
            const suggested = suggestedPrice(p);
            const m = mood(price / suggested);
            return (
              <View key={id} style={styles.row}>
                <T style={{ fontSize: 30 }}>{p.emoji}</T>
                <View style={{ flex: 1 }}>
                  <T style={styles.name}>{p.name}</T>
                  <T style={styles.small}>
                    {m.emoji} {m.label} · conseillé {formatCoins(suggested)}
                  </T>
                </View>
                <Step label="−" onPress={() => setPrice(id, price - 0.1)} />
                <T style={styles.price}>{formatCoins(price)}</T>
                <Step label="+" onPress={() => setPrice(id, price + 0.1)} />
              </View>
            );
          })}
        </ScrollView>
        <PillButton label="C’est parfait 👌" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Augmenter le prix' : 'Baisser le prix'}
      onPress={() => {
        haptic('soft');
        onPress();
      }}
      style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}>
      <T style={{ fontSize: 18, fontWeight: '800' }}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 8,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.creamDark,
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800' },
  soft: { color: colors.textSoft, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  name: { fontWeight: '800' },
  small: { fontSize: 12, color: colors.textSoft },
  price: { width: 44, textAlign: 'center', fontWeight: '800', fontSize: 16 },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

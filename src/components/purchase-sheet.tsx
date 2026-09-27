import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { PillButton, T } from '@/components/ui';
import { type IapProduct } from '@/game/data/monetization';
import { rewardLabel, spentThisMonth, withinSpendingLimit } from '@/game/logic/meta';
import { getPurchaseProvider } from '@/iap/purchases';
import { useGameStore, type PurchaseGrant } from '@/store/gameStore';
import { colors, radius, spacing } from '@/theme';

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; grant: PurchaseGrant }
  | { kind: 'error'; message: string };

/**
 * Confirmation d'un achat en argent réel : prix affiché clairement, contenu détaillé,
 * respect de la limite de dépenses mensuelle, puis remerciement.
 */
export function PurchaseSheet({ product, onClose }: { product: IapProduct | null; onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const applyPurchase = useGameStore((s) => s.applyPurchase);
  const limit = useGameStore((s) => s.spendingLimit);
  const history = useGameStore((s) => s.purchaseHistory);
  const firstPackBonus = useGameStore((s) => !s.entitlements.firstPackBonusUsed);
  const provider = getPurchaseProvider();

  const close = () => {
    setStatus({ kind: 'idle' });
    onClose();
  };

  const buy = async () => {
    if (!product) return;
    const now = new Date();
    if (!withinSpendingLimit(limit, history, product.priceEur, now)) {
      setStatus({
        kind: 'error',
        message: `Limite mensuelle atteinte (${limit} €, déjà ${spentThisMonth(history, now)} € ce mois-ci). Elle se règle dans les Réglages.`,
      });
      return;
    }
    setStatus({ kind: 'pending' });
    const result = await provider.purchase(product);
    if (!result.ok) {
      setStatus(
        result.cancelled ? { kind: 'idle' } : { kind: 'error', message: result.message ?? 'Achat impossible.' },
      );
      return;
    }
    const grant = applyPurchase(product.id, new Date());
    playSfx('coin');
    haptic('success');
    setStatus({ kind: 'done', grant });
  };

  const doubled = product?.kind === 'consumable' && firstPackBonus;

  return (
    <Modal visible={!!product} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={status.kind === 'pending' ? undefined : close} />
      <View style={styles.center}>
        {product && (
          <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.card}>
            {status.kind === 'done' ? (
              <>
                <T style={styles.bigEmoji}>🎉</T>
                <T style={styles.title}>Merci pour ton soutien !</T>
                <T style={styles.content}>{rewardLabel(status.grant.reward) || product.title}</T>
                {status.grant.doubled && <T style={styles.bonus}>Premier achat : miel doublé ✨</T>}
                {status.grant.cosmetics.length > 0 && (
                  <T style={styles.soft}>Nouvel auvent ajouté à ta collection 🎁</T>
                )}
                <PillButton label="Super ! 🍯" onPress={close} style={styles.full} />
              </>
            ) : (
              <>
                <T style={styles.bigEmoji}>{product.emoji}</T>
                <T style={styles.title}>{product.title}</T>
                <T style={styles.content}>{product.description ?? rewardLabel(product.reward)}</T>
                {doubled && <T style={styles.bonus}>Premier achat : ×2 → {(product.reward.honey ?? 0) * 2} 🍯</T>}
                {product.kind === 'subscription' && (
                  <T style={styles.soft}>
                    Renouvellement automatique, résiliable à tout moment depuis ton compte App Store / Google Play.
                  </T>
                )}
                {status.kind === 'error' && <T style={styles.error}>{status.message}</T>}
                {provider.isDemo && <T style={styles.demo}>Mode démo : aucun paiement réel n’est effectué.</T>}
                {status.kind === 'pending' ? (
                  <ActivityIndicator color={colors.sageDark} style={{ marginVertical: spacing.md }} />
                ) : (
                  <>
                    <PillButton label={`Acheter · ${product.displayPrice}`} onPress={buy} style={styles.full} />
                    <PillButton small variant="ghost" label="Plus tard" onPress={close} />
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, pointerEvents: 'box-none' },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  bigEmoji: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  content: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  bonus: { color: colors.terracottaDark, fontWeight: '800' },
  soft: { color: colors.textSoft, fontSize: 12, textAlign: 'center' },
  error: { color: colors.terracottaDark, fontSize: 13, textAlign: 'center' },
  demo: { color: colors.textSoft, fontSize: 11, fontStyle: 'italic' },
  full: { alignSelf: 'stretch', marginTop: spacing.sm },
});

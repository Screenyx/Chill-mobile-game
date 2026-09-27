import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { PurchaseSheet } from '@/components/purchase-sheet';
import { Awning } from '@/components/scenery';
import { Card, goBack, PillButton, Screen, T, TopBar, useContentWidth, useNow } from '@/components/ui';
import {
  COIN_BUNDLES,
  COSMETICS,
  HONEY_PACKS,
  SEASON_PASS,
  STARTER_PACK,
  SUBSCRIPTION,
  type IapProduct,
} from '@/game/data/monetization';
import { isSubscriber } from '@/game/logic/meta';
import { useGameStore } from '@/store/gameStore';
import { colors, radius, softShadow, spacing } from '@/theme';

export default function Store() {
  const width = useContentWidth();
  const honey = useGameStore((s) => s.honey);
  const owned = useGameStore((s) => s.cosmetics);
  const equipped = useGameStore((s) => s.awning);
  const entitlements = useGameStore((s) => s.entitlements);
  const now = useNow();
  const passPremium = useGameStore((s) => s.pass.premium);
  const buyCosmetic = useGameStore((s) => s.buyCosmetic);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);
  const convertHoney = useGameStore((s) => s.convertHoney);
  const [product, setProduct] = useState<IapProduct | null>(null);

  const subscriber = isSubscriber(entitlements.subscriptionUntil, now);
  const packW = (width - 32 - spacing.sm) / 2;
  const cosmeticW = (width - 32 - spacing.sm) / 2;

  /** Si le miel manque, on propose le plus petit pot qui suffit. */
  const suggestPackFor = (missing: number) => {
    setProduct(HONEY_PACKS.find((p) => (p.reward.honey ?? 0) >= missing) ?? HONEY_PACKS[HONEY_PACKS.length - 1]);
  };

  const onCosmetic = (id: string, price: number | null) => {
    if (owned.includes(id)) {
      equipCosmetic(id);
      haptic('light');
      return;
    }
    if (price === null) return;
    if (honey < price) {
      suggestPackFor(price - honey);
      return;
    }
    if (buyCosmetic(id)) {
      playSfx('coin');
      haptic('success');
    }
  };

  const offers = [
    !entitlements.starterBought && STARTER_PACK,
    !passPremium && SEASON_PASS,
    !subscriber && SUBSCRIPTION,
  ].filter((o): o is IapProduct => !!o);

  return (
    <Screen>
      <TopBar title="Boutique 🍯" />
      <ScrollView contentContainerStyle={styles.content}>
        {offers.length > 0 && <T style={styles.section}>✨ Offres</T>}
        {offers.map((o, i) => (
          <Animated.View key={o.id} entering={FadeInDown.delay(i * 60).duration(400)}>
            <Pressable accessibilityLabel={o.title} onPress={() => setProduct(o)}>
              <Card style={[styles.offer, o.id === STARTER_PACK.id && styles.offerHighlight]}>
                <T style={styles.offerEmoji}>{o.emoji}</T>
                <View style={{ flex: 1 }}>
                  <T style={styles.name}>{o.title}</T>
                  <T style={styles.desc}>{o.description}</T>
                  {o.tag && <T style={styles.tag}>{o.tag}</T>}
                </View>
                <View style={styles.priceBtn}>
                  <T style={styles.priceText}>{o.displayPrice}</T>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        ))}
        {subscriber && entitlements.subscriptionUntil && (
          <Card style={styles.offer}>
            <T style={styles.offerEmoji}>💚</T>
            <T style={[styles.desc, { flex: 1 }]}>
              Merci d’être Ami·e du marché ! Avantages actifs jusqu’au{' '}
              {new Date(entitlements.subscriptionUntil).toLocaleDateString('fr-FR')}.
            </T>
          </Card>
        )}

        <T style={styles.section}>🍯 Pots de miel</T>
        {!entitlements.firstPackBonusUsed && (
          <View style={styles.banner}>
            <T style={styles.bannerText}>🎁 Premier achat : tout le miel est doublé !</T>
          </View>
        )}
        <View style={styles.grid}>
          {HONEY_PACKS.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.title}, ${p.reward.honey} miel, ${p.displayPrice}`}
              onPress={() => setProduct(p)}
              style={({ pressed }) => [styles.pack, { width: packW }, pressed && { transform: [{ scale: 0.97 }] }]}>
              {p.tag && (
                <View style={styles.packTag}>
                  <T style={styles.packTagText}>{p.tag}</T>
                </View>
              )}
              <T style={styles.packEmoji}>{p.emoji}</T>
              <T style={styles.packAmount}>
                {!entitlements.firstPackBonusUsed && <T style={styles.strike}>{p.reward.honey} </T>}
                {(p.reward.honey ?? 0) * (entitlements.firstPackBonusUsed ? 1 : 2)} 🍯
              </T>
              <T style={styles.packTitle}>{p.title}</T>
              <View style={styles.priceBtn}>
                <T style={styles.priceText}>{p.displayPrice}</T>
              </View>
            </Pressable>
          ))}
        </View>

        <T style={styles.section}>🪙 Échanger du miel contre des pièces</T>
        <View style={styles.row}>
          {COIN_BUNDLES.map((b) => (
            <Card key={b.id} style={styles.bundle}>
              <T style={styles.bundleCoins}>{b.coins} 🪙</T>
              <PillButton
                small
                variant="honey"
                label={`${b.honey} 🍯`}
                onPress={() => {
                  if (convertHoney(b.id)) {
                    playSfx('coin');
                    haptic('success');
                  } else {
                    suggestPackFor(b.honey - honey);
                  }
                }}
              />
            </Card>
          ))}
        </View>

        <T style={styles.section}>⛱️ Auvents</T>
        <View style={styles.grid}>
          {COSMETICS.map((c) => {
            const has = owned.includes(c.id);
            const isOn = equipped === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => onCosmetic(c.id, c.honeyPrice)}
                style={[styles.cosmetic, { width: cosmeticW }, isOn && styles.cosmeticOn]}>
                <Awning width={cosmeticW - 24} stripes={6} cosmeticId={c.id} />
                <T style={styles.cosmeticName}>{c.name}</T>
                <T style={styles.cosmeticState}>
                  {isOn
                    ? 'Installé ✓'
                    : has
                      ? 'Installer'
                      : c.honeyPrice !== null
                        ? `${c.honeyPrice} 🍯`
                        : `🔒 ${c.source}`}
                </T>
              </Pressable>
            );
          })}
        </View>

        <T style={styles.legal}>
          Tous les contenus sont affichés avant achat, sans tirage au hasard. Le jeu reste entièrement jouable sans
          payer.
        </T>
        <PillButton variant="secondary" label="← Retour" onPress={goBack} />
      </ScrollView>
      <PurchaseSheet product={product} onClose={() => setProduct(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  section: { fontSize: 18, fontWeight: '900', marginTop: spacing.sm },
  offer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  offerHighlight: { borderWidth: 2, borderColor: colors.honey, backgroundColor: '#FFF8E6' },
  offerEmoji: { fontSize: 38 },
  name: { fontSize: 16, fontWeight: '800' },
  desc: { fontSize: 12, color: colors.textSoft },
  tag: { fontSize: 11, fontWeight: '800', color: colors.terracottaDark, marginTop: 2 },
  priceBtn: {
    backgroundColor: colors.sageDark,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  banner: { backgroundColor: colors.honeyLight, borderRadius: radius.md, padding: spacing.sm },
  bannerText: { fontWeight: '800', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pack: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    ...softShadow,
  },
  packTag: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.terracotta,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  packTagText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  packEmoji: { fontSize: 40, marginTop: 4 },
  packAmount: { fontSize: 18, fontWeight: '900' },
  strike: { fontSize: 13, color: colors.textSoft, textDecorationLine: 'line-through' },
  packTitle: { fontSize: 12, color: colors.textSoft },
  row: { flexDirection: 'row', gap: spacing.sm },
  bundle: { flex: 1, alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  bundleCoins: { fontWeight: '900', fontSize: 16 },
  cosmetic: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.paper,
    ...softShadow,
  },
  cosmeticOn: { borderColor: colors.sage },
  cosmeticName: { fontWeight: '800', marginTop: 6, fontSize: 13 },
  cosmeticState: { fontSize: 12, color: colors.textSoft },
  legal: { fontSize: 11, color: colors.textSoft, textAlign: 'center', marginTop: spacing.md },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card, goBack, PillButton, Screen, T, TopBar, useContentWidth } from '@/components/ui';
import { getCustomerType } from '@/game/data/customers';
import { getProduce, PRODUCE } from '@/game/data/produce';
import { SEASON_LABELS } from '@/game/logic/calendar';
import { useGameStore } from '@/store/gameStore';
import { colors, radius, softShadow, spacing } from '@/theme';

export default function Collection() {
  const width = useContentWidth();
  const collection = useGameStore((s) => s.collection);
  const regulars = useGameStore((s) => s.regulars);
  const [open, setOpen] = useState<string | null>(null);

  const cardW = (width - 32 - 2 * spacing.sm) / 3;
  const opened = open ? getProduce(open) : null;

  return (
    <Screen>
      <TopBar title="Mon carnet 📖" />
      <ScrollView contentContainerStyle={styles.content}>
        <T style={styles.soft}>
          {collection.length}/{PRODUCE.length} produits découverts. Vends un produit pour l’ajouter au carnet.
        </T>

        {opened && (
          <Animated.View entering={FadeIn}>
            <Card style={styles.detail}>
              <T style={{ fontSize: 48 }}>{opened.emoji}</T>
              <View style={{ flex: 1 }}>
                <T style={styles.detailName}>{opened.name}</T>
                <T style={styles.soft}>
                  {opened.seasons.length === 4
                    ? 'Toute l’année'
                    : opened.seasons.map((s) => `${SEASON_LABELS[s].emoji} ${SEASON_LABELS[s].name}`).join(' · ')}
                </T>
                <T style={styles.fact}>{opened.fact}</T>
              </View>
            </Card>
          </Animated.View>
        )}

        <View style={styles.grid}>
          {PRODUCE.map((p) => {
            const known = collection.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={known ? p.name : 'Produit inconnu'}
                disabled={!known}
                onPress={() => setOpen(open === p.id ? null : p.id)}
                style={[styles.cell, { width: cardW }, !known && styles.unknown, open === p.id && styles.cellOpen]}>
                <T style={[styles.cellEmoji, !known && { opacity: 0.25 }]}>{known ? p.emoji : '❔'}</T>
                <T style={styles.cellName} numberOfLines={1}>
                  {known ? p.name : '???'}
                </T>
                {!known && (
                  <T style={styles.cellHint}>
                    {p.minReputation > 1
                      ? `⭐ niveau ${p.minReputation}`
                      : p.seasons.map((s) => SEASON_LABELS[s].emoji).join('')}
                  </T>
                )}
              </Pressable>
            );
          })}
        </View>

        <T style={styles.section}>💚 Mes habitués</T>
        {Object.values(regulars).length === 0 ? (
          <T style={styles.soft}>Les clients ravis (3 ★) finissent parfois par devenir des habitués.</T>
        ) : (
          Object.values(regulars).map((r) => (
            <Card key={r.name} style={styles.regular}>
              <T style={{ fontSize: 30 }}>{getCustomerType(r.typeId).emoji}</T>
              <View style={{ flex: 1 }}>
                <T style={styles.detailName}>{r.name}</T>
                <T style={styles.soft}>
                  {r.visits} visite{r.visits > 1 ? 's' : ''} · adore {getProduce(r.favoriteId).emoji}{' '}
                  {getProduce(r.favoriteId).name.toLowerCase()}
                </T>
              </View>
            </Card>
          ))
        )}
        <PillButton variant="secondary" label="← Retour" onPress={goBack} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  soft: { color: colors.textSoft, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.paper,
    ...softShadow,
  },
  cellOpen: { borderColor: colors.sage },
  unknown: { backgroundColor: colors.creamDark, borderColor: colors.creamDark, shadowOpacity: 0, elevation: 0 },
  cellEmoji: { fontSize: 34 },
  cellName: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  cellHint: { fontSize: 11, color: colors.textSoft },
  detail: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  detailName: { fontSize: 17, fontWeight: '800' },
  fact: { marginTop: 4, fontSize: 13 },
  section: { fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  regular: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
});

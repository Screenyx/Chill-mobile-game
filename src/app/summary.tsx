import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card, PillButton, ProgressBar, Screen, T } from '@/components/ui';
import { getProduce } from '@/game/data/produce';
import { reputationLevel, reputationProgress } from '@/game/logic/calendar';
import { formatCoins, round1 } from '@/game/logic/economy';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

export default function Summary() {
  const day = useGameStore((s) => s.day);
  const today = useGameStore((s) => s.today);
  const coins = useGameStore((s) => s.coins);
  const reputation = useGameStore((s) => s.reputation);
  const nextDay = useGameStore((s) => s.nextDay);

  const star = Object.entries(today.sold).sort((a, b) => b[1] - a[1])[0];
  const earned = round1(today.revenue + today.tips + today.antiGaspiRevenue);
  const balance = round1(earned - today.spent);
  const unitsSold = Object.values(today.sold).reduce((a, b) => a + b, 0);

  const blocks = [
    <Card key="money" style={styles.card}>
      <T style={styles.cardTitle}>💰 La caisse</T>
      <Row label="Ventes" value={`${formatCoins(today.revenue)} 🪙`} />
      <Row label="Pourboires" value={`${formatCoins(today.tips)} 🪙`} />
      {today.antiGaspiUnits > 0 && (
        <Row
          label={`Paniers anti-gaspi (${today.antiGaspiUnits} produits)`}
          value={`${formatCoins(today.antiGaspiRevenue)} 🪙`}
        />
      )}
      <Row label="Achats du matin" value={`-${formatCoins(today.spent)} 🪙`} />
      <View style={styles.sep} />
      <Row label="Bilan du jour" value={`${balance >= 0 ? '+' : ''}${formatCoins(balance)} 🪙`} bold />
      <Row label="Dans ta tirelire" value={`${formatCoins(coins)} 🪙`} />
      {balance < 0 && (
        <T style={styles.soft}>Pas d’inquiétude : les invendus restent dans ta camionnette pour demain 🚚</T>
      )}
    </Card>,
    <Card key="people" style={styles.card}>
      <T style={styles.cardTitle}>😊 Les clients</T>
      <Row label="Clients servis" value={`${today.served}`} />
      <Row label="Clients ravis (3 ★)" value={`${today.happy}`} />
      {today.leftSmiling > 0 && <Row label="Repasseront une autre fois" value={`${today.leftSmiling}`} />}
      <Row label="Produits vendus" value={`${unitsSold}`} />
      <Row label="Attractivité de l’étal" value={`${today.attractiveness}/100`} />
      {today.newRegulars.length > 0 && (
        <T style={styles.highlight}>💚 Nouveaux habitués : {today.newRegulars.join(', ')}</T>
      )}
    </Card>,
    star ? (
      <Card key="star" style={[styles.card, styles.starCard]}>
        <T style={styles.cardTitle}>🏆 Produit star du jour</T>
        <T style={styles.starEmoji}>{getProduce(star[0]).emoji}</T>
        <T style={styles.starName}>
          {getProduce(star[0]).name} · {star[1]} vendus
        </T>
      </Card>
    ) : null,
    today.newInCollection.length > 0 ? (
      <Card key="collection" style={styles.card}>
        <T style={styles.cardTitle}>📖 Nouveau dans le carnet</T>
        <T style={{ fontSize: 30 }}>{today.newInCollection.map((id) => getProduce(id).emoji).join(' ')}</T>
      </Card>
    ) : null,
    <Card key="rep" style={styles.card}>
      <T style={styles.cardTitle}>⭐ Réputation</T>
      <Row label={`+${today.starsEarned} points aujourd’hui`} value={`Niveau ${reputationLevel(reputation)}`} />
      <ProgressBar value={reputationProgress(reputation)} color={colors.honey} />
    </Card>,
  ].filter(Boolean);

  return (
    <Screen background="#F8E3CF">
      <ScrollView contentContainerStyle={styles.content}>
        <T style={styles.moon}>🌙</T>
        <T style={styles.title}>Fin du jour {day}</T>
        <T style={[styles.soft, { textAlign: 'center' }]}>Les cagettes sont rangées, le marché s’endort doucement.</T>
        {blocks.map((b, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(150 + i * 120).duration(500)}>
            {b}
          </Animated.View>
        ))}
        <PillButton
          label="Aller dormir, à demain ! 🌙"
          onPress={() => {
            nextDay();
            router.replace('/');
          }}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <T style={[styles.rowLabel, bold && styles.bold]}>{label}</T>
      <T style={[styles.rowValue, bold && styles.bold]}>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  moon: { fontSize: 48, textAlign: 'center', marginTop: spacing.md },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  card: { gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowLabel: { color: colors.textSoft, flex: 1 },
  rowValue: { fontWeight: '700' },
  bold: { fontWeight: '900', color: colors.text },
  sep: { height: 1, backgroundColor: colors.creamDark, marginVertical: 4 },
  soft: { color: colors.textSoft, fontSize: 13 },
  highlight: { fontWeight: '700', color: colors.sageDark, marginTop: 4 },
  starCard: { alignItems: 'center' },
  starEmoji: { fontSize: 56 },
  starName: { fontWeight: '800' },
});

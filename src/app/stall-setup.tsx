import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { PriceSheet } from '@/components/price-sheet';
import { Awning } from '@/components/scenery';
import { Crate, StallGrid } from '@/components/stall';
import { Card, PillButton, ProgressBar, Screen, T, TopBar, useContentWidth } from '@/components/ui';
import { CONFIG } from '@/game/config';
import { getProduce } from '@/game/data/produce';
import { seasonForDay } from '@/game/logic/calendar';
import { effectiveUnitPrice } from '@/game/logic/economy';
import { computeAttractiveness, slotCapacity } from '@/game/logic/stall';
import type { Lot } from '@/game/types';
import { priceOf, useGameStore } from '@/store/gameStore';
import { colors, radius, softShadow, spacing } from '@/theme';

const GAP = 6;
const TRAY_ITEM = 66;

type Rect = { x: number; y: number; w: number; h: number };

export default function StallSetup() {
  const width = useContentWidth();
  const { height } = useWindowDimensions();
  const day = useGameStore((s) => s.day);
  const stock = useGameStore((s) => s.stock);
  const stall = useGameStore((s) => s.stall);
  const prices = useGameStore((s) => s.prices);
  const upgrades = useGameStore((s) => s.upgrades);
  const placeLot = useGameStore((s) => s.placeLot);
  const clearSlot = useGameStore((s) => s.clearSlot);
  const openStall = useGameStore((s) => s.openStall);

  const cols = CONFIG.stallCols;
  const rows = Math.ceil(stall.length / cols);
  const capacity = slotCapacity(upgrades);
  const season = seasonForDay(day);
  const slotSize = Math.max(
    52,
    Math.min(88, (width - 48 - (cols - 1) * GAP) / cols, (height - 470 - (rows - 1) * GAP) / rows),
  );

  const attract = useMemo(
    () => computeAttractiveness(stall, cols, capacity, season, upgrades),
    [stall, cols, capacity, season, upgrades],
  );
  const sparkles = useMemo(() => new Set(attract.harmonyPairs.flat()), [attract]);
  const onStallIds = useMemo(
    () => [...new Set([...stall.filter((s): s is Lot => !!s), ...stock].map((l) => l.produceId))],
    [stall, stock],
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<Lot | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rootRef = useRef<View>(null);
  const gridRef = useRef<View>(null);
  const gridRect = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const rootOffset = useRef({ x: 0, y: 0 });
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);

  const measure = () => {
    gridRef.current?.measureInWindow((x, y, w, h) => (gridRect.current = { x, y, w, h }));
    rootRef.current?.measureInWindow((x, y) => (rootOffset.current = { x, y }));
  };

  const slotAt = (x: number, y: number): number | null => {
    const r = gridRect.current;
    const col = Math.floor((x - r.x) / (slotSize + GAP));
    const row = Math.floor((y - r.y) / (slotSize + GAP));
    if (x < r.x || y < r.y || col < 0 || col >= cols || row < 0 || row >= rows) return null;
    const idx = row * cols + col;
    return idx < stall.length ? idx : null;
  };

  const drop = (lotIndex: number, slotIndex: number) => {
    const moved = placeLot(lotIndex, slotIndex);
    if (moved > 0) {
      playSfx('pop');
      haptic('light');
      setMessage(null);
    } else {
      haptic('soft');
      setMessage('Cette cagette contient déjà autre chose (ou elle est pleine) 🙂');
    }
    setSelected(null);
  };

  const onSlotPress = (i: number) => {
    if (selected !== null) {
      drop(selected, i);
    } else if (stall[i]) {
      clearSlot(i);
      playSfx('pop', 0.4);
      haptic('soft');
    }
  };

  const onDragStart = (lot: Lot, x: number, y: number) => {
    measure();
    ghostX.value = x - rootOffset.current.x;
    ghostY.value = y - rootOffset.current.y;
    setDragging(lot);
    setSelected(null);
    haptic('light');
  };

  const onDragMove = (x: number, y: number) => {
    ghostX.value = x - rootOffset.current.x;
    ghostY.value = y - rootOffset.current.y;
    const idx = slotAt(x, y);
    setHover((h) => (h === idx ? h : idx));
  };

  const onDragEnd = (lotIndex: number, x: number, y: number) => {
    const idx = slotAt(x, y);
    if (idx !== null) drop(lotIndex, idx);
  };

  const onDragFinalize = () => {
    setDragging(null);
    setHover(null);
  };

  const onTrayTap = (lotIndex: number) => {
    haptic('soft');
    setSelected((s) => (s === lotIndex ? null : lotIndex));
  };

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value - TRAY_ITEM / 2 },
      { translateY: ghostY.value - TRAY_ITEM / 2 },
      { scale: 1.1 },
    ],
  }));

  const filled = stall.some((s) => s);
  const open = () => {
    openStall(attract.score);
    playSfx('bell');
    haptic('success');
    router.replace('/market');
  };

  return (
    <View ref={rootRef} style={{ flex: 1 }} onLayout={measure}>
      <Screen>
        <TopBar title="Mon étalage" />
        <T style={styles.hint}>
          {selected !== null
            ? 'Touche un emplacement pour y poser la cagette choisie.'
            : 'Glisse tes cagettes vers l’étal (ou touche-les puis touche un emplacement). Touche une cagette posée pour la reprendre.'}
        </T>

        <View style={{ alignItems: 'center' }}>
          <Awning width={cols * slotSize + (cols - 1) * GAP + 16} stripes={9} />
          <StallGrid
            stall={stall}
            cols={cols}
            slotSize={slotSize}
            gap={GAP}
            capacity={capacity}
            prices={(lot) => effectiveUnitPrice(priceOf(prices, lot.produceId), lot.age)}
            highlightIndex={hover}
            sparkles={sparkles}
            onSlotPress={onSlotPress}
            gridRef={gridRef}
            onLayout={measure}
          />
          <T style={styles.frontLabel}>▲ La rangée du haut est celle de devant, face aux clients</T>
        </View>

        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <T style={styles.scoreTitle}>Attractivité</T>
            <T style={styles.scoreValue}>{attract.score}/100</T>
          </View>
          <ProgressBar value={attract.score / 100} color={colors.terracotta} />
          <View style={styles.chips}>
            <Chip label={`🧺 Remplissage ${Math.round(attract.fill)}/40`} />
            <Chip label={`🎨 Harmonie ${Math.round(attract.harmony)}/30`} />
            <Chip label={`🌱 De saison devant ${Math.round(attract.seasonal)}/20`} />
            <Chip label={`🌈 Variété ${Math.round(attract.variety)}/10`} />
            {attract.deco > 0 && <Chip label={`💐 Déco +${attract.deco}`} />}
          </View>
          {message && <T style={styles.message}>{message}</T>}
        </Card>

        <View style={styles.tray}>
          <T style={styles.trayTitle}>🚚 Ma camionnette</T>
          {stock.length === 0 ? (
            <T style={styles.trayEmpty}>Tout est sur l’étal ! 🎉</T>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.trayList}>
              {stock.map((lot, i) => (
                <TrayItem
                  key={`${lot.produceId}-${lot.age}`}
                  lot={lot}
                  capacity={capacity}
                  selected={selected === i}
                  onDragStart={(x, y) => onDragStart(lot, x, y)}
                  onDragMove={onDragMove}
                  onDragEnd={(x, y) => onDragEnd(i, x, y)}
                  onDragFinalize={onDragFinalize}
                  onTap={() => onTrayTap(i)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.footer}>
          <PillButton
            small
            variant="secondary"
            label="🚚 Grossiste"
            onPress={() => {
              useGameStore.setState({ phase: 'buying' });
              router.replace('/wholesaler');
            }}
          />
          <PillButton small variant="honey" label="🏷️ Prix" onPress={() => setPricesOpen(true)} />
          <PillButton
            label="Ouvrir l’étal ☀️"
            onPress={open}
            disabled={!filled}
            pulse={filled && stock.length === 0}
            style={{ flex: 1 }}
          />
        </View>
      </Screen>

      {dragging && (
        <Animated.View style={[styles.ghost, ghostStyle]}>
          <Crate lot={dragging} size={TRAY_ITEM} capacity={capacity} />
        </Animated.View>
      )}

      <PriceSheet visible={pricesOpen} produceIds={onStallIds} onClose={() => setPricesOpen(false)} />
    </View>
  );
}

type TrayItemProps = {
  lot: Lot;
  capacity: number;
  selected: boolean;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragFinalize: () => void;
  onTap: () => void;
};

/** Cagette de la camionnette : on la glisse vers l'étal, ou on la touche pour la sélectionner. */
function TrayItem({
  lot,
  capacity,
  selected,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragFinalize,
  onTap,
}: TrayItemProps) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-8, 8])
    .failOffsetX([-18, 18])
    .onStart((e) => onDragStart(e.absoluteX, e.absoluteY))
    .onUpdate((e) => onDragMove(e.absoluteX, e.absoluteY))
    .onEnd((e) => onDragEnd(e.absoluteX, e.absoluteY))
    .onFinalize(() => onDragFinalize());
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => onTap());

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${getProduce(lot.produceId).name}, ${lot.qty}`}
        style={[styles.trayItem, selected && styles.trayItemSelected]}>
        <Crate lot={lot} size={TRAY_ITEM - 8} capacity={capacity} />
        <T style={styles.trayName} numberOfLines={1}>
          {getProduce(lot.produceId).name}
        </T>
      </View>
    </GestureDetector>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <T style={styles.chipText}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: spacing.lg,
    color: colors.textSoft,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 34,
  },
  frontLabel: { fontSize: 11, color: colors.textSoft, marginTop: 4 },
  scoreCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, gap: 6 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreTitle: { fontWeight: '800' },
  scoreValue: { fontWeight: '800', color: colors.terracottaDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '600' },
  message: { fontSize: 12, color: colors.terracottaDark },
  tray: { flex: 1, justifyContent: 'center', paddingTop: spacing.sm },
  trayTitle: { fontWeight: '800', paddingHorizontal: spacing.lg, marginBottom: 4 },
  trayEmpty: { paddingHorizontal: spacing.lg, color: colors.textSoft },
  trayList: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 4, alignItems: 'flex-start' },
  trayItem: {
    width: TRAY_ITEM + 8,
    alignItems: 'center',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    ...softShadow,
  },
  trayItemSelected: { backgroundColor: '#DDEBD5', borderWidth: 2, borderColor: colors.sageDark },
  trayName: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  footer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingTop: spacing.sm, alignItems: 'center' },
  ghost: { position: 'absolute', left: 0, top: 0, zIndex: 100, pointerEvents: 'none' },
});

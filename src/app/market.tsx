import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';

import { haptic, playSfx } from '@/audio/sound';
import { CustomerCard, type LiveCustomer } from '@/components/customer-card';
import { Awning, Sky } from '@/components/scenery';
import { StallGrid } from '@/components/stall';
import { Card, PillButton, Screen, T, TopBar, useContentWidth } from '@/components/ui';
import { CONFIG } from '@/game/config';
import { SUBSCRIBER_TIP_BONUS } from '@/game/data/monetization';
import { reputationLevel, seasonForDay } from '@/game/logic/calendar';
import { checkout, customerCount, generateCustomer, serveProduct, spawnSchedule } from '@/game/logic/customers';
import { effectiveUnitPrice, formatCoins } from '@/game/logic/economy';
import { isSubscriber } from '@/game/logic/meta';
import { createRng } from '@/game/logic/random';
import { slotCapacity } from '@/game/logic/stall';
import type { Customer } from '@/game/types';
import { priceOf, useGameStore } from '@/store/gameStore';
import { colors, radius, spacing } from '@/theme';

const TICK = 0.25;
const GAP = 6;
const LEAVE_DELAY = 2.2;
const SAY_DELAY = 2.5;

type Floater = { id: number; text: string };

type Sim = {
  time: number;
  customers: (LiveCustomer & { leaveAt?: number; sayUntil?: number })[];
  spawned: number;
  uid: number;
};

/** Pourboires +10 % pour les Ami·es du marché. */
function tipBonus(state: { entitlements: { subscriptionUntil: number | null } }): number {
  return isSubscriber(state.entitlements.subscriptionUntil, Date.now()) ? SUBSCRIBER_TIP_BONUS : 1;
}

function clockLabel(progress: number): string {
  const minutes = Math.round((8 + progress * 10) * 60);
  const h = Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 10) * 10;
  return `${h}h${m === 0 ? '00' : m}`;
}

export default function Market() {
  const width = useContentWidth();
  const { height } = useWindowDimensions();
  const day = useGameStore((s) => s.day);
  const stall = useGameStore((s) => s.stall);
  const prices = useGameStore((s) => s.prices);
  const upgrades = useGameStore((s) => s.upgrades);
  const today = useGameStore((s) => s.today);
  const reputation = useGameStore((s) => s.reputation);

  const cols = CONFIG.stallCols;
  const rows = Math.ceil(stall.length / cols);
  const capacity = slotCapacity(upgrades);
  const slotSize = Math.max(
    52,
    Math.min(84, (width - 48 - (cols - 1) * GAP) / cols, (height - 480 - (rows - 1) * GAP) / rows),
  );

  // La simulation vit dans une ref (source de vérité) ; `frame` sert juste à redessiner.
  const [rng] = useState(() => createRng(day * 1013 + Math.floor(Math.random() * 1e6)));
  const [schedule] = useState(() =>
    spawnSchedule(customerCount(today.attractiveness, reputationLevel(reputation), upgrades), rng),
  );
  const sim = useRef<Sim>({ time: 0, customers: [], spawned: 0, uid: 1 });
  const [view, setView] = useState<Omit<Sim, 'uid'>>({ time: 0, customers: [], spawned: 0 });
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [ended, setEnded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const floaterId = useRef(0);

  const redraw = () => {
    const { time, customers, spawned } = sim.current;
    setView({ time, customers, spawned });
  };

  const float = (text: string) => {
    const id = ++floaterId.current;
    setFloaters((f) => [...f, { id, text }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1500);
  };

  const updateCustomer = (uid: number, patch: Partial<Sim['customers'][number]>) => {
    sim.current.customers = sim.current.customers.map((c) => (c.uid === uid ? { ...c, ...patch } : c));
  };

  const say = (uid: number, text: string) => updateCustomer(uid, { say: text, sayUntil: sim.current.time + SAY_DELAY });

  const doCheckout = (customer: Customer) => {
    const state = useGameStore.getState();
    const result = checkout(customer, state.today.attractiveness, state.upgrades, rng, tipBonus(state));
    const { newRegular } = state.completeSale(customer, result);
    if (customer.units > 0) {
      playSfx('coin');
      haptic('success');
      float(`+${formatCoins(result.total)} 🪙${result.tip > 0 ? `  (pourboire ${formatCoins(result.tip)})` : ''}`);
      if (newRegular) setTimeout(() => float(`💚 ${customer.name} deviendra un·e habitué·e !`), 700);
    }
    updateCustomer(customer.uid, {
      leaving: { stars: result.stars, comment: result.comment },
      leaveAt: sim.current.time + LEAVE_DELAY,
    });
    setSelectedUid((s) => (s === customer.uid ? null : s));
    redraw();
  };

  const tick = () => {
    const s = sim.current;
    s.time += TICK;
    const state = useGameStore.getState();

    // Départs et bulles qui s'effacent
    s.customers = s.customers
      .filter((c) => !(c.leaving && c.leaveAt !== undefined && s.time >= c.leaveAt))
      .map((c) =>
        c.sayUntil !== undefined && s.time >= c.sayUntil ? { ...c, say: undefined, sayUntil: undefined } : c,
      );

    // Patience très large : le client repart simplement, sans pénalité.
    for (const c of s.customers) {
      if (!c.leaving && s.time - c.arrivedAt > c.patience) {
        if (c.units > 0) {
          doCheckout(c);
        } else {
          state.customerLeft();
          updateCustomer(c.uid, {
            leaving: { stars: 0, comment: 'Je repasserai ! 👋' },
            leaveAt: s.time + LEAVE_DELAY,
          });
        }
      }
    }

    // Arrivées
    const active = s.customers.filter((c) => !c.leaving);
    if (
      s.time < CONFIG.marketDuration &&
      s.spawned < schedule.length &&
      schedule[s.spawned] <= s.time &&
      active.length < CONFIG.maxCustomersAtOnce
    ) {
      const customer = generateCustomer(rng, {
        uid: s.uid++,
        now: s.time,
        stall: state.stall,
        season: seasonForDay(state.day),
        repLevel: reputationLevel(state.reputation),
        regulars: state.regulars,
      });
      s.customers = [...s.customers, customer];
      s.spawned++;
      playSfx('bell', 0.35);
    }

    const noMoreVisitors = s.time >= CONFIG.marketDuration || s.spawned >= schedule.length;
    if (noMoreVisitors && s.customers.length === 0) setEnded(true);
    redraw();
  };

  useEffect(() => {
    if (ended) return;
    const id = setInterval(tick, TICK * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const onSlotPress = (slotIndex: number) => {
    const state = useGameStore.getState();
    const slot = state.stall[slotIndex];
    if (!slot) return;
    const active = sim.current.customers.filter((c) => !c.leaving);
    if (active.length === 0) {
      setNotice('Pas de client pour l’instant… profite du soleil ☀️');
      return;
    }
    const id = slot.produceId;
    const wants = (c: Customer) => c.lines.some((l) => (l.substituteId ?? l.produceId) === id && l.served < l.qty);
    const target = active.find((c) => c.uid === selectedUid) ?? active.find(wants) ?? active[0];

    const price = effectiveUnitPrice(priceOf(state.prices, id), slot.age);
    const isOnStall = (pid: string) => useGameStore.getState().stall.some((s) => s?.produceId === pid);
    const res = serveProduct(target, id, price, slot.age, isOnStall, state.upgrades);

    if (res.kind === 'notWanted') {
      say(target.uid, 'Non merci, juste ma liste 🙂');
      haptic('soft');
    } else if (res.kind === 'tooExpensive') {
      updateCustomer(target.uid, { lines: res.customer.lines });
      say(target.uid, 'Un peu cher pour moi… tant pis !');
      haptic('soft');
    } else {
      state.sellUnit(slotIndex);
      updateCustomer(target.uid, { ...res.customer, arrivedAt: sim.current.time });
      if (res.kind === 'substitute') say(target.uid, 'Oh, pourquoi pas ! 😊');
      playSfx('pop', 0.5);
      haptic('light');
    }
    setNotice(null);
    redraw();
  };

  const onCheckout = (uid: number) => {
    const c = sim.current.customers.find((x) => x.uid === uid);
    if (c && !c.leaving) doCheckout(c);
  };

  const close = () => {
    const state = useGameStore.getState();
    for (const c of sim.current.customers) {
      if (c.leaving) continue;
      if (c.units > 0)
        state.completeSale(c, checkout(c, state.today.attractiveness, state.upgrades, rng, tipBonus(state)));
      else state.customerLeft();
    }
    sim.current.customers = [];
    state.closeStall();
    router.replace('/summary');
  };

  const progress = Math.min(1, view.time / CONFIG.marketDuration);
  const cardWidth = (width - 32 - 2 * spacing.sm) / 3;
  const remaining = Math.max(0, schedule.length - view.spawned);

  return (
    <Screen>
      <TopBar title="Jour de marché" />
      <Sky progress={progress} width={width} height={86}>
        <View style={styles.clock}>
          <T style={styles.clockText}>🕘 {clockLabel(progress)}</T>
        </View>
      </Sky>

      <View style={styles.street}>
        {view.customers.length === 0 && !ended && (
          <Animated.View entering={FadeIn.delay(400)} style={styles.emptyStreet}>
            <T style={styles.soft}>🐦 Le marché est calme… les passants arrivent tranquillement.</T>
          </Animated.View>
        )}
        {view.customers.map((c) => (
          <Animated.View
            key={c.uid}
            entering={FadeInRight.springify().damping(16)}
            exiting={FadeOutLeft.duration(500)}
            layout={LinearTransition}>
            <CustomerCard
              customer={c}
              width={cardWidth}
              selected={selectedUid === c.uid}
              onSelect={() => setSelectedUid((s) => (s === c.uid ? null : c.uid))}
              onCheckout={() => onCheckout(c.uid)}
            />
          </Animated.View>
        ))}
      </View>

      <View style={{ alignItems: 'center' }}>
        <Awning width={cols * slotSize + (cols - 1) * GAP + 16} stripes={9} />
        <StallGrid
          stall={stall}
          cols={cols}
          slotSize={slotSize}
          gap={GAP}
          capacity={capacity}
          prices={(lot) => effectiveUnitPrice(priceOf(prices, lot.produceId), lot.age)}
          onSlotPress={onSlotPress}
        />
        <View style={styles.floaters}>
          {floaters.map((f) => (
            <Animated.View
              key={f.id}
              entering={ZoomIn.springify()}
              exiting={FadeOutUp.duration(500)}
              style={styles.floater}>
              <T style={styles.floaterText}>{f.text}</T>
            </Animated.View>
          ))}
        </View>
      </View>

      <T style={styles.notice}>
        {notice ?? 'Touche un produit pour le donner au client (touche un client pour le choisir).'}
      </T>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <T style={styles.bold}>Recette : {formatCoins(today.revenue + today.tips)} 🪙</T>
          <T style={styles.soft}>
            {today.served} client{today.served > 1 ? 's' : ''} servi{today.served > 1 ? 's' : ''} · {remaining} à venir
          </T>
        </View>
        <PillButton small variant="secondary" label="Fermer l’étal 🌙" onPress={close} />
      </View>

      {ended && (
        <Animated.View entering={FadeIn.duration(600)} style={styles.overlay}>
          <Card style={styles.endCard}>
            <T style={{ fontSize: 44 }}>🌅</T>
            <T style={styles.endTitle}>Le soleil se couche sur le marché</T>
            <T style={styles.soft}>Les derniers passants rentrent chez eux. Belle journée !</T>
            <PillButton label="Ranger et voir le récap" onPress={close} style={{ marginTop: spacing.md }} />
          </Card>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clock: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  clockText: { fontWeight: '800', fontSize: 13 },
  street: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 178,
    backgroundColor: '#EFE2CC',
    alignItems: 'flex-start',
  },
  emptyStreet: { flex: 1, alignSelf: 'center', alignItems: 'center' },
  floaters: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center', gap: 4, pointerEvents: 'none' },
  floater: {
    backgroundColor: colors.honey,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  floaterText: { fontWeight: '800' },
  notice: { textAlign: 'center', fontSize: 12, color: colors.textSoft, paddingHorizontal: spacing.lg, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginTop: 'auto' },
  bold: { fontWeight: '800' },
  soft: { color: colors.textSoft, fontSize: 13, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  endCard: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  endTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONFIG } from '@/game/config';
import { getProduce, UNITS_PER_CRATE } from '@/game/data/produce';
import {
  COIN_BUNDLES,
  getCosmetic,
  getIapProduct,
  PASS_XP,
  SUBSCRIBER_DAILY_HONEY,
  type Reward,
} from '@/game/data/monetization';
import { getUpgrade } from '@/game/data/upgrades';
import { reputationLevel, seasonForDay } from '@/game/logic/calendar';
import { updateRegulars, type CheckoutResult } from '@/game/logic/customers';
import { round1, suggestedPrice } from '@/game/logic/economy';
import {
  addToStock,
  ageLeftovers,
  clearSlot,
  placeLot,
  resizeStall,
  slotCapacity,
  stallRows,
  takeFromSlot,
} from '@/game/logic/stall';
import {
  applyQuestEvent,
  claimDaily as claimDailyReward,
  claimPass,
  dateKey,
  ensurePassSeason,
  generateQuests,
  grantPurchase,
  isQuestDone,
  isSubscriber,
  newPass,
  type DailyState,
  type Entitlements,
  type PassState,
  type PurchaseRecord,
  type Quest,
  type QuestEvent,
} from '@/game/logic/meta';
import type { Customer, DayStats, Lot, Phase, Regular, Settings, Slot } from '@/game/types';

export type CartLine = { produceId: string; crates: number; unitPrice: number };

type GameState = {
  day: number;
  coins: number;
  reputation: number;
  phase: Phase;
  stock: Lot[];
  stall: Slot[];
  prices: Record<string, number>;
  upgrades: string[];
  collection: string[];
  regulars: Record<string, Regular>;
  today: DayStats;
  settings: Settings;
  // --- Méta-jeu et achats (conservés lors d'une nouvelle partie) ---
  honey: number;
  cosmetics: string[];
  awning: string;
  daily: DailyState;
  quests: { date: string; list: Quest[] };
  pass: PassState;
  entitlements: Entitlements;
  purchaseHistory: PurchaseRecord[];
  spendingLimit: number | null;
  /** Dernier jour réel où le bonus quotidien d'abonné·e a été versé. */
  subscriberBonusDate: string | null;
};

export type PurchaseGrant = { reward: Reward; cosmetics: string[]; doubled: boolean };

type GameActions = {
  startDay: () => void;
  buyCrates: (cart: CartLine[]) => void;
  placeLot: (lotIndex: number, slotIndex: number) => number;
  clearSlot: (slotIndex: number) => void;
  setPrice: (produceId: string, price: number) => void;
  openStall: (attractiveness: number) => void;
  sellUnit: (slotIndex: number) => void;
  completeSale: (customer: Customer, result: CheckoutResult) => { newRegular: boolean };
  customerLeft: () => void;
  closeStall: () => void;
  nextDay: () => void;
  buyUpgrade: (id: string) => boolean;
  toggleSetting: (key: keyof Settings) => void;
  resetGame: () => void;
  refreshMeta: (now: Date) => void;
  claimDaily: (now: Date) => Reward | null;
  claimSubscriberBonus: (now: Date) => number;
  claimQuest: (id: string) => Reward | null;
  claimPassRewards: () => { reward: Reward; cosmetics: string[] };
  applyPurchase: (productId: string, now: Date) => PurchaseGrant;
  buyCosmetic: (id: string) => boolean;
  equipCosmetic: (id: string) => void;
  convertHoney: (bundleId: string) => boolean;
  setSpendingLimit: (limit: number | null) => void;
};

export const emptyStats = (): DayStats => ({
  revenue: 0,
  tips: 0,
  spent: 0,
  served: 0,
  happy: 0,
  leftSmiling: 0,
  starsEarned: 0,
  sold: {},
  newInCollection: [],
  newRegulars: [],
  antiGaspiUnits: 0,
  antiGaspiRevenue: 0,
  attractiveness: 0,
  passXp: 0,
});

type MetaState = Pick<
  GameState,
  | 'honey'
  | 'cosmetics'
  | 'awning'
  | 'daily'
  | 'quests'
  | 'pass'
  | 'entitlements'
  | 'purchaseHistory'
  | 'spendingLimit'
  | 'subscriberBonusDate'
>;

const initialMeta = (): MetaState => ({
  honey: 0,
  cosmetics: ['awning_classic'],
  awning: 'awning_classic',
  daily: { lastClaim: null, claimed: 0 },
  quests: { date: '', list: [] },
  pass: newPass(0),
  entitlements: { firstPackBonusUsed: false, starterBought: false, subscriptionUntil: null, passPremium: false },
  purchaseHistory: [],
  spendingLimit: null,
  subscriberBonusDate: null,
});

/** Applique une récompense (pièces, miel, XP du Carnet) à l'état. */
function withReward(s: GameState, r: Reward, cosmetics: string[] = []): Partial<GameState> {
  const owned = [...s.cosmetics, ...cosmetics.filter((c) => !s.cosmetics.includes(c))];
  return {
    coins: round1(s.coins + (r.coins ?? 0)),
    honey: s.honey + (r.honey ?? 0),
    pass: r.passXp ? { ...s.pass, xp: s.pass.xp + r.passXp } : s.pass,
    cosmetics: owned,
  };
}

function withQuestEvent(s: GameState, event: QuestEvent): Pick<GameState, 'quests'> {
  return { quests: { ...s.quests, list: applyQuestEvent(s.quests.list, event) } };
}

const initialState = (): GameState => ({
  day: 1,
  coins: CONFIG.startCoins,
  reputation: 0,
  phase: 'home',
  stock: [],
  stall: Array<Slot>(CONFIG.baseRows * CONFIG.stallCols).fill(null),
  prices: {},
  upgrades: [],
  collection: [],
  regulars: {},
  today: emptyStats(),
  settings: { music: true, sfx: true, haptics: true },
  ...initialMeta(),
});

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      startDay: () =>
        set((s) => ({
          phase: 'buying',
          today: emptyStats(),
          stall: resizeStall(s.stall, stallRows(s.upgrades) * CONFIG.stallCols),
        })),

      buyCrates: (cart) =>
        set((s) => {
          let stock = s.stock;
          let cost = 0;
          for (const line of cart) {
            if (line.crates <= 0) continue;
            cost += line.crates * UNITS_PER_CRATE * line.unitPrice;
            stock = addToStock(stock, { produceId: line.produceId, qty: line.crates * UNITS_PER_CRATE, age: 0 });
          }
          cost = round1(cost);
          if (cost > s.coins + 0.001) return {};
          return {
            stock,
            coins: round1(s.coins - cost),
            phase: 'arranging',
            today: { ...s.today, spent: round1(s.today.spent + cost) },
          };
        }),

      placeLot: (lotIndex, slotIndex) => {
        const s = get();
        const res = placeLot(s.stock, s.stall, lotIndex, slotIndex, slotCapacity(s.upgrades));
        if (res.moved > 0) set({ stock: res.stock, stall: res.stall });
        return res.moved;
      },

      clearSlot: (slotIndex) => set((s) => clearSlot(s.stock, s.stall, slotIndex)),

      setPrice: (produceId, price) =>
        set((s) => ({ prices: { ...s.prices, [produceId]: Math.max(0.1, round1(price)) } })),

      openStall: (attractiveness) =>
        set((s) => ({
          phase: 'selling',
          today: { ...s.today, attractiveness },
          ...withQuestEvent(s, { type: 'attractiveness', value: attractiveness }),
        })),

      sellUnit: (slotIndex) => set((s) => ({ stall: takeFromSlot(s.stall, slotIndex, 1) })),

      completeSale: (customer, result) => {
        let newRegular = false;
        set((s) => {
          if (customer.units === 0) {
            return { today: { ...s.today, leftSmiling: s.today.leftSmiling + 1 } };
          }
          const sold = { ...s.today.sold };
          const newIds: string[] = [];
          for (const [id, n] of Object.entries(customer.bought)) {
            sold[id] = (sold[id] ?? 0) + n;
            if (!s.collection.includes(id) && !newIds.includes(id)) newIds.push(id);
          }
          const reg = updateRegulars(s.regulars, customer, result.stars, Math.random);
          newRegular = reg.isNew;
          const xp = PASS_XP.perCustomer + result.stars * PASS_XP.perStar;
          return {
            ...withQuestEvent(s, {
              type: 'serve',
              happy: result.stars === 3,
              sold: customer.bought,
              revenue: result.total,
            }),
            pass: { ...s.pass, xp: s.pass.xp + xp },
            coins: round1(s.coins + result.total),
            reputation: s.reputation + result.stars,
            collection: [...s.collection, ...newIds],
            regulars: reg.regulars,
            today: {
              ...s.today,
              revenue: round1(s.today.revenue + customer.bill),
              tips: round1(s.today.tips + result.tip),
              served: s.today.served + 1,
              happy: s.today.happy + (result.stars === 3 ? 1 : 0),
              starsEarned: s.today.starsEarned + result.stars,
              sold,
              newInCollection: [...s.today.newInCollection, ...newIds],
              newRegulars: reg.isNew ? [...s.today.newRegulars, customer.name] : s.today.newRegulars,
              passXp: (s.today.passXp ?? 0) + xp,
            },
          };
        });
        return { newRegular };
      },

      customerLeft: () => set((s) => ({ today: { ...s.today, leftSmiling: s.today.leftSmiling + 1 } })),

      closeStall: () =>
        set((s) => {
          const aged = ageLeftovers(s.stock, s.stall);
          return {
            phase: 'summary',
            stock: aged.stock,
            stall: aged.stall,
            coins: round1(s.coins + aged.antiGaspiRevenue),
            pass: { ...s.pass, xp: s.pass.xp + PASS_XP.perDay },
            ...withQuestEvent(s, { type: 'day' }),
            today: {
              ...s.today,
              antiGaspiUnits: aged.antiGaspiUnits,
              antiGaspiRevenue: aged.antiGaspiRevenue,
              passXp: (s.today.passXp ?? 0) + PASS_XP.perDay,
            },
          };
        }),

      nextDay: () => set((s) => ({ day: s.day + 1, phase: 'home' })),

      buyUpgrade: (id) => {
        const s = get();
        const upgrade = getUpgrade(id);
        if (s.upgrades.includes(id) || s.coins < upgrade.cost) return false;
        const upgrades = [...s.upgrades, id];
        set({
          coins: round1(s.coins - upgrade.cost),
          upgrades,
          stall: resizeStall(s.stall, stallRows(upgrades) * CONFIG.stallCols),
        });
        return true;
      },

      toggleSetting: (key) => set((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } })),

      resetGame: () =>
        set((s) => {
          // Les achats, le miel et les cosmétiques appartiennent au joueur : on les garde.
          const { settings, honey, cosmetics, awning, daily, quests, entitlements, purchaseHistory } = s;
          return {
            ...initialState(),
            settings,
            honey,
            cosmetics,
            awning,
            daily,
            quests,
            entitlements,
            purchaseHistory,
            spendingLimit: s.spendingLimit,
            subscriberBonusDate: s.subscriberBonusDate,
            pass: { ...newPass(0), premium: s.pass.premium && s.pass.season === 0 },
          };
        }),

      refreshMeta: (now) =>
        set((s) => {
          const today = dateKey(now);
          const pass = ensurePassSeason(s.pass, s.day);
          const quests =
            s.quests.date === today
              ? s.quests
              : { date: today, list: generateQuests(today, seasonForDay(s.day), reputationLevel(s.reputation)) };
          return {
            quests,
            pass,
            // Le Carnet premium est lié à une saison : il se rachète à la saison suivante.
            entitlements: pass === s.pass ? s.entitlements : { ...s.entitlements, passPremium: false },
          };
        }),

      claimDaily: (now) => {
        const s = get();
        const res = claimDailyReward(
          s.daily,
          dateKey(now),
          isSubscriber(s.entitlements.subscriptionUntil, now.getTime()),
        );
        if (!res) return null;
        set({ daily: res.daily, ...withReward(s, res.reward) });
        return res.reward;
      },

      claimSubscriberBonus: (now) => {
        const s = get();
        const today = dateKey(now);
        if (!isSubscriber(s.entitlements.subscriptionUntil, now.getTime()) || s.subscriberBonusDate === today) return 0;
        set({ honey: s.honey + SUBSCRIBER_DAILY_HONEY, subscriberBonusDate: today });
        return SUBSCRIBER_DAILY_HONEY;
      },

      claimQuest: (id) => {
        const s = get();
        const quest = s.quests.list.find((q) => q.id === id);
        if (!quest || quest.claimed || !isQuestDone(quest)) return null;
        set({
          ...withReward(s, quest.reward),
          quests: { ...s.quests, list: s.quests.list.map((q) => (q.id === id ? { ...q, claimed: true } : q)) },
        });
        return quest.reward;
      },

      claimPassRewards: () => {
        const s = get();
        const res = claimPass(s.pass);
        set({ ...withReward({ ...s, pass: res.pass }, res.reward, res.cosmetics), pass: res.pass });
        return { reward: res.reward, cosmetics: res.cosmetics };
      },

      applyPurchase: (productId, now) => {
        const s = get();
        const res = grantPurchase(s.entitlements, productId, now.getTime());
        const record = { productId, at: now.getTime(), priceEur: getIapProductPrice(productId) };
        set({
          ...withReward(s, res.reward, res.cosmetics),
          entitlements: res.entitlements,
          pass: res.entitlements.passPremium ? { ...s.pass, premium: true } : s.pass,
          purchaseHistory: [...s.purchaseHistory, record],
        });
        return { reward: res.reward, cosmetics: res.cosmetics, doubled: res.doubled };
      },

      buyCosmetic: (id) => {
        const s = get();
        const c = getCosmetic(id);
        if (s.cosmetics.includes(id) || c.honeyPrice === null || s.honey < c.honeyPrice) return false;
        set({ honey: s.honey - c.honeyPrice, cosmetics: [...s.cosmetics, id], awning: id });
        return true;
      },

      equipCosmetic: (id) => set((s) => (s.cosmetics.includes(id) ? { awning: id } : {})),

      convertHoney: (bundleId) => {
        const s = get();
        const b = COIN_BUNDLES.find((x) => x.id === bundleId);
        if (!b || s.honey < b.honey) return false;
        set({ honey: s.honey - b.honey, coins: round1(s.coins + b.coins) });
        return true;
      },

      setSpendingLimit: (limit) => set({ spendingLimit: limit }),
    }),
    {
      name: 'petit-etal-save',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

function getIapProductPrice(productId: string): number {
  return getIapProduct(productId).priceEur;
}

/** Prix de vente choisi par le joueur, ou prix conseillé par défaut. */
export function priceOf(prices: Record<string, number>, produceId: string): number {
  return prices[produceId] ?? suggestedPrice(getProduce(produceId));
}

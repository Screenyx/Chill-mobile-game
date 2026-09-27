import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONFIG } from '@/game/config';
import { getProduce, UNITS_PER_CRATE } from '@/game/data/produce';
import { getUpgrade } from '@/game/data/upgrades';
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
};

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
});

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

      openStall: (attractiveness) => set((s) => ({ phase: 'selling', today: { ...s.today, attractiveness } })),

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
          return {
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
            today: { ...s.today, antiGaspiUnits: aged.antiGaspiUnits, antiGaspiRevenue: aged.antiGaspiRevenue },
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

      resetGame: () => set({ ...initialState(), settings: get().settings }),
    }),
    {
      name: 'petit-etal-save',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Prix de vente choisi par le joueur, ou prix conseillé par défaut. */
export function priceOf(prices: Record<string, number>, produceId: string): number {
  return prices[produceId] ?? suggestedPrice(getProduce(produceId));
}

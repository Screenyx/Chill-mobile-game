import { CONFIG } from '../config';
import { getProduce } from '../data/produce';
import { getUpgrade } from '../data/upgrades';
import type { ColorFamily, Lot, Season, Slot } from '../types';
import { round1 } from './economy';

export function stallRows(upgrades: string[]): number {
  return CONFIG.baseRows + (upgrades.includes('extraRow') ? 1 : 0);
}

export function slotCapacity(upgrades: string[]): number {
  return upgrades.includes('bigCrates') ? CONFIG.bigSlotCapacity : CONFIG.slotCapacity;
}

/** Ajoute un lot à la réserve en fusionnant avec un lot identique (même produit, même fraîcheur). */
export function addToStock(stock: Lot[], lot: Lot): Lot[] {
  if (lot.qty <= 0) return stock;
  const idx = stock.findIndex((l) => l.produceId === lot.produceId && l.age === lot.age);
  if (idx === -1) return [...stock, { ...lot }];
  return stock.map((l, i) => (i === idx ? { ...l, qty: l.qty + lot.qty } : l));
}

/**
 * Pose un lot de la réserve sur un emplacement de l'étal. L'emplacement doit être vide
 * ou contenir le même produit avec la même fraîcheur. Seule la quantité qui tient est déplacée.
 */
export function placeLot(
  stock: Lot[],
  stall: Slot[],
  lotIndex: number,
  slotIndex: number,
  capacity: number,
): { stock: Lot[]; stall: Slot[]; moved: number } {
  const lot = stock[lotIndex];
  const slot = stall[slotIndex];
  if (!lot || slotIndex < 0 || slotIndex >= stall.length) return { stock, stall, moved: 0 };
  if (slot && (slot.produceId !== lot.produceId || slot.age !== lot.age)) {
    return { stock, stall, moved: 0 };
  }
  const current = slot?.qty ?? 0;
  const moved = Math.min(lot.qty, capacity - current);
  if (moved <= 0) return { stock, stall, moved: 0 };

  const newStall = [...stall];
  newStall[slotIndex] = { produceId: lot.produceId, age: lot.age, qty: current + moved };
  const newStock = stock.map((l, i) => (i === lotIndex ? { ...l, qty: l.qty - moved } : l)).filter((l) => l.qty > 0);
  return { stock: newStock, stall: newStall, moved };
}

/** Remet le contenu d'un emplacement dans la réserve. */
export function clearSlot(stock: Lot[], stall: Slot[], slotIndex: number): { stock: Lot[]; stall: Slot[] } {
  const slot = stall[slotIndex];
  if (!slot) return { stock, stall };
  const newStall = [...stall];
  newStall[slotIndex] = null;
  return { stock: addToStock(stock, slot), stall: newStall };
}

/** Retire `n` unités d'un emplacement (vente). */
export function takeFromSlot(stall: Slot[], slotIndex: number, n: number): Slot[] {
  const slot = stall[slotIndex];
  if (!slot) return stall;
  const qty = slot.qty - n;
  const newStall = [...stall];
  newStall[slotIndex] = qty > 0 ? { ...slot, qty } : null;
  return newStall;
}

/** Redimensionne l'étal (ex. après l'achat d'une rangée) en conservant son contenu. */
export function resizeStall(stall: Slot[], size: number): Slot[] {
  if (stall.length >= size) return stall;
  return [...stall, ...Array<Slot>(size - stall.length).fill(null)];
}

const COMPLEMENTS: [ColorFamily, ColorFamily][] = [
  ['red', 'green'],
  ['orange', 'purple'],
  ['yellow', 'purple'],
  ['orange', 'green'],
  ['yellow', 'red'],
];

export function colorsAreComplementary(a: ColorFamily, b: ColorFamily): boolean {
  return COMPLEMENTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Un produit est « de saison » s'il est disponible pendant la saison sans l'être toute l'année. */
export function isInSeason(produceId: string, season: Season): boolean {
  const p = getProduce(produceId);
  return p.seasons.includes(season) && p.seasons.length < 4;
}

export type Attractiveness = {
  /** Score total sur 100. */
  score: number;
  fill: number;
  harmony: number;
  seasonal: number;
  variety: number;
  deco: number;
  /** Paires d'emplacements voisins aux couleurs complémentaires (pour les petites étincelles). */
  harmonyPairs: [number, number][];
};

/**
 * Attractivité de l'étal. Tout est bonus : un étal simple reste tout à fait correct.
 *  - remplissage (40 pts), harmonie des couleurs voisines (30 pts),
 *  - produits de saison sur la rangée de devant (20 pts), variété (10 pts),
 *  - décorations achetées (bonus en plus, plafonné à 100 au total).
 */
export function computeAttractiveness(
  stall: Slot[],
  cols: number,
  capacity: number,
  season: Season,
  upgrades: string[],
): Attractiveness {
  const total = stall.length;
  const filled = stall.filter((s): s is Lot => !!s);
  const units = filled.reduce((sum, s) => sum + s.qty, 0);
  const fillRatio = total === 0 ? 0 : (filled.length / total) * 0.7 + (units / (total * capacity)) * 0.3;

  let harmonyPoints = 0;
  let pairCount = 0;
  const harmonyPairs: [number, number][] = [];
  for (let i = 0; i < total; i++) {
    const a = stall[i];
    if (!a) continue;
    const neighbours = [(i + 1) % cols !== 0 ? i + 1 : -1, i + cols];
    for (const j of neighbours) {
      const b = j >= 0 && j < total ? stall[j] : null;
      if (!b) continue;
      pairCount++;
      if (a.produceId === b.produceId) continue;
      const ca = getProduce(a.produceId).color;
      const cb = getProduce(b.produceId).color;
      if (colorsAreComplementary(ca, cb)) {
        harmonyPoints += 2;
        harmonyPairs.push([i, j]);
      } else if (ca !== cb) {
        harmonyPoints += 1;
      }
    }
  }
  const harmonyRatio = pairCount === 0 ? 0 : harmonyPoints / (pairCount * 2);

  const frontRow = stall.slice(0, cols);
  const seasonalRatio = frontRow.filter((s) => s && isInSeason(s.produceId, season)).length / cols;

  const distinct = new Set(filled.map((s) => s.produceId)).size;
  const varietyRatio = Math.min(1, distinct / 6);

  const deco = upgrades.reduce((sum, id) => sum + getUpgrade(id).attractiveness, 0);

  const fill = round1(fillRatio * 40);
  const harmony = round1(harmonyRatio * 30);
  const seasonal = round1(seasonalRatio * 20);
  const variety = round1(varietyRatio * 10);
  const score = Math.min(100, Math.round(fill + harmony + seasonal + variety + deco));
  return { score, fill, harmony, seasonal, variety, deco, harmonyPairs };
}

/**
 * Fin de journée : les invendus vieillissent d'un jour. Ceux de la veille qui n'ont
 * pas trouvé preneur partent en paniers anti-gaspi (rien n'est jeté, on récupère un peu d'argent).
 */
export function ageLeftovers(
  stock: Lot[],
  stall: Slot[],
): {
  stock: Lot[];
  stall: Slot[];
  antiGaspiUnits: number;
  antiGaspiRevenue: number;
} {
  let antiGaspiUnits = 0;
  let antiGaspiRevenue = 0;
  const age = (lot: Lot): Lot | null => {
    if (lot.age >= 1) {
      antiGaspiUnits += lot.qty;
      antiGaspiRevenue += lot.qty * getProduce(lot.produceId).buyPrice * CONFIG.antiGaspiFactor;
      return null;
    }
    return { ...lot, age: lot.age + 1 };
  };
  let newStock: Lot[] = [];
  for (const lot of stock) {
    const aged = age(lot);
    if (aged) newStock = addToStock(newStock, aged);
  }
  const newStall = stall.map((s) => (s ? age(s) : null));
  return { stock: newStock, stall: newStall, antiGaspiUnits, antiGaspiRevenue: round1(antiGaspiRevenue) };
}

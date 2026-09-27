import { CONFIG } from '../config';
import { PRODUCE, UNITS_PER_CRATE } from '../data/produce';
import type { Produce, Season } from '../types';
import { createRng, pick } from './random';

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function formatCoins(n: number): string {
  const r = round1(n);
  return Number.isInteger(r) ? `${r}` : r.toFixed(1).replace('.', ',');
}

export type WholesaleOffer = {
  produce: Produce;
  /** Prix d'une cagette de UNITS_PER_CRATE unités aujourd'hui. */
  cratePrice: number;
  /** Prix unitaire du jour. */
  unitPrice: number;
  isBargain: boolean;
};

/** Produits disponibles au grossiste selon la saison et le niveau de réputation. */
export function availableProduce(season: Season, reputationLevel: number): Produce[] {
  return PRODUCE.filter((p) => p.seasons.includes(season) && p.minReputation <= reputationLevel);
}

/**
 * Offres du grossiste pour une journée : les prix varient doucement (±15 %)
 * et un produit est en « bon plan du jour » (-30 %). Déterministe pour un jour donné.
 */
export function wholesaleOffers(day: number, season: Season, reputationLevel: number): WholesaleOffer[] {
  const rng = createRng(day * 7919 + 17);
  const produce = availableProduce(season, reputationLevel);
  const bargain = produce.length > 0 ? pick(rng, produce).id : null;
  return produce.map((p) => {
    const drift = 0.85 + rng() * 0.3;
    const isBargain = p.id === bargain;
    const unitPrice = round1(p.buyPrice * drift * (isBargain ? 0.7 : 1)) || 0.1;
    return { produce: p, unitPrice, cratePrice: round1(unitPrice * UNITS_PER_CRATE), isBargain };
  });
}

/** Prix de vente conseillé à l'unité. */
export function suggestedPrice(produce: Produce): number {
  return round1(produce.buyPrice * CONFIG.suggestedMargin);
}

/** Prix réellement payé par le client pour une unité, selon la fraîcheur. */
export function effectiveUnitPrice(price: number, age: number): number {
  return round1(age > 0 ? price * CONFIG.dayOldPriceFactor : price);
}

export const FRESHNESS_LABELS = ['Frais du jour', 'Un peu moins frais'];

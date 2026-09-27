import { CONFIG } from '../config';
import { CUSTOMER_TYPES, getCustomerType } from '../data/customers';
import { getProduce } from '../data/produce';
import type { Customer, CustomerType, OrderLine, Produce, Regular, Season, Slot } from '../types';
import { availableProduce, round1, suggestedPrice } from './economy';
import { pick, pickWeighted, randInt, type Rng } from './random';

/** Nombre de clients dans la journée : un bel étal et une bonne réputation attirent du monde. */
export function customerCount(attractiveness: number, repLevel: number, upgrades: string[]): number {
  return 8 + Math.round(attractiveness / 8) + repLevel + (upgrades.includes('bell') ? 2 : 0);
}

/** Heures d'arrivée (en secondes de marché), réparties tranquillement sur la journée. */
export function spawnSchedule(count: number, rng: Rng, duration = CONFIG.marketDuration): number[] {
  const start = 2;
  const end = duration - 25;
  const step = (end - start) / Math.max(1, count);
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    // Le premier client arrive dès l'ouverture, les suivants tranquillement.
    times.push(i === 0 ? start : round1(start + i * step + rng() * step * 0.8));
  }
  return times;
}

export function unlockedCustomerTypes(repLevel: number): CustomerType[] {
  return CUSTOMER_TYPES.filter((t) => t.minReputation <= repLevel);
}

type GenerateContext = {
  uid: number;
  now: number;
  stall: Slot[];
  season: Season;
  repLevel: number;
  regulars: Record<string, Regular>;
};

export function generateCustomer(rng: Rng, ctx: GenerateContext): Customer {
  const type = pick(rng, unlockedCustomerTypes(ctx.repLevel));

  const knownRegulars = Object.values(ctx.regulars).filter((r) => r.typeId === type.id);
  const regular = knownRegulars.length > 0 && rng() < 0.4 ? pick(rng, knownRegulars) : null;
  const name = regular ? regular.name : pick(rng, type.names);

  const onStall = new Set(ctx.stall.filter((s): s is NonNullable<Slot> => !!s).map((s) => s.produceId));
  const stallProduce = [...onStall].map(getProduce);
  const seasonal = availableProduce(ctx.season, ctx.repLevel).filter((p) => !onStall.has(p.id));

  const kindWeight = (p: Produce) => (p.kind === 'fruit' ? type.fruitLove : 1 - type.fruitLove) + 0.1;

  const nbItems = randInt(rng, type.minItems, type.maxItems);
  const chosen: Produce[] = [];
  if (regular && onStall.has(regular.favoriteId)) chosen.push(getProduce(regular.favoriteId));
  let guard = 0;
  while (chosen.length < nbItems && guard++ < 20) {
    // La plupart du temps on demande ce qui est sur l'étal, parfois un produit absent.
    const pool = stallProduce.length > 0 && (rng() < 0.85 || seasonal.length === 0) ? stallProduce : seasonal;
    const candidates = pool.filter((p) => !chosen.includes(p));
    if (candidates.length === 0) continue;
    chosen.push(pickWeighted(rng, candidates, kindWeight));
  }

  const lines: OrderLine[] = chosen.map((p) => ({
    produceId: p.id,
    qty: randInt(rng, type.minQty, type.maxQty),
    served: 0,
  }));

  return {
    uid: ctx.uid,
    typeId: type.id,
    name,
    emoji: type.emoji,
    lines,
    greeting: regular ? `Revoilà ${name} ! On se connaît 💚` : pick(rng, type.greetings),
    isRegular: !!regular,
    arrivedAt: ctx.now,
    patience: type.patience,
    bill: 0,
    units: 0,
    priceRatioTotal: 0,
    dayOldUnits: 0,
    bought: {},
  };
}

/** Rapport entre le prix demandé et le prix que le client trouve juste (1 = parfait). */
export function priceRatio(produceId: string, price: number, typeId: string, upgrades: string[]): number {
  const type = getCustomerType(typeId);
  const tolerance = type.priceTolerance * (upgrades.includes('chalkboards') ? 1.1 : 1);
  return price / (suggestedPrice(getProduce(produceId)) * tolerance);
}

export type ServeResult =
  | { kind: 'served'; customer: Customer }
  | { kind: 'substitute'; customer: Customer }
  | { kind: 'tooExpensive'; customer: Customer }
  | { kind: 'notWanted' };

/**
 * Le joueur donne une unité d'un produit au client.
 * - si le produit est dans la commande : il est ajouté au panier ;
 * - si un produit de la commande manque sur l'étal, le client accepte volontiers
 *   un produit de la même famille (fruit/légume) à la place ;
 * - si le prix est vraiment trop élevé, le client décline gentiment cette ligne.
 */
export function serveProduct(
  customer: Customer,
  produceId: string,
  unitPrice: number,
  age: number,
  isOnStall: (id: string) => boolean,
  upgrades: string[],
): ServeResult {
  let lineIdx = customer.lines.findIndex((l) => (l.substituteId ?? l.produceId) === produceId && l.served < l.qty);
  let kind: 'served' | 'substitute' = 'served';
  if (lineIdx === -1) {
    const kindOf = getProduce(produceId).kind;
    lineIdx = customer.lines.findIndex(
      (l) => l.served === 0 && !l.substituteId && !isOnStall(l.produceId) && getProduce(l.produceId).kind === kindOf,
    );
    kind = 'substitute';
  }
  if (lineIdx === -1) return { kind: 'notWanted' };

  const ratio = priceRatio(produceId, unitPrice, customer.typeId, upgrades);
  if (ratio > 1.6) {
    const lines = customer.lines.map((l, i) => (i === lineIdx ? { ...l, qty: l.served } : l));
    return { kind: 'tooExpensive', customer: { ...customer, lines } };
  }

  const lines = customer.lines.map((l, i) =>
    i === lineIdx
      ? { ...l, served: l.served + 1, substituteId: kind === 'substitute' ? produceId : l.substituteId }
      : l,
  );
  return {
    kind,
    customer: {
      ...customer,
      lines,
      bill: round1(customer.bill + unitPrice),
      units: customer.units + 1,
      priceRatioTotal: customer.priceRatioTotal + ratio,
      dayOldUnits: customer.dayOldUnits + (age > 0 ? 1 : 0),
      bought: { ...customer.bought, [produceId]: (customer.bought[produceId] ?? 0) + 1 },
    },
  };
}

export function isOrderComplete(customer: Customer): boolean {
  return customer.lines.every((l) => l.served >= l.qty);
}

export type CheckoutResult = {
  stars: number;
  tip: number;
  total: number;
  comment: string;
};

const COMMENTS: Record<number, string[]> = {
  0: ['Je repasserai ! 👋', 'Pas grave, bonne journée !', 'À la prochaine !'],
  1: ['Merci, bonne journée !', 'C’est gentil, merci.', 'À bientôt !'],
  2: ['Merci beaucoup !', 'Super, à samedi !', 'Parfait pour ce soir !'],
  3: ['Merveilleux, merci ! 💚', 'Le meilleur étal du marché !', 'Quel régal, à samedi ! ✨'],
};

export function checkout(customer: Customer, attractiveness: number, upgrades: string[], rng: Rng): CheckoutResult {
  if (customer.units === 0) {
    return { stars: 0, tip: 0, total: 0, comment: pick(rng, COMMENTS[0]) };
  }
  const requested = customer.lines.reduce((sum, l) => sum + l.qty, 0);
  const served = customer.lines.reduce((sum, l) => sum + l.served, 0);
  const completeness = requested === 0 ? 1 : served / requested;
  const avgRatio = customer.priceRatioTotal / customer.units;
  const dayOldShare = customer.dayOldUnits / customer.units;

  const score =
    completeness * 1.5 +
    (avgRatio <= 1 ? 1 : avgRatio <= 1.3 ? 0.5 : 0) +
    (attractiveness / 100) * 0.5 -
    dayOldShare * 0.3;
  const stars = score >= 2.4 ? 3 : score >= 1.5 ? 2 : 1;

  const type = getCustomerType(customer.typeId);
  const scaleBonus = upgrades.includes('scale') ? 1.25 : 1;
  const tip = round1(customer.bill * 0.05 * stars * type.tipFactor * scaleBonus);
  return { stars, tip, total: round1(customer.bill + tip), comment: pick(rng, COMMENTS[stars]) };
}

/** Met à jour les habitués après un passage en caisse. */
export function updateRegulars(
  regulars: Record<string, Regular>,
  customer: Customer,
  stars: number,
  rng: Rng,
): { regulars: Record<string, Regular>; isNew: boolean } {
  const favoriteId = Object.entries(customer.bought).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!favoriteId) return { regulars, isNew: false };
  const existing = regulars[customer.name];
  if (existing) {
    return { regulars: { ...regulars, [customer.name]: { ...existing, visits: existing.visits + 1 } }, isNew: false };
  }
  if (stars === 3 && rng() < 0.5) {
    return {
      regulars: {
        ...regulars,
        [customer.name]: { name: customer.name, typeId: customer.typeId, visits: 1, favoriteId },
      },
      isNew: true,
    };
  }
  return { regulars, isNew: false };
}

import { describe, expect, it } from '@jest/globals';

import { CONFIG } from '../../config';
import { PRODUCE, UNITS_PER_CRATE } from '../../data/produce';
import type { Customer, Slot } from '../../types';
import { dayInSeason, reputationLevel, reputationProgress, seasonForDay } from '../calendar';
import {
  checkout,
  customerCount,
  generateCustomer,
  isOrderComplete,
  serveProduct,
  spawnSchedule,
  updateRegulars,
} from '../customers';
import { availableProduce, effectiveUnitPrice, formatCoins, suggestedPrice, wholesaleOffers } from '../economy';
import { createRng } from '../random';
import {
  addToStock,
  ageLeftovers,
  clearSlot,
  colorsAreComplementary,
  computeAttractiveness,
  placeLot,
  resizeStall,
  takeFromSlot,
} from '../stall';

const emptyStall = (n = 12): Slot[] => Array<Slot>(n).fill(null);

const baseCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  uid: 1,
  typeId: 'granny',
  name: 'Jeanne',
  emoji: '👵',
  lines: [{ produceId: 'strawberry', qty: 2, served: 0 }],
  greeting: 'Bonjour',
  isRegular: false,
  arrivedAt: 0,
  patience: 90,
  bill: 0,
  units: 0,
  priceRatioTotal: 0,
  dayOldUnits: 0,
  bought: {},
  ...overrides,
});

describe('données', () => {
  it('a au moins 12 produits avec des ids uniques', () => {
    expect(PRODUCE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(PRODUCE.map((p) => p.id)).size).toBe(PRODUCE.length);
  });

  it('propose des produits pour chaque saison', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      expect(availableProduce(s, 1).length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('calendrier', () => {
  it('fait tourner les saisons tous les 7 jours', () => {
    expect(seasonForDay(1)).toBe('spring');
    expect(seasonForDay(7)).toBe('spring');
    expect(seasonForDay(8)).toBe('summer');
    expect(seasonForDay(22)).toBe('winter');
    expect(seasonForDay(29)).toBe('spring');
    expect(dayInSeason(9)).toBe(2);
  });

  it('calcule le niveau de réputation', () => {
    expect(reputationLevel(0)).toBe(1);
    expect(reputationLevel(15)).toBe(2);
    expect(reputationLevel(10_000)).toBe(CONFIG.reputationThresholds.length);
    expect(reputationProgress(0)).toBe(0);
    expect(reputationProgress(10_000)).toBe(1);
  });
});

describe('économie', () => {
  it('donne des prix stables pour un même jour et un seul bon plan', () => {
    const a = wholesaleOffers(3, 'spring', 1);
    const b = wholesaleOffers(3, 'spring', 1);
    expect(a).toEqual(b);
    expect(a.filter((o) => o.isBargain)).toHaveLength(1);
    for (const o of a) {
      expect(o.cratePrice).toBeCloseTo(o.unitPrice * UNITS_PER_CRATE, 5);
      expect(o.unitPrice).toBeGreaterThan(0);
    }
  });

  it('cache les produits rares tant que la réputation est basse', () => {
    const ids = wholesaleOffers(1, 'spring', 1).map((o) => o.produce.id);
    expect(ids).not.toContain('mango');
    expect(wholesaleOffers(1, 'spring', 4).map((o) => o.produce.id)).toContain('mango');
  });

  it('applique une réduction aux produits de la veille', () => {
    expect(effectiveUnitPrice(2, 0)).toBe(2);
    expect(effectiveUnitPrice(2, 1)).toBe(1.6);
  });

  it('formate les pièces à la française', () => {
    expect(formatCoins(12)).toBe('12');
    expect(formatCoins(2.45)).toBe('2,5');
  });
});

describe('étal', () => {
  it('fusionne les lots identiques en réserve', () => {
    let stock = addToStock([], { produceId: 'apple', qty: 6, age: 0 });
    stock = addToStock(stock, { produceId: 'apple', qty: 6, age: 0 });
    stock = addToStock(stock, { produceId: 'apple', qty: 3, age: 1 });
    expect(stock).toEqual([
      { produceId: 'apple', qty: 12, age: 0 },
      { produceId: 'apple', qty: 3, age: 1 },
    ]);
  });

  it('pose un lot en respectant la capacité', () => {
    const stock = [{ produceId: 'apple', qty: 18, age: 0 }];
    const res = placeLot(stock, emptyStall(), 0, 2, 12);
    expect(res.moved).toBe(12);
    expect(res.stall[2]).toEqual({ produceId: 'apple', qty: 12, age: 0 });
    expect(res.stock).toEqual([{ produceId: 'apple', qty: 6, age: 0 }]);
  });

  it('refuse de mélanger deux produits dans une cagette', () => {
    const stall = emptyStall();
    stall[0] = { produceId: 'pear', qty: 3, age: 0 };
    const res = placeLot([{ produceId: 'apple', qty: 6, age: 0 }], stall, 0, 0, 12);
    expect(res.moved).toBe(0);
  });

  it('remet une cagette en réserve et vend à l’unité', () => {
    const stall = emptyStall();
    stall[1] = { produceId: 'pear', qty: 1, age: 0 };
    expect(takeFromSlot(stall, 1, 1)[1]).toBeNull();
    const res = clearSlot([], stall, 1);
    expect(res.stall[1]).toBeNull();
    expect(res.stock).toEqual([{ produceId: 'pear', qty: 1, age: 0 }]);
    expect(resizeStall(stall, 16)).toHaveLength(16);
  });

  it('récompense les couleurs complémentaires et les produits de saison', () => {
    expect(colorsAreComplementary('red', 'green')).toBe(true);
    expect(colorsAreComplementary('red', 'red')).toBe(false);

    const harmonious = emptyStall();
    harmonious[0] = { produceId: 'strawberry', qty: 12, age: 0 }; // rouge, printemps
    harmonious[1] = { produceId: 'peas', qty: 12, age: 0 }; // vert, printemps
    const plain = emptyStall();
    plain[0] = { produceId: 'potato', qty: 12, age: 0 };
    plain[1] = { produceId: 'onion', qty: 12, age: 0 };

    const a = computeAttractiveness(harmonious, 4, 12, 'spring', []);
    const b = computeAttractiveness(plain, 4, 12, 'spring', []);
    expect(a.harmony).toBeGreaterThan(b.harmony);
    expect(a.seasonal).toBeGreaterThan(b.seasonal);
    expect(a.harmonyPairs).toEqual([[0, 1]]);
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('ne dépasse jamais 100 d’attractivité', () => {
    const ids = ['strawberry', 'peas', 'cherry', 'lettuce'];
    const stall: Slot[] = Array.from({ length: 12 }, (_, i) => ({ produceId: ids[i % 4], qty: 12, age: 0 }));
    const all = ['flowers', 'tablecloth', 'chalkboards', 'parasol', 'bell', 'scale'];
    expect(computeAttractiveness(stall, 4, 12, 'spring', all).score).toBeLessThanOrEqual(100);
  });

  it('fait vieillir les invendus puis les transforme en paniers anti-gaspi', () => {
    const stall = emptyStall();
    stall[0] = { produceId: 'apple', qty: 4, age: 0 };
    stall[1] = { produceId: 'pear', qty: 2, age: 1 };
    const res = ageLeftovers([{ produceId: 'kiwi', qty: 6, age: 1 }], stall);
    expect(res.stall[0]).toEqual({ produceId: 'apple', qty: 4, age: 1 });
    expect(res.stall[1]).toBeNull();
    expect(res.stock).toEqual([]);
    expect(res.antiGaspiUnits).toBe(8);
    expect(res.antiGaspiRevenue).toBeGreaterThan(0);
  });
});

describe('clients', () => {
  it('attire plus de clients avec un bel étal', () => {
    expect(customerCount(80, 1, [])).toBeGreaterThan(customerCount(20, 1, []));
    expect(customerCount(50, 1, ['bell'])).toBeGreaterThan(customerCount(50, 1, []));
  });

  it('répartit les arrivées dans la journée', () => {
    const times = spawnSchedule(10, createRng(1), 240);
    expect(times).toHaveLength(10);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[times.length - 1]).toBeLessThan(240);
  });

  it('génère des commandes basées surtout sur l’étal', () => {
    const stall = emptyStall();
    stall[0] = { produceId: 'strawberry', qty: 12, age: 0 };
    stall[1] = { produceId: 'carrot', qty: 12, age: 0 };
    const rng = createRng(42);
    let fromStall = 0;
    let total = 0;
    for (let i = 0; i < 50; i++) {
      const c = generateCustomer(rng, { uid: i, now: 0, stall, season: 'spring', repLevel: 1, regulars: {} });
      expect(c.lines.length).toBeGreaterThan(0);
      for (const l of c.lines) {
        total++;
        if (l.produceId === 'strawberry' || l.produceId === 'carrot') fromStall++;
        expect(l.qty).toBeGreaterThan(0);
      }
    }
    expect(fromStall / total).toBeGreaterThan(0.6);
  });

  it('sert, propose un remplacement, ou décline gentiment si trop cher', () => {
    const onStall = (id: string) => id !== 'cherry';
    const c = baseCustomer({
      lines: [
        { produceId: 'strawberry', qty: 1, served: 0 },
        { produceId: 'cherry', qty: 1, served: 0 },
      ],
    });
    const r1 = serveProduct(c, 'strawberry', 2.4, 0, onStall, []);
    expect(r1.kind).toBe('served');
    if (r1.kind !== 'served') return;
    expect(r1.customer.bill).toBe(2.4);

    const r2 = serveProduct(r1.customer, 'peach', 2.2, 0, onStall, []);
    expect(r2.kind).toBe('substitute');
    if (r2.kind !== 'substitute') return;
    expect(isOrderComplete(r2.customer)).toBe(true);

    expect(serveProduct(r2.customer, 'carrot', 1, 0, onStall, []).kind).toBe('notWanted');

    const r3 = serveProduct(baseCustomer(), 'strawberry', 10, 0, onStall, []);
    expect(r3.kind).toBe('tooExpensive');
    if (r3.kind === 'tooExpensive') expect(isOrderComplete(r3.customer)).toBe(true);
  });

  it('donne 3 étoiles à une commande complète au juste prix', () => {
    const price = suggestedPrice(PRODUCE[0]);
    let c = baseCustomer();
    for (let i = 0; i < 2; i++) {
      const r = serveProduct(c, 'strawberry', price, 0, () => true, []);
      if (r.kind === 'served') c = r.customer;
    }
    const result = checkout(c, 70, [], createRng(1));
    expect(result.stars).toBe(3);
    expect(result.tip).toBeGreaterThan(0);
    expect(result.total).toBeCloseTo(c.bill + result.tip, 5);
  });

  it('ne pénalise pas un client parti sans rien', () => {
    const result = checkout(baseCustomer(), 50, [], createRng(1));
    expect(result).toMatchObject({ stars: 0, total: 0 });
  });

  it('fidélise les clients ravis', () => {
    const c = baseCustomer({ bought: { strawberry: 2 }, units: 2 });
    const res = updateRegulars({}, c, 3, () => 0);
    expect(res.isNew).toBe(true);
    expect(res.regulars.Jeanne.favoriteId).toBe('strawberry');
    const again = updateRegulars(res.regulars, c, 1, () => 0);
    expect(again.regulars.Jeanne.visits).toBe(2);
  });
});

import { describe, expect, it } from '@jest/globals';

import { DAILY_REWARDS, PASS_TIERS, PASS_XP_PER_TIER, QUESTS_PER_DAY } from '../../data/monetization';
import {
  applyQuestEvent,
  canClaimDaily,
  claimDaily,
  claimPass,
  dateKey,
  ensurePassSeason,
  featuredOfferId,
  generateQuests,
  grantPurchase,
  isQuestDone,
  isSubscriber,
  newPass,
  passClaimable,
  passTier,
  spentThisMonth,
  withinSpendingLimit,
  type Entitlements,
} from '../meta';

const noEntitlements: Entitlements = {
  firstPackBonusUsed: false,
  starterBought: false,
  subscriptionUntil: null,
  passPremium: false,
};

describe('calendrier de connexion', () => {
  it('donne une récompense par jour réel, sans remise à zéro en cas d’absence', () => {
    const first = claimDaily({ lastClaim: null, claimed: 0 }, '2026-09-01', false)!;
    expect(first.reward).toEqual(DAILY_REWARDS[0]);
    expect(claimDaily(first.daily, '2026-09-01', false)).toBeNull();
    // Trois jours d'absence : on reprend simplement à la case suivante.
    const next = claimDaily(first.daily, '2026-09-04', false)!;
    expect(next.reward).toEqual(DAILY_REWARDS[1]);
    expect(canClaimDaily(next.daily, '2026-09-05')).toBe(true);
  });

  it('double les récompenses des abonné·es', () => {
    const r = claimDaily({ lastClaim: null, claimed: 0 }, '2026-09-01', true)!;
    expect(r.reward.coins).toBe((DAILY_REWARDS[0].coins ?? 0) * 2);
  });

  it('formate les dates en local', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('quêtes du jour', () => {
  it('génère des quêtes stables et différentes pour une date', () => {
    const a = generateQuests('2026-09-27', 'summer', 1);
    expect(a).toHaveLength(QUESTS_PER_DAY);
    expect(generateQuests('2026-09-27', 'summer', 1)).toEqual(a);
    expect(new Set(a.map((q) => q.kind)).size).toBe(QUESTS_PER_DAY);
  });

  it('fait progresser les quêtes selon les événements', () => {
    const quests = [
      { id: '1', kind: 'serve', label: '', target: 2, progress: 0, reward: {}, claimed: false },
      {
        id: '2',
        kind: 'sellProduce',
        produceId: 'apple',
        label: '',
        target: 5,
        progress: 0,
        reward: {},
        claimed: false,
      },
      { id: '3', kind: 'attractiveness', label: '', target: 60, progress: 0, reward: {}, claimed: false },
    ] as const;
    let q = applyQuestEvent([...quests], { type: 'serve', happy: true, sold: { apple: 3 }, revenue: 6 });
    q = applyQuestEvent(q, { type: 'serve', happy: false, sold: { apple: 4 }, revenue: 8 });
    q = applyQuestEvent(q, { type: 'attractiveness', value: 72 });
    expect(q.map(isQuestDone)).toEqual([true, true, true]);
    expect(q[1].progress).toBe(5);
  });
});

describe('Carnet de saison', () => {
  it('calcule les paliers et change de carnet à chaque saison', () => {
    expect(passTier(0)).toBe(0);
    expect(passTier(PASS_XP_PER_TIER * 3 + 50)).toBe(3);
    expect(passTier(1e9)).toBe(PASS_TIERS);
    const pass = { ...newPass(0), xp: 500, premium: true };
    expect(ensurePassSeason(pass, 7)).toBe(pass);
    expect(ensurePassSeason(pass, 8)).toEqual(newPass(1));
  });

  it('débloque rétroactivement la ligne premium', () => {
    const free = { ...newPass(0), xp: PASS_XP_PER_TIER * 4 };
    expect(passClaimable(free).premium).toEqual([]);
    const claimed = claimPass(free);
    expect(claimed.pass.claimedFree).toEqual([2, 4]);
    expect(passClaimable(claimed.pass).free).toEqual([]);

    const premium = { ...claimed.pass, premium: true };
    expect(passClaimable(premium).premium).toEqual([1, 2, 3, 4]);
    const res = claimPass(premium);
    expect(res.reward.honey).toBeGreaterThan(0);
  });

  it('offre des auvents cosmétiques aux paliers clés', () => {
    const res = claimPass({ ...newPass(0), xp: 1e9, premium: true });
    expect(res.cosmetics).toEqual(expect.arrayContaining(['awning_berry', 'awning_gold']));
  });
});

describe('achats', () => {
  it('double le tout premier pack de miel', () => {
    const first = grantPurchase(noEntitlements, 'honey_450', 0);
    expect(first.reward.honey).toBe(900);
    expect(first.doubled).toBe(true);
    const second = grantPurchase(first.entitlements, 'honey_450', 0);
    expect(second.reward.honey).toBe(450);
  });

  it('gère le pack de bienvenue, l’abonnement et le Carnet premium', () => {
    const starter = grantPurchase(noEntitlements, 'starter_pack', 0);
    expect(starter.entitlements.starterBought).toBe(true);
    expect(starter.cosmetics).toEqual(['awning_sage']);
    expect(starter.reward.coins).toBe(300);

    const now = Date.UTC(2026, 8, 1);
    const sub = grantPurchase(noEntitlements, 'friend_of_market_monthly', now);
    expect(isSubscriber(sub.entitlements.subscriptionUntil, now + 29 * 86400000)).toBe(true);
    expect(isSubscriber(sub.entitlements.subscriptionUntil, now + 31 * 86400000)).toBe(false);

    expect(grantPurchase(noEntitlements, 'season_pass', 0).entitlements.passPremium).toBe(true);
  });

  it('respecte la limite de dépenses mensuelle', () => {
    const now = new Date(2026, 8, 15);
    const history = [
      { productId: 'honey_450', at: new Date(2026, 8, 2).getTime(), priceEur: 4.99 },
      { productId: 'honey_1000', at: new Date(2026, 7, 30).getTime(), priceEur: 9.99 },
    ];
    expect(spentThisMonth(history, now)).toBe(4.99);
    expect(withinSpendingLimit(null, history, 49.99, now)).toBe(true);
    expect(withinSpendingLimit(10, history, 4.99, now)).toBe(true);
    expect(withinSpendingLimit(10, history, 9.99, now)).toBe(false);
  });

  it('met en avant une seule offre adaptée au moment', () => {
    const base = { day: 1, starterBought: false, subscriber: false, passPremium: false, passXp: 0 };
    expect(featuredOfferId(base)).toBeNull();
    expect(featuredOfferId({ ...base, day: 2 })).toBe('starter_pack');
    expect(featuredOfferId({ ...base, day: 3, starterBought: true, passXp: 400 })).toBe('season_pass');
    expect(featuredOfferId({ ...base, day: 6, starterBought: true, passPremium: true })).toBe(
      'friend_of_market_monthly',
    );
  });
});

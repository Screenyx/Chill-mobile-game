import {
  DAILY_REWARDS,
  FIRST_PURCHASE_MULTIPLIER,
  getIapProduct,
  PASS_REWARDS,
  PASS_TIERS,
  PASS_XP_PER_TIER,
  QUEST_TEMPLATES,
  QUESTS_PER_DAY,
  type QuestKind,
  SUBSCRIPTION_DAYS,
  type Reward,
} from '../data/monetization';
import { CONFIG } from '../config';
import type { Season } from '../types';
import { availableProduce } from './economy';
import { createRng, pick } from './random';

/* ---------- Dates (jours réels) ---------- */

/** Clé de date locale « AAAA-MM-JJ ». */
export function dateKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  return dateKey(date).slice(0, 7);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- Récompenses ---------- */

export function addRewards(a: Reward, b: Reward): Reward {
  return {
    coins: (a.coins ?? 0) + (b.coins ?? 0) || undefined,
    honey: (a.honey ?? 0) + (b.honey ?? 0) || undefined,
    passXp: (a.passXp ?? 0) + (b.passXp ?? 0) || undefined,
    cosmeticId: b.cosmeticId ?? a.cosmeticId,
  };
}

export function scaleReward(r: Reward, factor: number): Reward {
  return {
    ...r,
    coins: r.coins ? Math.round(r.coins * factor) : undefined,
    honey: r.honey ? Math.round(r.honey * factor) : undefined,
  };
}

export function rewardLabel(r: Reward): string {
  const parts: string[] = [];
  if (r.honey) parts.push(`${r.honey} 🍯`);
  if (r.coins) parts.push(`${r.coins} 🪙`);
  if (r.passXp) parts.push(`${r.passXp} XP`);
  if (r.cosmeticId) parts.push('🎁 auvent');
  return parts.join(' + ');
}

/* ---------- Calendrier de connexion ---------- */

export type DailyState = {
  /** Dernier jour réel où la récompense a été réclamée. */
  lastClaim: string | null;
  /** Nombre total de récompenses réclamées (la case du calendrier = index % 7). */
  claimed: number;
};

export function canClaimDaily(daily: DailyState, today: string): boolean {
  return daily.lastClaim !== today;
}

/** Réclame la récompense du jour. Manquer un jour ne remet pas le calendrier à zéro. */
export function claimDaily(
  daily: DailyState,
  today: string,
  subscriber: boolean,
): { daily: DailyState; reward: Reward } | null {
  if (!canClaimDaily(daily, today)) return null;
  const base = DAILY_REWARDS[daily.claimed % DAILY_REWARDS.length];
  return {
    daily: { lastClaim: today, claimed: daily.claimed + 1 },
    reward: subscriber ? scaleReward(base, 2) : base,
  };
}

/* ---------- Quêtes du jour ---------- */

export type Quest = {
  id: string;
  kind: QuestKind;
  label: string;
  target: number;
  progress: number;
  produceId?: string;
  reward: Reward;
  claimed: boolean;
};

/** Trois quêtes par jour réel, déterministes pour une date donnée. */
export function generateQuests(today: string, season: Season, repLevel: number): Quest[] {
  const rng = createRng(hashString(today));
  const templates = [...QUEST_TEMPLATES];
  const quests: Quest[] = [];
  while (quests.length < QUESTS_PER_DAY && templates.length > 0) {
    const t = templates.splice(Math.floor(rng() * templates.length), 1)[0];
    const target = pick(rng, t.targets);
    const produce = t.kind === 'sellProduce' ? pick(rng, availableProduce(season, repLevel)) : undefined;
    const label = t.label.replace('%n', `${target}`).replace('%p', produce ? produce.name.toLowerCase() : '');
    quests.push({
      id: `${today}-${quests.length}`,
      kind: t.kind,
      label: produce ? `${label} ${produce.emoji}` : label,
      target,
      progress: 0,
      produceId: produce?.id,
      reward: t.reward,
      claimed: false,
    });
  }
  return quests;
}

export type QuestEvent =
  | { type: 'serve'; happy: boolean; sold: Record<string, number>; revenue: number }
  | { type: 'attractiveness'; value: number }
  | { type: 'day' };

export function applyQuestEvent(quests: Quest[], event: QuestEvent): Quest[] {
  return quests.map((q) => {
    if (q.claimed || q.progress >= q.target) return q;
    let progress = q.progress;
    if (event.type === 'serve') {
      if (q.kind === 'serve') progress += 1;
      if (q.kind === 'happy' && event.happy) progress += 1;
      if (q.kind === 'sellProduce' && q.produceId) progress += event.sold[q.produceId] ?? 0;
      if (q.kind === 'revenue') progress += event.revenue;
    } else if (event.type === 'attractiveness' && q.kind === 'attractiveness') {
      progress = Math.max(progress, event.value);
    } else if (event.type === 'day' && q.kind === 'playDay') {
      progress += 1;
    }
    return { ...q, progress: Math.min(q.target, Math.round(progress * 10) / 10) };
  });
}

export function isQuestDone(q: Quest): boolean {
  return q.progress >= q.target;
}

/* ---------- Carnet de saison ---------- */

export type PassState = {
  /** Index de la saison du jeu (0 = premier printemps). */
  season: number;
  xp: number;
  premium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
};

export function passSeasonForDay(day: number): number {
  return Math.floor((Math.max(1, day) - 1) / CONFIG.daysPerSeason);
}

export function newPass(season: number): PassState {
  return { season, xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
}

/** Change de Carnet quand une nouvelle saison du jeu commence. */
export function ensurePassSeason(pass: PassState, day: number): PassState {
  const season = passSeasonForDay(day);
  return pass.season === season ? pass : newPass(season);
}

export function passTier(xp: number): number {
  return Math.min(PASS_TIERS, Math.floor(xp / PASS_XP_PER_TIER));
}

export function passClaimable(pass: PassState): { free: number[]; premium: number[] } {
  const reached = passTier(pass.xp);
  const free: number[] = [];
  const premium: number[] = [];
  for (const t of PASS_REWARDS) {
    if (t.tier > reached) break;
    if (t.free && !pass.claimedFree.includes(t.tier)) free.push(t.tier);
    if (pass.premium && !pass.claimedPremium.includes(t.tier)) premium.push(t.tier);
  }
  return { free, premium };
}

/** Réclame toutes les récompenses disponibles du Carnet. */
export function claimPass(pass: PassState): { pass: PassState; reward: Reward; cosmetics: string[] } {
  const { free, premium } = passClaimable(pass);
  let reward: Reward = {};
  const cosmetics: string[] = [];
  for (const tier of free) {
    const r = PASS_REWARDS[tier - 1].free!;
    reward = addRewards(reward, { ...r, cosmeticId: undefined });
    if (r.cosmeticId) cosmetics.push(r.cosmeticId);
  }
  for (const tier of premium) {
    const r = PASS_REWARDS[tier - 1].premium;
    reward = addRewards(reward, { ...r, cosmeticId: undefined });
    if (r.cosmeticId) cosmetics.push(r.cosmeticId);
  }
  return {
    pass: {
      ...pass,
      claimedFree: [...pass.claimedFree, ...free],
      claimedPremium: [...pass.claimedPremium, ...premium],
    },
    reward,
    cosmetics,
  };
}

/* ---------- Achats ---------- */

export type PurchaseRecord = { productId: string; at: number; priceEur: number };

export function spentThisMonth(history: PurchaseRecord[], now: Date): number {
  const key = monthKey(now);
  const total = history.filter((p) => monthKey(new Date(p.at)) === key).reduce((s, p) => s + p.priceEur, 0);
  return Math.round(total * 100) / 100;
}

/** Vérifie la limite de dépenses mensuelle choisie par le joueur (ou un parent). */
export function withinSpendingLimit(limit: number | null, history: PurchaseRecord[], priceEur: number, now: Date) {
  return limit === null || spentThisMonth(history, now) + priceEur <= limit + 0.001;
}

export function isSubscriber(subscriptionUntil: number | null, now: number): boolean {
  return subscriptionUntil !== null && subscriptionUntil > now;
}

/** Offre du moment affichée sur l'accueil (une seule, jamais insistante). */
export function featuredOfferId(ctx: {
  day: number;
  starterBought: boolean;
  subscriber: boolean;
  passPremium: boolean;
  passXp: number;
}): string | null {
  if (!ctx.starterBought && ctx.day >= 2) return 'starter_pack';
  if (!ctx.passPremium && passTier(ctx.passXp) >= 3) return 'season_pass';
  if (!ctx.subscriber && ctx.day >= 5) return 'friend_of_market_monthly';
  return null;
}

export type Entitlements = {
  firstPackBonusUsed: boolean;
  starterBought: boolean;
  subscriptionUntil: number | null;
  passPremium: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ce que rapporte un achat validé par le store. */
export function grantPurchase(
  ent: Entitlements,
  productId: string,
  now: number,
): { entitlements: Entitlements; reward: Reward; cosmetics: string[]; doubled: boolean } {
  const product = getIapProduct(productId);
  const cosmetics = product.reward.cosmeticId ? [product.reward.cosmeticId] : [];
  const reward: Reward = { ...product.reward, cosmeticId: undefined };
  switch (product.kind) {
    case 'consumable': {
      const doubled = !ent.firstPackBonusUsed;
      return {
        entitlements: { ...ent, firstPackBonusUsed: true },
        reward: doubled ? scaleReward(reward, FIRST_PURCHASE_MULTIPLIER) : reward,
        cosmetics,
        doubled,
      };
    }
    case 'nonConsumable':
      return { entitlements: { ...ent, starterBought: true }, reward, cosmetics, doubled: false };
    case 'subscription': {
      const from = Math.max(now, ent.subscriptionUntil ?? 0);
      return {
        entitlements: { ...ent, subscriptionUntil: from + SUBSCRIPTION_DAYS * DAY_MS },
        reward,
        cosmetics: ['awning_lavender'],
        doubled: false,
      };
    }
    case 'seasonPass':
      return { entitlements: { ...ent, passPremium: true }, reward, cosmetics, doubled: false };
  }
}

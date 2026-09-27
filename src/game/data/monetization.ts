/**
 * Catalogue de la monétisation : monnaie premium (pots de miel 🍯), offres en argent réel,
 * cosmétiques, calendrier de connexion, quêtes du jour et Carnet de saison.
 *
 * Principes (cohérents avec l'esprit « chill » du jeu) :
 *  - aucun tirage aléatoire payant, tout ce qui s'achète est affiché à l'avance ;
 *  - aucun compte à rebours ni punition : on récompense la présence, on ne punit pas l'absence ;
 *  - le jeu reste entièrement jouable sans payer ; le miel accélère et embellit.
 */

export type Reward = {
  coins?: number;
  honey?: number;
  cosmeticId?: string;
  /** Points d'expérience du Carnet de saison. */
  passXp?: number;
};

export type IapKind = 'consumable' | 'nonConsumable' | 'subscription' | 'seasonPass';

export type IapProduct = {
  /** Identifiant à reporter à l'identique dans App Store Connect / Google Play Console / RevenueCat. */
  id: string;
  kind: IapKind;
  title: string;
  emoji: string;
  /** Prix affiché en mode démo ; en production, on affiche le prix localisé renvoyé par le store. */
  displayPrice: string;
  /** Prix en euros, utilisé pour le récapitulatif et la limite de dépenses. */
  priceEur: number;
  reward: Reward;
  /** Petite étiquette mise en avant (« Populaire », « Meilleure valeur »…). */
  tag?: string;
  description?: string;
};

export const HONEY_PACKS: IapProduct[] = [
  {
    id: 'honey_80',
    kind: 'consumable',
    title: 'Petit pot',
    emoji: '🍯',
    displayPrice: '0,99 €',
    priceEur: 0.99,
    reward: { honey: 80 },
  },
  {
    id: 'honey_450',
    kind: 'consumable',
    title: 'Pot de miel',
    emoji: '🍯',
    displayPrice: '4,99 €',
    priceEur: 4.99,
    reward: { honey: 450 },
    tag: '+12 %',
  },
  {
    id: 'honey_1000',
    kind: 'consumable',
    title: 'Grand pot',
    emoji: '🍯',
    displayPrice: '9,99 €',
    priceEur: 9.99,
    reward: { honey: 1000 },
    tag: 'Populaire',
  },
  {
    id: 'honey_2200',
    kind: 'consumable',
    title: 'Ruche',
    emoji: '🐝',
    displayPrice: '19,99 €',
    priceEur: 19.99,
    reward: { honey: 2200 },
    tag: '+37 %',
  },
  {
    id: 'honey_6000',
    kind: 'consumable',
    title: 'Rucher entier',
    emoji: '🏡',
    displayPrice: '49,99 €',
    priceEur: 49.99,
    reward: { honey: 6000 },
    tag: 'Meilleure valeur',
  },
];

export const STARTER_PACK: IapProduct = {
  id: 'starter_pack',
  kind: 'nonConsumable',
  title: 'Panier de bienvenue',
  emoji: '🧺',
  displayPrice: '2,99 €',
  priceEur: 2.99,
  reward: { honey: 300, coins: 300, cosmeticId: 'awning_sage' },
  tag: 'Une seule fois',
  description: '300 🍯 + 300 🪙 + l’auvent Vert sauge exclusif',
};

export const SUBSCRIPTION: IapProduct = {
  id: 'friend_of_market_monthly',
  kind: 'subscription',
  title: 'Ami·e du marché',
  emoji: '💚',
  displayPrice: '2,99 € / mois',
  priceEur: 2.99,
  reward: {},
  description: '+30 🍯 chaque jour, récompenses quotidiennes doublées, pourboires +10 %, auvent Lavande offert',
};

export const SEASON_PASS: IapProduct = {
  id: 'season_pass',
  kind: 'seasonPass',
  title: 'Carnet de saison Premium',
  emoji: '📗',
  displayPrice: '4,99 €',
  priceEur: 4.99,
  reward: {},
  description: 'Débloque la ligne premium du Carnet de saison, y compris les paliers déjà atteints',
};

export const ALL_PRODUCTS: IapProduct[] = [...HONEY_PACKS, STARTER_PACK, SUBSCRIPTION, SEASON_PASS];

export function getIapProduct(id: string): IapProduct {
  const p = ALL_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Produit inconnu : ${id}`);
  return p;
}

/** Bonus de miel doublé sur le tout premier achat d'un pack. */
export const FIRST_PURCHASE_MULTIPLIER = 2;

/** Bonus quotidien de l'abonnement. */
export const SUBSCRIBER_DAILY_HONEY = 30;
export const SUBSCRIBER_TIP_BONUS = 1.1;
export const SUBSCRIPTION_DAYS = 30;

/** Conversion de miel en pièces (pour débloquer une amélioration plus tôt). */
export const COIN_BUNDLES = [
  { id: 'coins_s', honey: 20, coins: 60 },
  { id: 'coins_m', honey: 60, coins: 200 },
  { id: 'coins_l', honey: 150, coins: 550 },
];

export type Cosmetic = {
  id: string;
  name: string;
  /** Couleurs des rayures de l'auvent. */
  stripes: [string, string];
  /** Prix en miel ; `null` = uniquement via une offre ou une récompense. */
  honeyPrice: number | null;
  source?: string;
};

export const COSMETICS: Cosmetic[] = [
  { id: 'awning_classic', name: 'Terracotta classique', stripes: ['#D98A6C', '#FFFDF8'], honeyPrice: 0 },
  { id: 'awning_honey', name: 'Jaune miel', stripes: ['#F2C46D', '#FFFDF8'], honeyPrice: 120 },
  { id: 'awning_sky', name: 'Bleu ciel', stripes: ['#8DC3E0', '#FFFDF8'], honeyPrice: 120 },
  { id: 'awning_rose', name: 'Rose poudré', stripes: ['#EBA8B5', '#FFFDF8'], honeyPrice: 180 },
  { id: 'awning_mint', name: 'Menthe à l’eau', stripes: ['#9ED8C3', '#FFF6E9'], honeyPrice: 180 },
  { id: 'awning_sunset', name: 'Coucher de soleil', stripes: ['#E6917A', '#F5C27A'], honeyPrice: 260 },
  {
    id: 'awning_sage',
    name: 'Vert sauge',
    stripes: ['#6E8F6A', '#FFF6E9'],
    honeyPrice: null,
    source: 'Panier de bienvenue',
  },
  {
    id: 'awning_lavender',
    name: 'Lavande',
    stripes: ['#B7A6D9', '#FFFDF8'],
    honeyPrice: null,
    source: 'Ami·e du marché',
  },
  {
    id: 'awning_berry',
    name: 'Fruits rouges',
    stripes: ['#B84A5C', '#F6D6D0'],
    honeyPrice: null,
    source: 'Carnet de saison',
  },
  {
    id: 'awning_gold',
    name: 'Or du marché',
    stripes: ['#C9A23F', '#FBE3AE'],
    honeyPrice: null,
    source: 'Carnet de saison Premium',
  },
];

export function getCosmetic(id: string): Cosmetic {
  return COSMETICS.find((c) => c.id === id) ?? COSMETICS[0];
}

/** Calendrier de connexion sur 7 jours (en jours réels). Un jour manqué ne fait pas perdre la progression. */
export const DAILY_REWARDS: Reward[] = [
  { coins: 20 },
  { honey: 5 },
  { coins: 40 },
  { honey: 10 },
  { coins: 60 },
  { honey: 15 },
  { honey: 40, coins: 100 },
];

export type QuestKind = 'serve' | 'happy' | 'sellProduce' | 'revenue' | 'attractiveness' | 'playDay';

export type QuestTemplate = {
  kind: QuestKind;
  /** `%n` = objectif, `%p` = produit. */
  label: string;
  targets: number[];
  reward: Reward;
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { kind: 'serve', label: 'Servir %n clients', targets: [5, 8, 12], reward: { coins: 30, passXp: 40 } },
  { kind: 'happy', label: 'Rendre %n clients ravis (3 ★)', targets: [2, 3, 5], reward: { honey: 5, passXp: 50 } },
  { kind: 'sellProduce', label: 'Vendre %n %p', targets: [5, 8, 10], reward: { coins: 40, passXp: 40 } },
  {
    kind: 'revenue',
    label: 'Encaisser %n 🪙 dans la journée',
    targets: [40, 70, 110],
    reward: { honey: 5, passXp: 50 },
  },
  {
    kind: 'attractiveness',
    label: 'Ouvrir un étal à %n d’attractivité',
    targets: [50, 65, 80],
    reward: { coins: 30, passXp: 40 },
  },
  { kind: 'playDay', label: 'Tenir l’étal %n journée(s)', targets: [1, 2], reward: { coins: 20, passXp: 30 } },
];

export const QUESTS_PER_DAY = 3;

/** Carnet de saison : 20 paliers par saison du jeu (7 journées), 100 XP par palier. */
export const PASS_TIERS = 20;
export const PASS_XP_PER_TIER = 100;
export const PASS_XP = { perCustomer: 8, perStar: 4, perDay: 30 };

export type PassTier = { tier: number; free?: Reward; premium: Reward };

export const PASS_REWARDS: PassTier[] = Array.from({ length: PASS_TIERS }, (_, i) => {
  const tier = i + 1;
  const free: Reward | undefined =
    tier === 10
      ? { cosmeticId: 'awning_berry' }
      : tier % 2 === 0
        ? tier % 4 === 0
          ? { honey: 10 }
          : { coins: 50 }
        : undefined;
  const premium: Reward =
    tier === PASS_TIERS
      ? { cosmeticId: 'awning_gold', honey: 100 }
      : tier % 5 === 0
        ? { honey: 60 }
        : tier % 2 === 0
          ? { coins: 120 }
          : { honey: 20 };
  return { tier, free, premium };
});

/** Limites de dépenses mensuelles proposées dans les réglages (null = sans limite). */
export const SPENDING_LIMITS: (number | null)[] = [null, 10, 30, 50, 100];

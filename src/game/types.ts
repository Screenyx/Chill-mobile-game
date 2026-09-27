export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type ColorFamily = 'red' | 'orange' | 'yellow' | 'green' | 'purple' | 'brown';

export type ProduceKind = 'fruit' | 'vegetable';

export type Produce = {
  id: string;
  name: string;
  emoji: string;
  kind: ProduceKind;
  color: ColorFamily;
  /** Saisons où le produit est disponible chez le grossiste. */
  seasons: Season[];
  /** Prix d'achat de base à l'unité chez le grossiste. */
  buyPrice: number;
  /** Niveau de réputation nécessaire pour le débloquer (1 = dès le début). */
  minReputation: number;
  /** Anecdote affichée dans le carnet de collection. */
  fact: string;
};

/** Un lot de produits identiques en réserve (dans la camionnette). */
export type Lot = {
  produceId: string;
  qty: number;
  /** 0 = frais du jour, 1 = de la veille (« un peu moins frais »). */
  age: number;
};

/** Une cagette posée sur l'étal. */
export type Slot = Lot | null;

export type CustomerType = {
  id: string;
  label: string;
  emoji: string;
  names: string[];
  /** Préférence pour les fruits (0 = que des légumes, 1 = que des fruits). */
  fruitLove: number;
  minItems: number;
  maxItems: number;
  minQty: number;
  maxQty: number;
  /** Tolérance au prix : 1 = normal, >1 = accepte plus cher. */
  priceTolerance: number;
  /** Générosité du pourboire (multiplicateur). */
  tipFactor: number;
  /** Patience en secondes avant de repartir tranquillement. */
  patience: number;
  minReputation: number;
  greetings: string[];
};

export type OrderLine = {
  produceId: string;
  qty: number;
  served: number;
  /** Produit proposé à la place si l'original manquait. */
  substituteId?: string;
};

export type Customer = {
  uid: number;
  typeId: string;
  name: string;
  emoji: string;
  lines: OrderLine[];
  greeting: string;
  isRegular: boolean;
  /** Secondes de marché écoulées à son arrivée. */
  arrivedAt: number;
  patience: number;
  /** Montant du panier en cours. */
  bill: number;
  units: number;
  /** Somme des rapports prix demandé / prix jugé juste (pour la satisfaction). */
  priceRatioTotal: number;
  dayOldUnits: number;
  bought: Record<string, number>;
};

export type Regular = {
  name: string;
  typeId: string;
  visits: number;
  favoriteId: string;
};

export type Upgrade = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  /** Points d'attractivité ajoutés à l'étal. */
  attractiveness: number;
};

export type DayStats = {
  revenue: number;
  tips: number;
  spent: number;
  served: number;
  happy: number;
  leftSmiling: number;
  starsEarned: number;
  sold: Record<string, number>;
  newInCollection: string[];
  newRegulars: string[];
  antiGaspiUnits: number;
  antiGaspiRevenue: number;
  attractiveness: number;
};

export type Settings = {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
};

export type Phase = 'home' | 'buying' | 'arranging' | 'selling' | 'summary';

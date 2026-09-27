import type { IapProduct } from '@/game/data/monetization';

export type PurchaseResult = { ok: true; transactionId: string } | { ok: false; cancelled: boolean; message?: string };

/**
 * Fournisseur d'achats intégrés. Le jeu ne parle qu'à cette interface :
 * en production, on la branche sur RevenueCat (`react-native-purchases`) ou `expo-iap`,
 * qui gèrent App Store / Google Play, la validation des reçus et les abonnements.
 */
export type PurchaseProvider = {
  name: string;
  /** `true` tant qu'aucun vrai paiement n'est effectué. */
  isDemo: boolean;
  purchase: (product: IapProduct) => Promise<PurchaseResult>;
  /** Renvoie les identifiants des achats non consommables / abonnements actifs à restaurer. */
  restore: () => Promise<string[]>;
};

/** Mode démo : simule un paiement réussi, sans aucune transaction réelle. */
export const demoProvider: PurchaseProvider = {
  name: 'Démo',
  isDemo: true,
  purchase: (product) =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ ok: true, transactionId: `demo-${product.id}-${Date.now()}` }), 700),
    ),
  restore: async () => [],
};

let provider: PurchaseProvider = demoProvider;

export function getPurchaseProvider(): PurchaseProvider {
  return provider;
}

/** À appeler au démarrage avec le fournisseur de production (voir README, section « Achats intégrés »). */
export function setPurchaseProvider(next: PurchaseProvider) {
  provider = next;
}

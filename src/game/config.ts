/** Réglages d'équilibrage du jeu, regroupés ici pour être faciles à ajuster. */
export const CONFIG = {
  startCoins: 100,
  stallCols: 4,
  baseRows: 3,
  slotCapacity: 12,
  bigSlotCapacity: 18,
  /** Durée réelle d'une journée de vente, en secondes. */
  marketDuration: 240,
  /** Nombre de clients présents en même temps devant l'étal. */
  maxCustomersAtOnce: 3,
  /** Marge conseillée : prix de vente suggéré = prix d'achat × marge. */
  suggestedMargin: 2,
  /** Prix réduit pour les produits de la veille. */
  dayOldPriceFactor: 0.8,
  /** Les invendus trop vieux partent en panier anti-gaspi à ce facteur du prix d'achat. */
  antiGaspiFactor: 0.5,
  daysPerSeason: 7,
  /** Points de réputation nécessaires pour chaque niveau (index = niveau - 1). */
  reputationThresholds: [0, 15, 45, 90, 150, 230],
};

import type { Upgrade } from '../types';

export const UPGRADES: Upgrade[] = [
  {
    id: 'flowers',
    name: 'Bouquet de fleurs',
    emoji: '💐',
    description: 'Un petit bouquet qui sent bon le printemps.',
    cost: 30,
    attractiveness: 5,
  },
  {
    id: 'tablecloth',
    name: 'Nappe à carreaux',
    emoji: '🧺',
    description: 'Une nappe vichy sous les cagettes, très champêtre.',
    cost: 45,
    attractiveness: 6,
  },
  {
    id: 'chalkboards',
    name: 'Ardoises à la craie',
    emoji: '🪧',
    description: 'Des prix écrits à la main : les clients acceptent des prix un peu plus élevés.',
    cost: 60,
    attractiveness: 5,
  },
  {
    id: 'parasol',
    name: 'Grand parasol',
    emoji: '⛱️',
    description: 'De l’ombre pour les fruits et les clients.',
    cost: 70,
    attractiveness: 8,
  },
  {
    id: 'bell',
    name: 'Clochette du marché',
    emoji: '🔔',
    description: 'Les passants s’arrêtent un peu plus souvent.',
    cost: 80,
    attractiveness: 4,
  },
  {
    id: 'scale',
    name: 'Balance ancienne',
    emoji: '⚖️',
    description: 'Une belle balance en laiton : les pourboires augmentent.',
    cost: 90,
    attractiveness: 4,
  },
  {
    id: 'bigCrates',
    name: 'Grandes cagettes',
    emoji: '📦',
    description: 'Chaque emplacement peut contenir 18 produits au lieu de 12.',
    cost: 120,
    attractiveness: 0,
  },
  {
    id: 'extraRow',
    name: 'Rangée supplémentaire',
    emoji: '🪵',
    description: 'Ajoute une rangée de 4 emplacements à l’étal.',
    cost: 150,
    attractiveness: 0,
  },
];

export function getUpgrade(id: string): Upgrade {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`Amélioration inconnue : ${id}`);
  return u;
}

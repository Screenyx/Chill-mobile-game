import { CONFIG } from '../config';
import type { Season } from '../types';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_LABELS: Record<Season, { name: string; emoji: string }> = {
  spring: { name: 'Printemps', emoji: '🌸' },
  summer: { name: 'Été', emoji: '☀️' },
  autumn: { name: 'Automne', emoji: '🍂' },
  winter: { name: 'Hiver', emoji: '❄️' },
};

/** Le jeu commence au jour 1, au printemps ; chaque saison dure `daysPerSeason` jours. */
export function seasonForDay(day: number): Season {
  const idx = Math.floor((Math.max(1, day) - 1) / CONFIG.daysPerSeason) % SEASONS.length;
  return SEASONS[idx];
}

export function dayInSeason(day: number): number {
  return ((Math.max(1, day) - 1) % CONFIG.daysPerSeason) + 1;
}

export function reputationLevel(points: number): number {
  let level = 1;
  CONFIG.reputationThresholds.forEach((threshold, i) => {
    if (points >= threshold) level = i + 1;
  });
  return level;
}

/** Progression (0..1) vers le niveau suivant ; 1 au niveau maximum. */
export function reputationProgress(points: number): number {
  const level = reputationLevel(points);
  const thresholds = CONFIG.reputationThresholds;
  if (level >= thresholds.length) return 1;
  const from = thresholds[level - 1];
  const to = thresholds[level];
  return (points - from) / (to - from);
}

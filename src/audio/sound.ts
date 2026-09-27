import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useGameStore } from '@/store/gameStore';

const SOURCES = {
  pop: require('@/assets/sounds/pop.wav'),
  coin: require('@/assets/sounds/coin.wav'),
  bell: require('@/assets/sounds/bell.wav'),
};

export type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let music: AudioPlayer | null = null;
let ready = false;

function init() {
  if (ready) return;
  ready = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function player(name: Sfx): AudioPlayer | null {
  try {
    init();
    players[name] ??= createAudioPlayer(SOURCES[name]);
    return players[name] ?? null;
  } catch {
    return null;
  }
}

export function playSfx(name: Sfx, volume = 0.7) {
  if (!useGameStore.getState().settings.sfx) return;
  const p = player(name);
  if (!p) return;
  try {
    p.volume = volume;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // le son est un bonus : on ignore silencieusement les erreurs
  }
}

/**
 * Démarre ou coupe la musique. Sur le web, le navigateur refuse la lecture avant
 * une interaction : la musique démarre alors au premier appui (`resumeMusicIfNeeded`).
 */
export function setMusicEnabled(enabled: boolean, fromUserGesture = false) {
  if (enabled && Platform.OS === 'web' && !fromUserGesture && !music?.playing) return;
  try {
    init();
    if (enabled) {
      music ??= createAudioPlayer(require('@/assets/sounds/music.wav'));
      music.loop = true;
      music.volume = 0.3;
      music.play();
    } else {
      music?.pause();
    }
  } catch {
    // idem : pas de musique plutôt qu'un plantage
  }
}

type Feel = 'light' | 'medium' | 'success' | 'soft';

export function haptic(feel: Feel = 'light') {
  if (Platform.OS === 'web' || !useGameStore.getState().settings.haptics) return;
  const run =
    feel === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : feel === 'soft'
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(
            feel === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
  run.catch(() => {});
}

/** Sur le web, la musique ne peut démarrer qu'après une interaction : on la relance au premier appui. */
export function resumeMusicIfNeeded() {
  if (!useGameStore.getState().settings.music) return;
  if (music?.playing) return;
  setMusicEnabled(true, true);
}

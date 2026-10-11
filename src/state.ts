import { useSyncExternalStore } from 'react';

// Per-frame values (camera speed, slow-mo, event clock) live in `frame`, mutated by the
// director and read inside useFrame. Anything the DOM HUD renders goes through `ui`.

export const frame = {
  gameTime: 0,
  timeScale: 1,
  slowmo: 0, // 0..1, drives post FX and audio
  speed: 0, // m/s of the camera
  fired: new Map<string, number>(), // event name → gameTime it fired
  picked: null as string | null, // JUDGMENT route the visitor clicked
  kind: 'stand' as string, // current segment kind, for the first-person arms
  segU: 0,
  stride: 0, // metres run, drives the arm pump
  bob: 0,
};

export const firedAgo = (name: string): number => {
  const t = frame.fired.get(name);
  return t === undefined ? -1 : frame.gameTime - t;
};

export type Phase = 'loading' | 'title' | 'playing' | 'waiting' | 'choosing' | 'failed' | 'ended';

export type UiState = {
  readonly phase: Phase;
  readonly chapter: number; // 0..5 values, 6 = promise
  readonly showCard: boolean;
  readonly showParagraph: boolean;
  readonly subtitle: string | null;
  readonly muted: boolean;
  readonly reducedMotion: boolean;
  readonly loadProgress: number;
};

let ui: UiState = {
  phase: 'loading',
  chapter: 0,
  showCard: false,
  showParagraph: false,
  subtitle: null,
  muted: false,
  reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  loadProgress: 0,
};
const listeners = new Set<() => void>();

export const getUi = () => ui;
export const setUi = (patch: Partial<UiState>) => {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
};
export const useUi = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ui,
  );

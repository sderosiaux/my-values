import type { AccentKey } from './content';

// One palette for the 3D world and the HUD. Accents match the README values wheel.
export const ACCENTS: Readonly<Record<AccentKey, string>> = {
  ember: '#FF4D2E',
  amber: '#F2A900',
  blue: '#2E6BFF',
  violet: '#8B5CF6',
  green: '#00A36C',
  pink: '#F0368F',
};

export const WORLD = {
  concrete: '#F6F6F4',
  concreteShade: '#E2E4E8',
  street: '#B9BEC6',
  glass: '#5C86B8',
  zenith: '#3E7FD1',
  fog: '#D9E6F3',
  sun: '#FFF1DC',
  ink: '#111111',
  ai: '#22D3EE',
} as const;

export const HUD = {
  panel: 'rgba(255,255,255,0.86)',
  panelBorder: 'rgba(17,17,17,0.08)',
  ink: '#111111',
  muted: '#6B6F76',
} as const;

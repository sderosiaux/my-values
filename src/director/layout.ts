// The run, in world space. The camera runs toward -z; the sun sits ahead-left.
// Roofs are hand-placed so every jump, zipline and fall in the script has real geometry under it.

export type Roof = { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly h: number };

export const EYE = 1.7;
/** How far the eyes hang below a cable: hands on the handle just above the head. */
export const HANG = 0.5;
export const ZIP_SAG = 2.4;
export const ROPE_SAG = 0.7;

export const ROOFS = {
  start: { x: 0, z: 0, w: 14, d: 30, h: 40 }, // z 15 → -15
  r1: { x: 0, z: -41, w: 16, d: 40, h: 38 }, // z -21 → -61
  r2: { x: 0, z: -148, w: 16, d: 44, h: 24 }, // z -126 → -170
  r3: { x: 0, z: -206, w: 18, d: 48, h: 20 }, // z -182 → -230
  r4: { x: 0, z: -268, w: 18, d: 64, h: 17 }, // z -236 → -300
  r5: { x: 0, z: -355, w: 40, d: 50, h: 17 }, // z -330 → -380
  r6: { x: 8, z: -421, w: 16, d: 58, h: 19 }, // z -392 → -450
  podium: { x: 2, z: -470, w: 34, d: 20, h: 19 }, // z -460 → -480
  prod: { x: 0, z: -493, w: 26, d: 26, h: 150 }, // z -480 → -506
  // Neighbours that make the SHARE beat read: other runners on parallel roofs.
  shareLeft: { x: -24, z: -420, w: 14, d: 70, h: 21 },
  shareRight: { x: 40, z: -415, w: 14, d: 80, h: 18 },
} as const satisfies Record<string, Roof>;

export const ROUTE_ROOFS: readonly Roof[] = Object.values(ROOFS);

export const SPOTS = {
  vaultBox: [0, ROOFS.start.h, -3] as const,
  zipPole: [0, ROOFS.r1.h, -57.5] as const,
  zipTop: [0, ROOFS.r1.h + 4.6, -57.5] as const,
  zipBottom: [0, ROOFS.r2.h + 4.2, -136] as const, // anchor sits back on the roof, past the release point
  billboard: [0, ROOFS.r3.h, -213] as const,
  crane: [6.5, ROOFS.r4.h, -295] as const, // boom lift at the roof edge, extending toward r5
  ropeRunner: [1.4, ROOFS.r5.h, -334.4] as const, // standing on a vent box, rope held high
  ropeTop: [-1.1, ROOFS.r4.h + 2.2, -299.4] as const, // tied to a slim pole left of the run line
  ropeEnd: [0.6, ROOFS.r5.h + 3, -334] as const, // the runner holds it high, so you clear the parapet
  choice: [0, ROOFS.r5.h, -352] as const,
  beamStart: [8, ROOFS.r5.h, -380] as const,
  beamEnd: [8, ROOFS.r6.h, -392] as const,
  elevator: [0, ROOFS.podium.h, -478.5] as const,
  prodSign: [0, ROOFS.prod.h + 9, -480] as const,
};

// JUDGMENT: five AI-suggested routes from the choice spot. Only one has a way across.
export const CHOICES = [
  { id: 'a', label: 'Left edge', target: [-18, ROOFS.r5.h, -378] as const, good: false },
  { id: 'b', label: 'Straight on', target: [-3, ROOFS.r5.h, -380] as const, good: false },
  { id: 'c', label: 'The beam', target: [8, ROOFS.r5.h, -379] as const, good: true },
  { id: 'd', label: 'Right edge', target: [19.5, ROOFS.r5.h, -368] as const, good: false },
  { id: 'e', label: 'Back stairs', target: [-17, ROOFS.r5.h, -334] as const, good: false },
] as const;

export type ChoiceId = (typeof CHOICES)[number]['id'];

export const SUN_DIR = [-0.42, 0.52, -0.74] as const;

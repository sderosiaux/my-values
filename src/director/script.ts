import { Vector3 } from 'three';
import { CHOICES, EYE, HANG, ROOFS, ROPE_SAG, SPOTS, ZIP_SAG, type ChoiceId } from './layout';

// Every camera move of the run. A segment maps u ∈ [0,1] to a pose; the director plays them
// in order, applies slow-mo windows, fires events, and smooths the orientation.

export type Kind = 'run' | 'air' | 'zip' | 'slide' | 'stand' | 'rise' | 'glide' | 'fall';

export type Pose = { pos: Vector3; look: Vector3 | null; bob: number; fov: number | null; roll: number };

export const newPose = (): Pose => ({ pos: new Vector3(), look: null, bob: 0, fov: null, roll: 0 });

export type Segment = {
  readonly kind: Kind;
  readonly dur: number; // game seconds
  readonly pose: (u: number, out: Pose) => void;
  readonly events?: ReadonlyArray<readonly [number, string]>;
  readonly slowmo?: { readonly from: number; readonly to: number; readonly scale: number };
};

type P = readonly [number, number, number];
const v = (p: P) => new Vector3(p[0], p[1], p[2]);
const eye = (x: number, roofH: number, z: number): P => [x, roofH + EYE, z];
const smooth = (u: number) => u * u * (3 - 2 * u);
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const easeIn = (u: number) => u * u;

const lerpPose = (a: Vector3, b: Vector3, u: number, out: Pose) => {
  out.pos.lerpVectors(a, b, u);
  out.look = null;
  out.fov = null;
  out.roll = 0;
};

const run = (from: P, to: P, speed: number, events?: Segment['events']): Segment => {
  const a = v(from), b = v(to);
  return { kind: 'run', dur: a.distanceTo(b) / speed, events, pose: (u, o) => { lerpPose(a, b, u, o); o.bob = 1; } };
};

const decel = (from: P, to: P, dur: number, events?: Segment['events']): Segment => {
  const a = v(from), b = v(to);
  return { kind: 'run', dur, events, pose: (u, o) => { lerpPose(a, b, easeOut(u), o); o.bob = 1 - u; } };
};

const jump = (from: P, to: P, apex: number, dur: number, extra: Partial<Segment> = {}): Segment => {
  const a = v(from), b = v(to);
  return {
    kind: 'air',
    dur,
    events: [[0, 'jump'] as const, [1, 'land'] as const, ...(extra.events ?? [])].sort((x, y) => x[0] - y[0]),
    slowmo: extra.slowmo,
    pose: (u, o) => {
      lerpPose(a, b, u, o);
      o.pos.y += 4 * apex * u * (1 - u);
      o.bob = 0;
    },
  };
};

/** Ride a cable from `top` to `anchor`, letting go at fraction `until` of its length. */
/** A short leap that ends in a grab, not a landing. */
const hop = (from: P, to: P, apex: number, dur: number): Segment => {
  const a = v(from), b = v(to);
  return {
    kind: 'air',
    dur,
    events: [[0, 'jump']],
    pose: (u, o) => {
      lerpPose(a, b, u, o);
      o.pos.y += 4 * apex * u * (1 - u);
      o.bob = 0;
    },
  };
};

const zip = (top: P, anchor: P, sag: number, until: number, dur: number): Segment => {
  const a = v(top).setY(top[1] - HANG), b = v(anchor).setY(anchor[1] - HANG);
  return {
    kind: 'zip',
    dur,
    events: [[0, 'zip-on'], [1, 'zip-off']],
    pose: (u, o) => {
      const e = u < 0.15 ? easeIn(u / 0.15) * 0.15 : u; // hook on, then full speed
      const k = e * until;
      lerpPose(a, b, k, o);
      o.pos.y -= 4 * sag * k * (1 - k);
      o.bob = 0;
      o.roll = Math.sin(u * Math.PI * 3) * 0.035;
      o.fov = 88;
    },
  };
};

const slide = (from: P, to: P, dur: number, drop: number): Segment => {
  const a = v(from), b = v(to);
  return {
    kind: 'slide',
    dur,
    events: [[0, 'slide']],
    pose: (u, o) => {
      lerpPose(a, b, u, o);
      o.pos.y -= drop * Math.sin(Math.PI * Math.min(1, u * 1.15));
      o.bob = 0;
      o.roll = -0.06 * Math.sin(Math.PI * u);
    },
  };
};

/** Standing still; `looks` is a piecewise path of look targets over u. */
const stand = (at: P, dur: number, looks: ReadonlyArray<readonly [number, P]>, events?: Segment['events'], fov?: number): Segment => {
  const p = v(at);
  const targets = looks.map(([u, t]) => [u, v(t)] as const);
  return {
    kind: 'stand',
    dur,
    events,
    pose: (u, o) => {
      o.pos.copy(p);
      o.bob = 0;
      o.roll = 0;
      o.fov = fov ?? null;
      let i = 0;
      while (i < targets.length - 1 && targets[i + 1][0] <= u) i++;
      const [u0, t0] = targets[i];
      const [u1, t1] = targets[Math.min(i + 1, targets.length - 1)];
      const k = u1 > u0 ? smooth(Math.min(1, Math.max(0, (u - u0) / (u1 - u0)))) : 0;
      o.look = (o.look ?? new Vector3()).lerpVectors(t0, t1, k);
    },
  };
};

const rise = (from: P, to: P, dur: number, lookAt: P, events?: Segment['events']): Segment => {
  const a = v(from), b = v(to), t = v(lookAt);
  return {
    kind: 'rise',
    dur,
    events,
    pose: (u, o) => {
      lerpPose(a, b, smooth(u), o);
      o.look = (o.look ?? new Vector3()).set(t.x, o.pos.y - 18 + 10 * u, t.z);
      o.bob = 0;
      o.fov = 74;
    },
  };
};

const glide = (from: P, dur: number): Segment => {
  const a = v(from);
  return {
    kind: 'glide',
    dur,
    events: [[0, 'leap'], [0.05, 'glide'], [0.55, 'end']],
    pose: (u, o) => {
      const d = u * 420;
      o.pos.set(a.x + Math.sin(u * 2.2) * 18, a.y - 22 * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5) - u * 40, a.z - d);
      o.look = null;
      o.bob = 0;
      o.roll = Math.sin(u * 2.2 + 0.6) * 0.12;
      o.fov = 96;
    },
  };
};

const fall = (from: P, toward: P, dur: number): Segment => {
  const a = v(from), b = v(toward);
  const dir = b.clone().sub(a).setY(0).normalize();
  return {
    kind: 'fall',
    dur,
    events: [[0, 'jump'], [0.55, 'fail']],
    pose: (u, o) => {
      o.pos.copy(a).addScaledVector(dir, 6 * u);
      o.pos.y -= 0.5 * 9.8 * (u * dur) ** 2;
      o.look = (o.look ?? new Vector3()).copy(o.pos).addScaledVector(dir, 4).setY(o.pos.y - 3 - 30 * u);
      o.bob = 0;
      o.roll = u * 0.8;
      o.fov = 80 + 20 * u;
    },
  };
};

const R = ROOFS;

// Let go a few metres before the far roof edge, then drop onto the roof.
const ZIP_RELEASE = (127 - 57.5) / (136 - 57.5);
const ROPE_RELEASE = (327.5 - 299.6) / (334 - 299.6);
function cablePoint(top: P, anchor: P, sag: number, k: number): P {
  const y = top[1] + (anchor[1] - top[1]) * k - 4 * sag * k * (1 - k) - HANG;
  return [top[0] + (anchor[0] - top[0]) * k, y, top[2] + (anchor[2] - top[2]) * k];
}
const z = (roof: { h: number }, x: number, zz: number) => eye(x, roof.h, zz);

export type Chapter = { readonly segments: readonly Segment[] };

export const CHAPTERS: readonly Chapter[] = [
  // 0 · END TO END: see prod on the horizon, the route draws itself, run, vault, first gap.
  {
    segments: [
      stand(z(R.start, 0, 10), 3.4, [[0, [0, 120, -493]], [0.55, [0, 120, -493]], [1, [0, 41, -40]]], [[0.15, 'route'], [0.5, 'card']]),
      run(z(R.start, 0, 10), z(R.start, 0, -1.5), 7.2),
      jump(z(R.start, 0, -1.5), z(R.start, 0, -4.6), 0.9, 0.5, { events: [[0, 'vault']] }),
      run(z(R.start, 0, -4.6), z(R.start, 0, -14), 7.8),
      jump(z(R.start, 0, -14), z(R.r1, 0, -22.5), 1.5, 0.85),
      decel(z(R.r1, 0, -22.5), z(R.r1, 0, -28), 1.1, [[0.5, 'paragraph']]),
    ],
  },
  // 1 · SPEED: zipline (reversible, fast) then a gap with no net (slow-mo).
  {
    segments: [
      run(z(R.r1, 0, -28), z(R.r1, 0, -55.5), 7.8, [[0.4, 'card']]),
      zip(SPOTS.zipTop, SPOTS.zipBottom, ZIP_SAG, ZIP_RELEASE, 3.2),
      jump(cablePoint(SPOTS.zipTop, SPOTS.zipBottom, ZIP_SAG, ZIP_RELEASE), z(R.r2, 0, -131.5), 0.25, 0.5),
      run(z(R.r2, 0, -131), z(R.r2, 0, -168), 8.2),
      jump(z(R.r2, 0, -168), z(R.r3, 0, -185), 3, 1.3, {
        events: [[0.24, 'slowmo-in'], [0.78, 'slowmo-out']],
        slowmo: { from: 0.22, to: 0.78, scale: 0.2 },
      }),
      decel(z(R.r3, 0, -185), z(R.r3, 0, -192), 1.2, [[0.5, 'paragraph']]),
    ],
  },
  // 2 · SHOW IT: the billboard flips from pitch to demo; slide under it.
  {
    segments: [
      run(z(R.r3, 0, -192), z(R.r3, 0, -206.5), 7.6, [[0.05, 'billboard'], [0.3, 'card']]),
      slide(z(R.r3, 0, -206.5), z(R.r3, 0, -219.5), 1.0, 1.0),
      run(z(R.r3, 0, -219.5), z(R.r3, 0, -229), 7.8),
      jump(z(R.r3, 0, -229), z(R.r4, 0, -238), 1.2, 0.8),
      decel(z(R.r4, 0, -238), z(R.r4, 0, -245), 1.2, [[0.5, 'paragraph']]),
    ],
  },
  // 3 · LIMITS: the tool tops out short of the far roof, so does your jump; someone throws you a line.
  {
    segments: [
      run(z(R.r4, 0, -245), z(R.r4, 0, -295), 8.4, [[0.6, 'card']]),
      decel(z(R.r4, 0, -295), z(R.r4, 0, -297.5), 0.8),
      stand(z(R.r4, 0, -297.5), 6.2, [
        [0, [0, 17, -330]],
        [0.12, [4, 19.5, -310]],
        [0.36, [5, 20.5, -318]],
        [0.5, [0, 16.5, -305]],
        [0.66, [0, 17.5, -306]],
        [0.78, [1.4, 20, -334]],
        [1, [0, 18.6, -315]],
      ], [[0.06, 'crane'], [0.38, 'tool-limit'], [0.5, 'self-limit'], [0.74, 'rope']]),
      hop(z(R.r4, 0, -297.5), [0, SPOTS.ropeTop[1] - HANG, SPOTS.ropeTop[2]], 0.35, 0.5),
      zip(SPOTS.ropeTop, SPOTS.ropeEnd, ROPE_SAG, ROPE_RELEASE, 1.9),
      jump(cablePoint(SPOTS.ropeTop, SPOTS.ropeEnd, ROPE_SAG, ROPE_RELEASE), z(R.r5, -1.2, -333.5), 0.5, 0.5),
      decel(z(R.r5, -1.2, -333.5), z(R.r5, 0, -341), 1.3, [[0.5, 'paragraph']]),
    ],
  },
  // 4 · JUDGMENT: AI draws five routes; the visitor picks. The branch lives in JUDGMENT_BRANCHES.
  {
    segments: [
      decel(z(R.r5, 0, -341), z(R.r5, 0, -352), 2, [[0.3, 'card']]),
      stand(z(R.r5, 0, -352), 1.4, [[0, [0, 17, -380]], [1, [2, 16, -378]]], [[0.1, 'choices']]),
    ],
  },
  // 5 · SHARE: runners on the next roofs pass the light; the city lights up.
  {
    segments: [
      run(z(R.r6, 8, -400), z(R.r6, 8, -447.5), 7.6, [[0.05, 'light-wave'], [0.1, 'card'], [0.45, 'orb-in'], [0.7, 'orb-out']]),
      jump(z(R.r6, 8, -447.5), z(R.podium, 4, -461), 1.4, 0.9),
      decel(z(R.podium, 4, -461), z(R.podium, 0, -472), 1.6, [[0.5, 'paragraph']]),
    ],
  },
  // 6 · PROMISE: ride up prod looking back at the whole run, then leap and glide.
  {
    segments: [
      run(z(R.podium, 0, -472), z(R.podium, 0, -478.5), 5),
      stand(z(R.podium, 0, -478.5), 1.0, [[0, [0, 20, -500]], [1, [0, 30, -300]]]),
      rise(z(R.podium, 0, -478.5), z(R.prod, 0, -478.5), 8, [0, 0, -200], [[0.1, 'elevator'], [0.15, 'promise']]),
      stand(z(R.prod, 0, -481.5), 1.1, [[0, [0, 140, -300]], [1, [0, 145, -560]]]),
      run(z(R.prod, 0, -481.5), z(R.prod, 0, -505.5), 7.5),
      glide(z(R.prod, 0, -505.5), 12),
    ],
  },
];

export const CHOICE_SPOT = z(R.r5, 0, -352);

/** What happens after the visitor picks a JUDGMENT route. */
export const judgmentBranch = (id: ChoiceId): readonly Segment[] => {
  const choice = CHOICES.find((c) => c.id === id)!;
  const target = z({ h: choice.target[1] }, choice.target[0], choice.target[2]);
  if (!choice.good) {
    return [run(CHOICE_SPOT, target, 7.4), fall(target, [target[0] * 1.4, target[1], target[2] - 8], 1.6)];
  }
  return [
    run(CHOICE_SPOT, z(R.r5, 8, -379.5), 7.2, [[0.1, 'good-call']]),
    run(z(R.r5, 8, -379.5), z(R.r6, 8, -392.5), 4.6),
    decel(z(R.r6, 8, -392.5), z(R.r6, 8, -400), 1.4, [[0.4, 'paragraph']]),
  ];
};

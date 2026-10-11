import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Bone, Euler, Group, MathUtils, Mesh, MeshStandardMaterial, Quaternion, Vector3, type AnimationClip } from 'three';
import { frame, getUi } from '../state';

// First-person arms: "FREE GameReady [FPS Female Arms]" by bamenwo05 (CC BY 4.0, credits in
// public/models/LICENSE.md). The artist's own poses do the hands: Fists for the sprint, Throw
// (arms out, hands open) for jumps, the zipline and the glide. On top, the shoulders swing in
// camera space: the run pump, arms raised to the handle, spread wide in the glide.

const MODEL = `${import.meta.env.BASE_URL}models/arms.glb`;
// Where the model's own first-person camera sits, in model units, and its scale to metres.
const EYE_IN_MODEL = new Vector3(0, 4.05, -0.15);
const SCALE = 0.42;

type Side = 'L' | 'R';
type Target = { armOpen: number; fingerOpen: number; pitch: number; yaw: number };
type Joint = { bone: Bone; side: Side; finger: boolean; fist: Quaternion; open: Quaternion };

const sideOf = (name: string): Side | null => (/([LR])_(?:end_)?\d+$/.exec(name)?.[1] as Side) ?? null;

/** A pose clip is a single keyframe: read each bone's quaternion at t = 0. */
function poseOf(clip: AnimationClip | undefined): Map<string, Quaternion> {
  const out = new Map<string, Quaternion>();
  for (const track of clip?.tracks ?? []) {
    const [node, prop] = track.name.split('.');
    if (prop === 'quaternion') out.set(node, new Quaternion().fromArray(track.values, 0));
  }
  return out;
}

function target(kind: string, side: Side, out: Target) {
  const s = side === 'R' ? 1 : -1;
  const pump = Math.sin((frame.stride / 1.15) * Math.PI * 0.5) * s * frame.bob;
  switch (kind) {
    case 'run': // fists low, pumping forward and back
      out.armOpen = 0; out.fingerOpen = 0; out.pitch = -0.42 + pump * 0.32; out.yaw = 0.05 * s;
      return;
    case 'air': { // reaching for the landing
      const reach = Math.sin(Math.min(1, frame.segU * 1.4) * Math.PI * 0.5);
      out.armOpen = 1; out.fingerOpen = 0.9; out.pitch = -0.25 + reach * 0.2; out.yaw = 0;
      return;
    }
    case 'zip': // hanging: arms straight up above the head, out of frame
      out.armOpen = 1; out.fingerOpen = 0; out.pitch = 1.55; out.yaw = 0.1 * s;
      return;
    case 'slide':
      if (s > 0) { out.armOpen = 1; out.fingerOpen = 0.8; out.pitch = -0.1; out.yaw = 0; }
      else { out.armOpen = 1; out.fingerOpen = 1; out.pitch = -0.85; out.yaw = -0.35; }
      return;
    case 'glide': // arms spread wide, hands flat
      out.armOpen = 1; out.fingerOpen = 1; out.pitch = -0.2; out.yaw = -0.75 * s;
      return;
    case 'fall':
      out.armOpen = 1; out.fingerOpen = 1; out.pitch = 0.6 + Math.sin(frame.gameTime * 12 + s) * 0.35; out.yaw = 0.3 * s;
      return;
    default: // standing: arms down, mostly out of frame
      out.armOpen = 0; out.fingerOpen = 0.4; out.pitch = -0.95; out.yaw = 0.05 * s;
  }
}

export function Arms() {
  const { scene, animations } = useGLTF(MODEL);
  const camera = useThree((s) => s.camera);
  const root = useRef<Group>(null);

  const rig = useMemo(() => {
    const fist = poseOf(animations.find((a) => a.name === 'Fists Pose'));
    const open = poseOf(animations.find((a) => a.name === 'Throw Pose'));
    const joints: Joint[] = [];
    const shoulders: Partial<Record<Side, Bone>> = {};
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const m = o as Mesh;
        m.frustumCulled = false;
        m.castShadow = false;
        m.receiveShadow = false;
        (m.material as MeshStandardMaterial).envMapIntensity = 0.6;
      }
      if (!(o as Bone).isBone) return;
      const bone = o as Bone;
      const side = sideOf(bone.name);
      if (!side) return;
      if (/^Shoulder[LR]_/.test(bone.name)) shoulders[side] = bone;
      const rest = bone.quaternion.clone();
      joints.push({ bone, side, finger: bone.name.startsWith('Finger'), fist: fist.get(bone.name) ?? rest, open: open.get(bone.name) ?? rest });
    });
    return { joints, shoulders };
  }, [scene, animations]);

  const state = useMemo(
    () => ({
      cur: { L: { armOpen: 0, fingerOpen: 0, pitch: -0.9, yaw: 0 }, R: { armOpen: 0, fingerOpen: 0, pitch: -0.9, yaw: 0 } } as Record<Side, Target>,
      want: { armOpen: 0, fingerOpen: 0, pitch: 0, yaw: 0 } as Target,
      q: new Quaternion(),
      parent: new Quaternion(),
      cam: new Quaternion(),
      delta: new Quaternion(),
      euler: new Euler(0, 0, 0, 'YXZ'),
    }),
    [],
  );

  useFrame((_, dt) => {
    const ui = getUi();
    const g = root.current!;
    g.visible = ui.phase !== 'loading' && ui.phase !== 'title' && frame.kind !== 'rise';
    if (!g.visible) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    const k = 1 - Math.exp(-(frame.kind === 'run' ? 18 : 9) * dt);
    for (const side of ['L', 'R'] as const) {
      target(frame.kind, side, state.want);
      const c = state.cur[side];
      c.armOpen = MathUtils.lerp(c.armOpen, state.want.armOpen, k);
      c.fingerOpen = MathUtils.lerp(c.fingerOpen, state.want.fingerOpen, k);
      c.pitch = MathUtils.lerp(c.pitch, state.want.pitch, k);
      c.yaw = MathUtils.lerp(c.yaw, state.want.yaw, k);
    }

    // 1. The artist's poses, blended per side: arm bones by armOpen, finger bones by fingerOpen.
    for (const j of rig.joints) {
      const c = state.cur[j.side];
      j.bone.quaternion.slerpQuaternions(j.fist, j.open, j.finger ? c.fingerOpen : c.armOpen);
    }
    // 2. Swing each whole arm at the shoulder, expressed in camera space (x right, y up, -z ahead).
    g.updateMatrixWorld(true);
    state.cam.copy(camera.quaternion).invert();
    for (const side of ['L', 'R'] as const) {
      const shoulder = rig.shoulders[side];
      if (!shoulder?.parent) continue;
      const c = state.cur[side];
      shoulder.parent.getWorldQuaternion(state.parent);
      state.parent.premultiply(state.cam); // parent orientation in camera space
      state.delta.setFromEuler(state.euler.set(c.pitch, c.yaw, 0));
      // local' = P⁻¹ · Δ · P · local
      state.q.copy(state.parent).invert().multiply(state.delta).multiply(state.parent);
      shoulder.quaternion.premultiply(state.q);
    }
  });

  return (
    <group ref={root} name="arms">
      <group scale={SCALE} position={EYE_IN_MODEL.clone().multiplyScalar(-SCALE)}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL);

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, Group, MathUtils, MeshStandardMaterial, Vector3 } from 'three';
import { VALUES } from '../content';
import { frame, getUi } from '../state';
import { ACCENTS } from '../theme';

// First-person arms. They sell the run more than anything else on screen: pumping on the
// sprint, reaching in the air, gripping the zipline handle, spreading wide for the glide.
type ArmPose = { p: Vector3; r: Vector3 };
const pose = (x: number, y: number, z: number, rx: number, ry: number, rz: number): ArmPose => ({ p: new Vector3(x, y, z), r: new Vector3(rx, ry, rz) });

function target(kind: string, side: 1 | -1, out: ArmPose) {
  const s = side;
  const bob = frame.bob;
  const pump = Math.sin((frame.stride / 1.15) * Math.PI * 0.5) * s;
  switch (kind) {
    case 'run':
      out.p.set(0.3 * s, -0.37 + pump * 0.06 - Math.abs(pump) * 0.03 * bob, -0.24 + pump * 0.16 * bob);
      out.r.set(0.2 + 0.45 * pump * bob, 0.28 * s, -0.12 * s);
      return;
    case 'air': {
      const reach = Math.sin(Math.min(1, frame.segU * 1.4) * Math.PI * 0.5);
      out.p.set(0.26 * s, -0.3 + reach * 0.08, -0.28 - reach * 0.1);
      out.r.set(0.25 + reach * 0.35, 0.18 * s, -0.12 * s);
      return;
    }
    case 'zip':
      // Forearms rise from below the frame and meet at the handle, top centre.
      // Elbows above the frame: only the hands on the handle show, top centre.
      out.p.set(0.16 * s, 0.3, -0.18);
      out.r.set(0.15, 0.3 * s, 0);
      return;
    case 'slide':
      if (s > 0) { out.p.set(0.26, -0.2, -0.34); out.r.set(0.35, 0.3, -0.2); }
      else { out.p.set(-0.34, -0.42, -0.24); out.r.set(-0.7, -0.4, 0.3); }
      return;
    case 'glide':
      out.p.set(0.5 * s, -0.16, -0.26);
      out.r.set(0.05, 0.95 * s, 0.25 * s);
      return;
    case 'fall':
      out.p.set(0.3 * s, 0.05 + Math.sin(frame.gameTime * 14 + s) * 0.08, -0.3);
      out.r.set(1 + Math.sin(frame.gameTime * 11 * s) * 0.6, 0.4 * s, 0.4 * s);
      return;
    default:
      out.p.set(0.27 * s, -0.52, -0.16);
      out.r.set(-0.25, 0.25 * s, 0);
  }
}

function Arm({ side, armRef, cuff, grip }: { side: 1 | -1; armRef: React.RefObject<Group | null>; cuff: MeshStandardMaterial; grip: React.RefObject<number> }) {
  const fingers = useRef<Group>(null);
  useFrame(() => {
    // Curl the fingers around the zipline handle, relax them on the run.
    fingers.current?.children.forEach((f, i) => (f.rotation.x = 0.5 + grip.current * 1.1 + i * 0.04));
  });
  return (
    <group ref={armRef}>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.07]}>
        <cylinderGeometry args={[0.06, 0.044, 0.27, 18, 1, true]} />
        <meshStandardMaterial color="#23282F" roughness={0.8} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.2]} material={cuff}>
        <cylinderGeometry args={[0.048, 0.048, 0.028, 18]} />
      </mesh>
      <mesh position={[0.004 * side, -0.004, -0.255]} scale={[0.046, 0.022, 0.052]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#15181D" roughness={0.55} />
      </mesh>
      <group ref={fingers} position={[0.004 * side, -0.006, -0.3]}>
        {[-0.027, -0.009, 0.009, 0.027].map((x, i) => (
          <mesh key={i} position={[x * side, 0, 0]} rotation-x={0.5}>
            <capsuleGeometry args={[0.0095, 0.038 - Math.abs(x) * 0.25, 3, 8]} />
            <meshStandardMaterial color="#15181D" roughness={0.55} />
          </mesh>
        ))}
      </group>
      <mesh position={[0.048 * side, 0.002, -0.262]} rotation={[0.2, -0.7 * side, 0]}>
        <capsuleGeometry args={[0.011, 0.04, 3, 8]} />
        <meshStandardMaterial color="#15181D" roughness={0.55} />
      </mesh>
    </group>
  );
}

export function Arms() {
  const camera = useThree((s) => s.camera);
  const root = useRef<Group>(null);
  const right = useRef<Group>(null);
  const left = useRef<Group>(null);
  const handle = useRef<Group>(null);
  const cuff = useMemo(() => new MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.35 }), []);
  const tmp = useMemo(() => ({ r: pose(0, 0, 0, 0, 0, 0), l: pose(0, 0, 0, 0, 0, 0), c: new Color() }), []);
  const grip = useRef(0);

  useFrame((_, dt) => {
    const ui = getUi();
    const g = root.current!;
    g.visible = ui.phase !== 'loading' && ui.phase !== 'title' && frame.kind !== 'rise';
    if (!g.visible) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    const accent = ACCENTS[VALUES[Math.min(ui.chapter, 5)].accent];
    tmp.c.set(accent);
    cuff.color.copy(tmp.c);
    cuff.emissive.copy(tmp.c);

    const k = 1 - Math.exp(-(frame.kind === 'run' ? 22 : 10) * dt);
    for (const [ref, side, t] of [[right, 1, tmp.r], [left, -1, tmp.l]] as const) {
      target(frame.kind, side, t);
      const arm = ref.current!;
      arm.position.lerp(t.p, k);
      arm.rotation.set(MathUtils.lerp(arm.rotation.x, t.r.x, k), MathUtils.lerp(arm.rotation.y, t.r.y, k), MathUtils.lerp(arm.rotation.z, t.r.z, k));
    }
    handle.current!.visible = frame.kind === 'zip';
    grip.current = MathUtils.damp(grip.current, frame.kind === 'zip' ? 1 : frame.kind === 'run' ? 0.55 : 0.2, 10, dt);
  });

  return (
    <group ref={root}>
      <Arm side={1} armRef={right} cuff={cuff} grip={grip} />
      <Arm side={-1} armRef={left} cuff={cuff} grip={grip} />
      <group ref={handle} position={[0, 0.35, -0.47]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.34, 10]} />
          <meshStandardMaterial color="#C9CDD3" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
          <meshStandardMaterial color="#3A3F47" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

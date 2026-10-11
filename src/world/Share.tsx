import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { MathUtils } from 'three';
import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, QuadraticBezierCurve3, SphereGeometry, Vector3 } from 'three';
import { ROOFS, type Roof } from '../director/layout';
import { VALUES } from '../content';
import { firedAgo, frame, getUi } from '../state';
import { ACCENTS } from '../theme';
import { CITY } from './City';
import { Mannequin } from './Mannequin';

// SHARE: two runners on the parallel roofs pass the light; a wave lights a beacon on
// every roof of the city, and packets keep flying between rooftops after that.
const PINK = ACCENTS[VALUES[5].accent];
const PALETTE = Object.values(ACCENTS).map((c) => new Color(c));
const DIM = new Color('#D9DCE1');

// Beacons on the roofs around the run, so the wave is visible from where you stand.
const ORIGIN = { x: ROOFS.r6.x, z: -405 };
const beacons = CITY.filter((b) => Math.hypot(b.x - ORIGIN.x, b.z - ORIGIN.z) < 420)
  .sort((a, b) => Math.hypot(a.x - ORIGIN.x, a.z - ORIGIN.z) - Math.hypot(b.x - ORIGIN.x, b.z - ORIGIN.z))
  .slice(0, 220);
const WAVE_SPEED = 120; // m/s

function Beacons() {
  const mesh = useRef<InstancedMesh>(null);
  const shafts = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const geo = useMemo(() => new BoxGeometry(0.8, 5, 0.8), []);
  const shaftGeo = useMemo(() => new CylinderGeometry(1.1, 1.1, 1, 10, 1, true), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  const shaftMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false }), []);
  const color = useMemo(() => new Color(), []);
  const o = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    beacons.forEach((b, i) => {
      o.position.set(b.x + b.w * 0.25, b.h + 2.5, b.z - b.d * 0.25);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      mesh.current!.setColorAt(i, DIM);
      o.scale.set(1, 0.001, 1);
      o.updateMatrix();
      shafts.current!.setMatrixAt(i, o.matrix);
      shafts.current!.setColorAt(i, PALETTE[i % PALETTE.length]);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    shafts.current!.instanceMatrix.needsUpdate = true;
  }, [o]);

  useFrame(() => {
    const ago = firedAgo('light-wave');
    const r = ring.current!;
    r.visible = ago >= 0 && ago < 6;
    if (r.visible) {
      const radius = ago * WAVE_SPEED;
      r.scale.setScalar(Math.max(1, radius));
      (r.material as MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - ago / 6));
    }
    if (ago < 0 || !mesh.current?.instanceColor) return;
    beacons.forEach((b, i) => {
      const d = Math.hypot(b.x - ORIGIN.x, b.z - ORIGIN.z);
      const since = ago - d / WAVE_SPEED;
      const lit = Math.min(1, Math.max(0, since / 0.3));
      color.copy(DIM).lerp(PALETTE[i % PALETTE.length], lit).multiplyScalar(1 + lit * 2);
      mesh.current!.setColorAt(i, color);
      // Each beacon fires a beam of light that rises, then settles to a glow.
      const h = since < 0 ? 0.001 : Math.min(70, since * 160) * (since > 2.5 ? Math.max(0.35, 1 - (since - 2.5) * 0.3) : 1);
      o.position.set(b.x + b.w * 0.25, b.h + 5 + h / 2, b.z - b.d * 0.25);
      o.scale.set(1, Math.max(0.001, h), 1);
      o.updateMatrix();
      shafts.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current.instanceColor.needsUpdate = true;
    shafts.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geo, mat, beacons.length]} frustumCulled={false} />
      <instancedMesh ref={shafts} args={[shaftGeo, shaftMat, beacons.length]} frustumCulled={false} />
      <mesh ref={ring} position={[ORIGIN.x, ROOFS.r6.h + 2, ORIGIN.z]} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.96, 1, 128]} />
        <meshBasicMaterial color={new Color(PINK).multiplyScalar(2)} toneMapped={false} transparent blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
    </>
  );
}

// Packets arcing between rooftops once the wave has passed.
function Packets() {
  const routes = useMemo(() => {
    const out: QuadraticBezierCurve3[] = [];
    for (let i = 0; i < 26; i++) {
      const a = beacons[(i * 7) % beacons.length], b = beacons[(i * 13 + 5) % beacons.length];
      const pa = new Vector3(a.x, a.h + 3.4, a.z), pb = new Vector3(b.x, b.h + 3.4, b.z);
      const mid = pa.clone().lerp(pb, 0.5);
      mid.y += 18 + pa.distanceTo(pb) * 0.25;
      out.push(new QuadraticBezierCurve3(pa, mid, pb));
    }
    return out;
  }, []);
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => new SphereGeometry(1.4, 14, 10), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, color: new Color(PINK).multiplyScalar(2.2) }), []);
  const o = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const ago = firedAgo('light-wave');
    if (!mesh.current) return;
    mesh.current.visible = ago > 1.5;
    routes.forEach((c, i) => {
      const u = ((ago * 0.18 + i * 0.137) % 1 + 1) % 1;
      o.position.copy(c.getPoint(u));
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, routes.length]} frustumCulled={false} />;
}

function Runners() {
  const camera = useThree((s) => s.camera);
  const left = useRef<Group>(null), right = useRef<Group>(null);
  const orb = useRef<Mesh>(null);
  const lerp = useMemo(() => new Vector3(), []);
  const hand = useMemo(() => new Vector3(), []);

  const active = () => getUi().chapter === 5 && firedAgo('light-wave') >= 0;
  useFrame(() => {
    const on = active();
    const z = on ? camera.position.z - 32 : -405;
    const clampZ = (r: Roof, v: number) => Math.min(r.z + r.d / 2 - 2, Math.max(r.z - r.d / 2 + 2, v));
    left.current!.position.set(ROOFS.shareLeft.x + 2, ROOFS.shareLeft.h, clampZ(ROOFS.shareLeft, z));
    right.current!.position.set(ROOFS.shareRight.x - 3, ROOFS.shareRight.h, clampZ(ROOFS.shareRight, z + 3));

    // The orb: left runner → you → right runner.
    const inAgo = firedAgo('orb-in'), outAgo = firedAgo('orb-out');
    const o = orb.current!;
    o.visible = on && inAgo >= 0 && (outAgo < 0 || outAgo < 0.9);
    if (!o.visible) return;
    hand.set(0.45, -0.35, -0.9).applyQuaternion(camera.quaternion).add(camera.position);
    if (outAgo >= 0) {
      const k = Math.min(1, outAgo / 0.9);
      lerp.copy(hand).lerp(right.current!.position.clone().setY(right.current!.position.y + 1.4), k);
      lerp.y += Math.sin(k * Math.PI) * 4;
    } else {
      const k = Math.min(1, inAgo / 0.9);
      lerp.copy(left.current!.position).setY(left.current!.position.y + 1.4).lerp(hand, k);
      lerp.y += Math.sin(k * Math.PI) * 4;
    }
    o.position.copy(lerp);
    // Small in the hand, readable at distance.
    const near = MathUtils.clamp(o.position.distanceTo(camera.position) / 14, 0.07, 0.6);
    o.scale.setScalar(near * (1 + Math.sin(frame.gameTime * 12) * 0.08));
  });

  const running = () => (active() ? 1 : 0);
  return (
    <>
      <Mannequin ref={left} scarf={PINK} running={running} throwAt={() => firedAgo('orb-in')} rotation-y={Math.PI} />
      <Mannequin ref={right} scarf={PINK} running={running} rotation-y={Math.PI} />
      <mesh ref={orb} visible={false}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshBasicMaterial color={new Color(PINK).multiplyScalar(3)} toneMapped={false} />
      </mesh>
    </>
  );
}

export function Share() {
  return (
    <>
      <Beacons />
      <Packets />
      <Runners />
    </>
  );
}

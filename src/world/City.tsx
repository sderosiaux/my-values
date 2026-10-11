import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CylinderGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Object3D } from 'three';
import { ROUTE_ROOFS, type Roof } from '../director/layout';
import { WORLD } from '../theme';
import { facadeMaterial, plainMaterial, propMaterial } from './materials';

// Deterministic so every visitor sees the same city.
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const overlaps = (a: Roof, b: Roof, pad: number) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + pad;

// Keep the air above the run and the glide clear, keep the street gaps open.
const inCorridor = (r: Roof) => (r.z > -515 && r.z < 30 && Math.abs(r.x - 2) < 22 + r.w / 2) || (r.z <= -515 && Math.abs(r.x) < 50 && r.h > 70);

type Building = Roof & { style: number };

function generate(): Building[] {
  const rand = rng(7);
  const out: Building[] = [];
  for (let x = -460; x <= 460; x += 34) {
    for (let z = 190; z >= -1300; z -= 34) {
      const w = 14 + rand() * 13;
      const d = 14 + rand() * 13;
      const cx = x + (rand() - 0.5) * 6;
      const cz = z + (rand() - 0.5) * 6;
      const dist = Math.abs(cx);
      const tower = rand() < (dist > 120 ? 0.1 : 0.03);
      let h = dist < 70 ? 14 + rand() * 30 : dist < 200 ? 16 + rand() * 55 : 22 + rand() * 80;
      if (tower) h = 110 + rand() * 90;
      if (cz < -515 && Math.abs(cx) < 120) h = Math.min(h, 55 + rand() * 10);
      const style = tower ? 2 : Math.floor(rand() * 4);
      const r = { x: cx, z: cz, w, d, h, style };
      if (ROUTE_ROOFS.some((rr) => overlaps(r, rr, 7))) continue;
      if (inCorridor(r)) continue;
      out.push(r);
    }
  }
  return out;
}

export const CITY: readonly Building[] = generate();
const ROUTE: readonly Building[] = ROUTE_ROOFS.map((r, i) => ({ ...r, style: r.h > 100 ? 2 : [1, 0, 3, 1, 0, 2, 1, 0, 2, 3, 1][i % 11] }));

function Boxes({ items, castShadow = true }: { items: readonly Building[]; castShadow?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(facadeMaterial, []);
  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    g.setAttribute('aStyle', new InstancedBufferAttribute(new Float32Array(items.map((b) => b.style)), 1));
    return g;
  }, [items]);
  useLayoutEffect(() => {
    const o = new Object3D();
    items.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow frustumCulled={false} />;
}

// Parapets and roof clutter: what makes a white box read as a building at running speed.
function RoofDetail() {
  const lips = useRef<InstancedMesh>(null);
  const clutter = useRef<InstancedMesh>(null);
  const tanks = useRef<InstancedMesh>(null);
  const plain = useMemo(plainMaterial, []);
  const props = useMemo(propMaterial, []);
  const box = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const tank = useMemo(() => new CylinderGeometry(0.5, 0.5, 1, 14), []);

  const items = useMemo(() => {
    const rand = rng(11);
    const lip: Matrix4[] = [], units: Matrix4[] = [], tankItems: Matrix4[] = [];
    const o = new Object3D();
    const push = (arr: Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => {
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      o.rotation.set(0, ry, 0);
      o.updateMatrix();
      arr.push(o.matrix.clone());
    };
    for (const b of [...CITY, ...ROUTE]) {
      const t = 0.3, hh = 0.4;
      push(lip, b.x, b.h + hh / 2, b.z + b.d / 2 - t / 2, b.w, hh, t);
      push(lip, b.x, b.h + hh / 2, b.z - b.d / 2 + t / 2, b.w, hh, t);
      push(lip, b.x + b.w / 2 - t / 2, b.h + hh / 2, b.z, t, hh, b.d);
      push(lip, b.x - b.w / 2 + t / 2, b.h + hh / 2, b.z, t, hh, b.d);
    }
    for (const b of CITY) {
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) push(units, b.x + (rand() - 0.5) * (b.w - 4), b.h + 0.7, b.z + (rand() - 0.5) * (b.d - 4), 2 + rand() * 3, 1.4 + rand(), 1.6 + rand() * 2, Math.round(rand()) * Math.PI * 0.5);
      if (rand() < 0.25) push(tankItems, b.x + (rand() - 0.5) * (b.w - 6), b.h + 2.6, b.z + (rand() - 0.5) * (b.d - 6), 3.4, 3.2, 3.4);
    }
    // Route roofs: clutter only along the sides, the running line (|x - roof.x| < 3) stays clear.
    for (const b of ROUTE.filter((r) => r.h < 100)) {
      const n = Math.floor(b.d / 9);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const x = b.x + side * (3.6 + rand() * (b.w / 2 - 5));
        push(units, x, b.h + 0.6, b.z - b.d / 2 + 4 + (i / n) * (b.d - 8), 1.6 + rand() * 1.6, 1.2 + rand() * 0.8, 1.4 + rand() * 1.4);
      }
    }
    return { lip, units, tankItems };
  }, []);

  useLayoutEffect(() => {
    items.lip.forEach((m, i) => lips.current!.setMatrixAt(i, m));
    items.units.forEach((m, i) => clutter.current!.setMatrixAt(i, m));
    items.tankItems.forEach((m, i) => tanks.current!.setMatrixAt(i, m));
    for (const r of [lips, clutter, tanks]) r.current!.instanceMatrix.needsUpdate = true;
  }, [items]);

  return (
    <>
      <instancedMesh ref={lips} args={[box, plain, items.lip.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={clutter} args={[box, props, items.units.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={tanks} args={[tank, props, items.tankItems.length]} castShadow frustumCulled={false} />
    </>
  );
}

export function City() {
  return (
    <group>
      <Boxes items={CITY} />
      <Boxes items={ROUTE} />
      <RoofDetail />
      <mesh name="ground" rotation-x={-Math.PI / 2} position={[0, 0, -400]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color={WORLD.street} roughness={1} />
      </mesh>
    </group>
  );
}

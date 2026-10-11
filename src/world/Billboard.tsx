import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, CanvasTexture, Group, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { SPOTS } from '../director/layout';
import { VALUES } from '../content';
import { firedAgo } from '../state';
import { ACCENTS, WORLD } from '../theme';

// SHOW IT: a tri-vision billboard. Twenty triangular slats rotate one after the other,
// from "PITCH DECK" to the value. You slide under it.
const W = 14;
const H = 6;
const SLATS = 20;
const CLEARANCE = 1.6;

function faceTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 880;
  const ctx = c.getContext('2d')!;
  draw(ctx, c.width, c.height);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const label = (bg: string, fg: string, big: string, small: string) =>
  faceTexture((ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = '800 300px "Inter Tight", system-ui, sans-serif';
    ctx.fillText(big, w / 2, h * 0.56);
    ctx.font = '600 72px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(small, w / 2, h * 0.82);
  });

/** A prism slat whose three faces each show slice i of their face texture. */
function slatGeometry(i: number): BufferGeometry {
  const s = W / SLATS;
  const r = s / Math.sqrt(3);
  const p = (deg: number) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r] as const;
  const [v0, v1, v2] = [p(30), p(150), p(270)];
  const u0 = i / SLATS, u1 = (i + 1) / SLATS;
  // Each face: [leftVertex, rightVertex] as seen when that face is turned to the front.
  const faces = [
    [v1, v0],
    [v2, v1],
    [v0, v2],
  ];
  const pos: number[] = [], uv: number[] = [], nor: number[] = [];
  const geo = new BufferGeometry();
  faces.forEach(([l, rr], f) => {
    const nx = (l[1] - rr[1]), nz = -(l[0] - rr[0]);
    const len = Math.hypot(nx, nz);
    const quad = [
      [l[0], -H / 2, l[1], u0, 0], [rr[0], -H / 2, rr[1], u1, 0], [rr[0], H / 2, rr[1], u1, 1],
      [l[0], -H / 2, l[1], u0, 0], [rr[0], H / 2, rr[1], u1, 1], [l[0], H / 2, l[1], u0, 1],
    ];
    for (const [x, y, z, uu, vv] of quad) {
      pos.push(x, y, z);
      uv.push(uu, vv);
      nor.push(nx / len, 0, nz / len);
    }
    geo.addGroup(f * 6, 6, f);
  });
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  geo.computeBoundingSphere();
  return geo;
}

export function Billboard() {
  const value = VALUES[2];
  const materials = useMemo(() => {
    const a = label('#FFFFFF', '#9AA0A8', 'PITCH DECK', '47 slides · v12_final_FINAL.pptx');
    const b = label(ACCENTS[value.accent], '#FFFFFF', value.word, value.line);
    const c = label(WORLD.ink, '#FFFFFF', 'LIVE DEMO', 'it works on my machine. and on yours.');
    return [a, b, c].map((map) => new MeshStandardMaterial({ map, roughness: 0.5, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.25 }));
  }, [value]);
  const geos = useMemo(() => Array.from({ length: SLATS }, (_, i) => slatGeometry(i)), []);
  const slats = useRef<Group>(null);

  useFrame(() => {
    const ago = firedAgo('billboard');
    slats.current?.children.forEach((slat, i) => {
      const t = ago < 0 ? 0 : Math.max(0, ago - 0.55 - i * 0.045);
      // Spring-ish settle onto 120° (face B), slight overshoot like a real mechanism.
      const k = Math.min(1, t / 0.55);
      const overshoot = Math.sin(k * Math.PI) * 0.12 * (1 - k);
      slat.rotation.y = (2 * Math.PI) / 3 * (1 - Math.pow(1 - k, 3) + overshoot);
    });
  });

  const [x, y, z] = SPOTS.billboard;
  return (
    <group position={[x, y, z]}>
      {[-W / 2 - 0.3, W / 2 + 0.3].map((lx) => (
        <mesh key={lx} position={[lx, (CLEARANCE + H) / 2, 0]} castShadow>
          <boxGeometry args={[0.45, CLEARANCE + H + 0.4, 0.45]} />
          <meshStandardMaterial color="#C9CDD3" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, CLEARANCE + H + 0.25, 0]} castShadow>
        <boxGeometry args={[W + 1.2, 0.5, 0.9]} />
        <meshStandardMaterial color="#C9CDD3" roughness={0.4} metalness={0.6} />
      </mesh>
      <group ref={slats} position={[0, CLEARANCE + H / 2, 0]}>
        {geos.map((g, i) => (
          <mesh key={i} geometry={g} material={materials} position={[-W / 2 + (i + 0.5) * (W / SLATS), 0, 0]} castShadow />
        ))}
      </group>
    </group>
  );
}

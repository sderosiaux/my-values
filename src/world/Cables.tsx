import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { CatmullRomCurve3, DoubleSide, MeshBasicMaterial, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';
import { EYE, ROOFS, ROPE_SAG, SPOTS, ZIP_SAG } from '../director/layout';
import { CHAPTERS, judgmentBranch, newPose } from '../director/script';
import { VALUES } from '../content';
import { firedAgo } from '../state';
import { ACCENTS } from '../theme';

const V = (p: readonly [number, number, number]) => new Vector3(p[0], p[1], p[2]);

/** A material that only draws the first `reveal` fraction of a tube (uv.x runs along its length). */
function revealMaterial(color: string, opacity = 1, nearFade = 0) {
  const m = new MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, side: DoubleSide, depthWrite: false });
  const uniforms = { uReveal: { value: 0 }, uFrom: { value: 0 }, uNear: { value: nearFade } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong;\nvarying float vCamDist;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAlong = uv.x;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCamDist = -mvPosition.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong;\nvarying float vCamDist;\nuniform float uReveal;\nuniform float uFrom;\nuniform float uNear;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uFrom < 0.5 ? vAlong > uReveal : vAlong < 1.0 - uReveal) discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= uNear > 0.0 ? smoothstep(uNear * 0.4, uNear, vCamDist) : 1.0;');
  };
  return { m, uniforms };
}

const sag = (a: Vector3, b: Vector3, depth: number) => new QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY((a.y + b.y) / 2 - depth * 2), b);

// END TO END: the whole route, from your feet to prod, drawn in one stroke.
function RouteLine() {
  const geo = useMemo(() => {
    const pose = newPose();
    const pts: Vector3[] = [];
    const segments = [...CHAPTERS.slice(0, 4).flatMap((c) => c.segments), ...CHAPTERS[4].segments, ...judgmentBranch('c'), ...CHAPTERS[5].segments, CHAPTERS[6].segments[0]];
    for (const seg of segments) {
      if (seg.kind === 'stand' || seg.kind === 'rise' || seg.kind === 'glide' || seg.kind === 'zip') continue;
      const n = Math.max(2, Math.ceil(seg.dur * 6));
      for (let i = 0; i <= n; i++) {
        seg.pose(i / n, pose);
        const p = pose.pos.clone();
        p.y += -EYE + 0.12;
        if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.8) pts.push(p);
      }
    }
    pts.push(new Vector3(0, SPOTS.elevator[1] + 0.12, SPOTS.elevator[2]), new Vector3(0, 150, -481));
    return new TubeGeometry(new CatmullRomCurve3(pts, false, 'catmullrom', 0.2), 3000, 0.035, 5, false);
  }, []);
  const { m, uniforms } = useMemo(() => revealMaterial(ACCENTS[VALUES[0].accent], 0.95, 16), []);
  useFrame(() => {
    const ago = firedAgo('route');
    const k = ago < 0 ? 0 : Math.min(1, ago / 2.4);
    uniforms.uReveal.value = 1 - Math.pow(1 - k, 3);
    m.opacity = ago < 0 ? 0 : ago < 6 ? 0.95 : Math.max(0.35, 0.95 - (ago - 6) * 0.2);
  });
  return <mesh name="route-line" geometry={geo} material={m} frustumCulled={false} />;
}

function Zipline() {
  const top = V(SPOTS.zipTop), bottom = V(SPOTS.zipBottom);
  const cable = useMemo(() => new TubeGeometry(sag(top, bottom, ZIP_SAG), 120, 0.03, 6), []); // eslint-disable-line react-hooks/exhaustive-deps
  const amber = ACCENTS[VALUES[1].accent];
  return (
    <group>
      <mesh position={[SPOTS.zipPole[0], SPOTS.zipPole[1] + 2.3, SPOTS.zipPole[2]]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 4.6, 12]} />
        <meshStandardMaterial color={amber} roughness={0.45} />
      </mesh>
      <mesh position={[(SPOTS.zipPole[0] + SPOTS.zipTop[0] + 0.2) / 2, SPOTS.zipTop[1] + 0.12, SPOTS.zipPole[2]]} castShadow>
        <boxGeometry args={[SPOTS.zipTop[0] + 0.2 - SPOTS.zipPole[0], 0.18, 0.18]} />
        <meshStandardMaterial color={amber} roughness={0.45} />
      </mesh>
      <mesh position={[SPOTS.zipBottom[0], SPOTS.zipBottom[1] - 2.1, SPOTS.zipBottom[2]]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 4.2, 12]} />
        <meshStandardMaterial color={amber} roughness={0.45} />
      </mesh>
      <mesh name="cable" geometry={cable}>
        <meshStandardMaterial color="#3A3F47" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

// LIMITS: the line another runner throws across the gap.
function Rope() {
  const end = V(SPOTS.ropeEnd), top = V(SPOTS.ropeTop);
  const geo = useMemo(() => new TubeGeometry(sag(top, end, ROPE_SAG), 120, 0.035, 6), []); // eslint-disable-line react-hooks/exhaustive-deps
  const violet = ACCENTS[VALUES[3].accent];
  const { m, uniforms } = useMemo(() => revealMaterial(violet, 1, 4), [violet]);
  uniforms.uFrom.value = 1;
  useFrame(() => {
    const ago = firedAgo('rope');
    uniforms.uReveal.value = ago < 0 ? 0 : Math.min(1, (ago - 0.25) / 0.55);
  });
  return (
    <group>
      <mesh name="cable" geometry={geo} material={m} frustumCulled={false} />
      <mesh position={[SPOTS.ropeTop[0], ROOFS.r4.h + (SPOTS.ropeTop[1] - ROOFS.r4.h) / 2 + 0.05, SPOTS.ropeTop[2]]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, SPOTS.ropeTop[1] - ROOFS.r4.h + 0.1, 10]} />
        <meshStandardMaterial color="#C9CDD3" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  );
}

// JUDGMENT: the one route across, a steel beam to the next roof.
function Beam() {
  const a = V(SPOTS.beamStart), b = V(SPOTS.beamEnd);
  const mid = a.clone().lerp(b, 0.5);
  const len = a.distanceTo(b) + 1;
  const pitch = Math.atan2(b.y - a.y, a.z - b.z);
  return (
    <mesh name="beam" position={[mid.x, mid.y + 0.15, mid.z]} rotation-x={pitch} castShadow receiveShadow>
      <boxGeometry args={[0.7, 0.3, len]} />
      <meshStandardMaterial color="#B9BEC6" roughness={0.35} metalness={0.75} />
    </mesh>
  );
}

export function Cables() {
  return (
    <>
      <RouteLine />
      <Zipline />
      <Rope />
      <Beam />
    </>
  );
}

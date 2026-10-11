import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { ROOFS, SPOTS } from '../director/layout';
import { VALUES } from '../content';
import { firedAgo, frame } from '../state';
import { chevronMaterial } from './Judgment';
import { ACCENTS } from '../theme';
import { FONT_MONO } from './fonts';

// LIMITS, told as two readouts a game would show you:
// the tool pushed to its maximum reach, then your own jump, both short of the far roof.
const VIOLET = ACCENTS[VALUES[3].accent];
const EDGE_Z = ROOFS.r4.z - ROOFS.r4.d / 2; // -300
const FAR_Z = ROOFS.r5.z + ROOFS.r5.d / 2; // -330
const MAX_REACH = 24;
const SECTIONS = 4;
const SECTION_LEN = 7.5;

function Readout({ position, lines, show }: { position: [number, number, number]; lines: [string, string]; show: () => number }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const k = show();
    group.current!.visible = k > 0;
    group.current!.scale.setScalar(0.85 + Math.min(1, k) * 0.15);
  });
  return (
    <Billboard ref={group} position={position}>
      <Text font={FONT_MONO} fontSize={0.9} color={VIOLET} anchorY="bottom" outlineWidth={0.05} outlineColor="#ffffff">
        {lines[0]}
      </Text>
      <Text font={FONT_MONO} fontSize={0.55} color="#17202B" anchorY="top" position={[0, -0.08, 0]} outlineWidth={0.04} outlineColor="#ffffff">
        {lines[1]}
      </Text>
    </Billboard>
  );
}

// The tool: a telescopic boom lift that extends toward the far roof and stops short.
function BoomLift() {
  const [bx, by, bz] = SPOTS.crane;
  const sections = useRef<Group>(null);
  const lamp = useRef<Mesh>(null);
  const extended = () => {
    const ago = firedAgo('crane');
    if (ago < 0) return 0;
    const k = Math.min(1, ago / 2.2);
    return 1 - Math.pow(1 - k, 3);
  };
  useFrame(({ clock }) => {
    const e = extended();
    const reach = 6 + (MAX_REACH - 6) * e;
    // Strain at full extension: a damped shiver, then a slow sag.
    const strain = e >= 1 ? Math.exp(-(firedAgo('crane') - 2.2) * 2) * Math.sin(clock.elapsedTime * 38) * 0.004 : 0;
    sections.current!.rotation.x = 0.06 - e * 0.025 + strain;
    sections.current!.children.forEach((s, i) => {
      s.position.z = -((reach - SECTION_LEN) * i) / (SECTIONS - 1) - SECTION_LEN / 2;
    });
    const lampOn = e >= 1 && Math.floor(clock.elapsedTime * 3) % 2 === 0;
    (lamp.current!.material as MeshStandardMaterial).emissiveIntensity = lampOn ? 4 : 0.2;
    lamp.current!.position.z = -reach;
  });
  return (
    <group position={[bx, by, bz]}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.2, 4]} />
        <meshStandardMaterial color={VIOLET} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1, 0.8, 20]} />
        <meshStandardMaterial color="#D5D8DD" roughness={0.45} metalness={0.4} />
      </mesh>
      <group ref={sections} position={[0, 2.2, 0]}>
        {Array.from({ length: SECTIONS }, (_, i) => (
          <mesh key={i} castShadow>
            <boxGeometry args={[0.9 - i * 0.14, 0.75 - i * 0.12, SECTION_LEN]} />
            <meshStandardMaterial color={i % 2 ? '#E9EAEE' : VIOLET} roughness={0.45} metalness={0.2} />
          </mesh>
        ))}
        <mesh ref={lamp}>
          <sphereGeometry args={[0.22, 14, 10]} />
          <meshStandardMaterial color="#FF3B30" emissive="#FF3B30" emissiveIntensity={0.2} toneMapped={false} />
        </mesh>
      </group>
      <Readout position={[0, 4.2, -MAX_REACH + 1]} lines={['MAX REACH 24 m', `needs ${Math.round(-FAR_Z + bz)} m`]} show={() => (firedAgo('self-limit') >= 0 ? 0 : firedAgo('tool-limit'))} />
    </group>
  );
}

// You: a jump preview, drawn as a ribbon of chevrons that runs out over the gap and dives.
function JumpArc() {
  const geo = useMemo(() => {
    const y0 = ROOFS.r4.h + 0.45;
    const n = 60, half = 0.45;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const d = t * 9; // metres out from the edge
      const air = Math.min(d, 7) / 7;
      const y = y0 + 1.3 * 4 * air * (1 - air) - Math.max(0, d - 7) * 3;
      const z = EDGE_Z + 0.5 - d;
      pos.push(-half, y, z, half, y, z);
      uv.push(0, t, 1, t);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, []);
  const { m, uniforms } = useMemo(() => chevronMaterial(new Color(VIOLET)), []);
  uniforms.uLen.value = 11;
  const group = useRef<Group>(null);
  useFrame(() => {
    const ago = firedAgo('self-limit');
    group.current!.visible = ago >= 0;
    uniforms.uTime.value = frame.gameTime;
    m.opacity = Math.min(1, Math.max(0, ago) / 0.5);
  });
  return (
    <group>
      <group ref={group}>
        <mesh geometry={geo} material={m} />
      </group>
      <Readout position={[0, ROOFS.r4.h + 2.2, EDGE_Z - 6]} lines={['YOUR JUMP 7 m', 'not enough on your own']} show={() => firedAgo('self-limit')} />
    </group>
  );
}

export function Limits() {
  return (
    <>
      <BoomLift />
      <JumpArc />
    </>
  );
}

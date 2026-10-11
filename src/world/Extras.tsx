import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import { ROOFS, SPOTS } from '../director/layout';
import { VALUES } from '../content';
import { firedAgo, getUi } from '../state';
import { ACCENTS, WORLD } from '../theme';
import { FONT_DISPLAY } from './fonts';
import { Mannequin } from './Mannequin';

// END TO END: the AC unit you vault over, in runner-vision red.
function VaultBox() {
  const [x, y, z] = SPOTS.vaultBox;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.1, 1.4]} />
        <meshStandardMaterial color={ACCENTS[VALUES[0].accent]} roughness={0.5} />
      </mesh>
      {[-0.8, 0.8].map((dx) => (
        <mesh key={dx} position={[dx, 1.11, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.45, 24]} />
          <meshStandardMaterial color="#B8361F" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// LIMITS: the runner on the far roof who throws you a line.
function RopeRunner() {
  const [x, y, z] = SPOTS.ropeRunner;
  const box = 1.1;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, box / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, box, 1.6]} />
        <meshStandardMaterial color="#E2E4E8" roughness={0.7} />
      </mesh>
      <Mannequin position={[0, box, 0]} scarf={ACCENTS[VALUES[3].accent]} throwAt={() => firedAgo('rope')} />
    </group>
  );
}

// PROMISE: prod, on the horizon the whole run, and the lift up its face. The lift is open on
// the side you walk in from; its glass gate rises once you're aboard.
function Prod() {
  const camera = useThree((s) => s.camera);
  const lift = useRef<Group>(null);
  const gate = useRef<Mesh>(null);
  useFrame(() => {
    if (!lift.current || !gate.current) return;
    const riding = getUi().chapter === 6 && Math.abs(camera.position.z - SPOTS.elevator[2]) < 1 && camera.position.y > ROOFS.podium.h + 1;
    lift.current.position.y = riding ? camera.position.y - 1.7 : ROOFS.podium.h;
    const ago = firedAgo('elevator');
    gate.current.position.y = ago < 0 ? -0.6 : Math.min(0.55, -0.6 + ago * 2.4);
  });
  return (
    <group>
      <group position={[SPOTS.prodSign[0], SPOTS.prodSign[1], SPOTS.prodSign[2] + 0.2]}>
        <mesh position={[0, 0, -0.6]} castShadow>
          <boxGeometry args={[26, 13, 1]} />
          <meshStandardMaterial color={WORLD.concrete} roughness={0.8} />
        </mesh>
        <Text font={FONT_DISPLAY} fontSize={11} color={ACCENTS[VALUES[0].accent]} anchorX="center" anchorY="middle" letterSpacing={0.02}>
          PROD
        </Text>
      </group>
      <group ref={lift} position={[0, ROOFS.podium.h, SPOTS.elevator[2]]}>
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.2, 3]} />
          <meshStandardMaterial color="#C9CDD3" metalness={0.6} roughness={0.35} />
        </mesh>
        {[-1.68, 1.68].map((x) => (
          <mesh key={x} position={[x, 0.65, 0]}>
            <boxGeometry args={[0.04, 1.1, 3]} />
            <meshStandardMaterial color="#DCE8F5" transparent opacity={0.3} roughness={0.05} metalness={0.2} />
          </mesh>
        ))}
        <mesh ref={gate} position={[0, -0.6, 1.48]}>
          <boxGeometry args={[3.4, 1.1, 0.04]} />
          <meshStandardMaterial color="#DCE8F5" transparent opacity={0.3} roughness={0.05} metalness={0.2} />
        </mesh>
      </group>
      {[-1.95, 1.95].map((x) => (
        <mesh key={x} position={[x, 80, SPOTS.elevator[2] - 1.2]}>
          <boxGeometry args={[0.22, 160, 0.22]} />
          <meshStandardMaterial color="#C9CDD3" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function Extras() {
  return (
    <>
      <VaultBox />
      <RopeRunner />
      <Prod />
    </>
  );
}

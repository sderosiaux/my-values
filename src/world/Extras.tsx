import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
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

// PROMISE: prod, on the horizon the whole run, and the lift up its face.
function Prod() {
  const camera = useThree((s) => s.camera);
  const lift = useRef<Group>(null);
  useFrame(() => {
    if (!lift.current) return;
    const riding = getUi().chapter === 6 && Math.abs(camera.position.z - SPOTS.elevator[2]) < 1 && camera.position.y > ROOFS.podium.h + 1;
    lift.current.position.y = riding ? camera.position.y - 1.7 : ROOFS.podium.h;
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
        <mesh position={[0, 0.6, 1.5]}>
          <boxGeometry args={[3.4, 1.1, 0.05]} />
          <meshStandardMaterial color="#DCE8F5" transparent opacity={0.35} roughness={0.05} metalness={0.2} />
        </mesh>
      </group>
      <mesh position={[0, 1, SPOTS.elevator[2] + 0.2]}>
        <boxGeometry args={[0.3, 300, 0.3]} />
        <meshStandardMaterial color="#C9CDD3" metalness={0.6} roughness={0.35} />
      </mesh>
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

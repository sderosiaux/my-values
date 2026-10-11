import { Text } from '@react-three/drei';
import { ROOFS } from '../director/layout';
import { VALUES } from '../content';
import { ACCENTS, WORLD } from '../theme';
import { FONT_DISPLAY, FONT_MONO } from './fonts';

type SignProps = { position: [number, number, number]; rotationY?: number; index: number; size: number; slab?: number };

// Supergraphics: each value painted huge on a wall the camera faces during its chapter.
function Supergraphic({ position, rotationY = 0, index, size, slab }: SignProps) {
  const v = VALUES[index];
  return (
    <group position={position} rotation-y={rotationY}>
      {slab && (
        <mesh position={[0, (position[1] + size * 1.5) / 2 - position[1], -1.2]} castShadow receiveShadow>
          <boxGeometry args={[slab, position[1] + size * 1.5, 2]} />
          <meshStandardMaterial color={WORLD.concrete} roughness={0.85} />
        </mesh>
      )}
      <Text font={FONT_DISPLAY} fontSize={size} color={ACCENTS[v.accent]} anchorX="center" anchorY="bottom" letterSpacing={-0.02}>
        {v.word}
      </Text>
      <Text font={FONT_MONO} fontSize={size * 0.16} color={WORLD.ink} anchorX="center" anchorY="top" position={[0, -size * 0.12, 0]}>
        {v.line}
      </Text>
    </group>
  );
}

export function Signs() {
  return (
    <>
      <Supergraphic index={0} position={[36, 47, -108]} rotationY={-0.45} size={8} slab={48} />
      <Supergraphic index={1} position={[-40, 34, -158]} rotationY={0.5} size={6.5} slab={44} />
      <Supergraphic index={3} position={[0, 7.5, ROOFS.r5.z + ROOFS.r5.d / 2 + 0.05]} size={5.2} />
      <group position={[0, ROOFS.r5.h + 0.03, -364]} rotation-x={-Math.PI / 2}>
        <Text font={FONT_DISPLAY} fontSize={4.2} color={ACCENTS[VALUES[4].accent]} anchorX="center" anchorY="middle" letterSpacing={-0.02}>
          {VALUES[4].word}
        </Text>
      </group>
      <Supergraphic index={5} position={[-30, 30, -470]} rotationY={0.45} size={7} slab={40} />
    </>
  );
}

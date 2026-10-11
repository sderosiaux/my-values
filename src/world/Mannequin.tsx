import { useFrame, type ThreeElements } from '@react-three/fiber';
import { forwardRef, useRef } from 'react';
import type { Group } from 'three';

const INK = '#2A2D33';

export type MannequinProps = ThreeElements['group'] & { running?: () => number; throwAt?: () => number; scarf: string };

// A stylized runner: capsule limbs swung procedurally. Read as a silhouette against white roofs.
export const Mannequin = forwardRef<Group, MannequinProps>(function Mannequin({ running, throwAt, scarf, ...props }, ref) {
  const armL = useRef<Group>(null), armR = useRef<Group>(null), legL = useRef<Group>(null), legR = useRef<Group>(null);
  useFrame(({ clock }) => {
    const r = running?.() ?? 0;
    const ph = clock.elapsedTime * 9;
    const swing = Math.sin(ph) * 0.9 * r;
    const thrown = throwAt?.() ?? -1;
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = thrown >= 0 && thrown < 1.2 ? -2.6 * Math.sin(Math.min(1, thrown / 0.5) * Math.PI * 0.9) : -swing;
    if (legL.current) legL.current.rotation.x = -swing * 0.8;
    if (legR.current) legR.current.rotation.x = swing * 0.8;
  });
  return (
    <group ref={ref} {...props}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.55, 4, 8]} />
        <meshStandardMaterial color={INK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color={INK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.52, 0.02]}>
        <torusGeometry args={[0.15, 0.05, 6, 16]} />
        <meshStandardMaterial color={scarf} emissive={scarf} emissiveIntensity={0.6} />
      </mesh>
      {[[armL, -0.27], [armR, 0.27]].map(([r, x], i) => (
        <group key={i} ref={r as React.RefObject<Group>} position={[x as number, 1.5, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.48, 4, 6]} />
            <meshStandardMaterial color={INK} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {[[legL, -0.11], [legR, 0.11]].map(([r, x], i) => (
        <group key={i} ref={r as React.RefObject<Group>} position={[x as number, 0.9, 0]}>
          <mesh position={[0, -0.43, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.7, 4, 6]} />
            <meshStandardMaterial color={INK} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

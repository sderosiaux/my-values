import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, MeshBasicMaterial, Vector3, type Group } from 'three';
import { audio } from '../audio/engine';
import { director } from '../director/Director';
import { CHOICES, SPOTS, type ChoiceId } from '../director/layout';
import { VALUES } from '../content';
import { firedAgo, frame, getUi } from '../state';
import { ACCENTS, WORLD } from '../theme';
import { FONT_DISPLAY, FONT_MONO } from './fonts';

// JUDGMENT: five holographic routes "suggested by the AI". Chevrons flow toward each target.
const AI = new Color(WORLD.ai);
const GOOD = new Color(ACCENTS[VALUES[4].accent]);
const BAD = new Color('#FF3B30');
const HOVER = new Color('#FFFFFF');

export function chevronMaterial(color: Color = AI) {
  const m = new MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false, side: DoubleSide, depthWrite: false });
  const uniforms = { uTime: { value: 0 }, uLen: { value: 1 } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vUv2;\nuniform float uTime;\nuniform float uLen;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float along = vUv2.y * uLen;
        float across = abs(vUv2.x - 0.5) * 2.0;
        float chev = fract(along * 0.45 - uTime * 1.6 + across * 0.35);
        float band = smoothstep(0.0, 0.08, chev) * (1.0 - smoothstep(0.38, 0.5, chev));
        float edge = smoothstep(0.82, 1.0, across);
        diffuseColor.a *= max(band * 0.85, edge * 0.9) * (1.0 - smoothstep(0.9, 1.0, vUv2.y) * 0.0);`,
      );
  };
  return { m, uniforms };
}

function Route({ id, label, target, good }: { id: ChoiceId; label: string; target: readonly [number, number, number]; good: boolean }) {
  const from = new Vector3(SPOTS.choice[0], SPOTS.choice[1], SPOTS.choice[2] - 1.5);
  const to = new Vector3(...target);
  const len = from.distanceTo(to);
  const mid = from.clone().lerp(to, 0.5);
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const { m, uniforms } = useMemo(() => chevronMaterial(), []);
  const [hover, setHover] = useState(false);
  const labelRef = useRef<Group>(null);
  uniforms.uLen.value = len;

  useFrame(() => {
    const shown = firedAgo('choices');
    uniforms.uTime.value = frame.gameTime;
    const base = shown < 0 ? 0 : Math.min(1, shown / 0.8);
    const choosing = getUi().phase === 'choosing';
    const mine = frame.picked === id;
    m.color.copy(mine ? (good ? GOOD : BAD) : hover && choosing ? HOVER : AI);
    m.opacity = frame.picked && !mine ? base * 0.12 : base;
    // Labels stand where the routes end, so they go once a route is picked.
    if (labelRef.current) labelRef.current.visible = shown >= 0 && !frame.picked;
  });

  return (
    <group>
      <mesh
        position={[mid.x, mid.y + 0.05, mid.z]}
        rotation={[-Math.PI / 2, 0, yaw + Math.PI]}
        material={m}
        onPointerOver={(e) => { e.stopPropagation(); if (getUi().phase === 'choosing') { setHover(true); audio.play('ui-hover', 0.7); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); document.body.style.cursor = ''; director.choose(id); }}
      >
        <planeGeometry args={[1.6, len, 1, 1]} />
      </mesh>
      <Billboard ref={labelRef} name="timed-label" position={[to.x, to.y + 2.4, to.z]}>
        <Text font={FONT_DISPLAY} fontSize={0.9} color={hover ? WORLD.ink : WORLD.ai} anchorY="bottom" outlineWidth={0.04} outlineColor="#ffffff">
          {id.toUpperCase()}
        </Text>
        <Text font={FONT_MONO} fontSize={0.32} color={WORLD.ink} anchorY="top" position={[0, -0.1, 0]} outlineWidth={0.03} outlineColor="#ffffff">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

export function Judgment() {
  return (
    <group>
      {CHOICES.map((c) => (
        <Route key={c.id} {...c} />
      ))}
    </group>
  );
}

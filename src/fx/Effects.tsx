import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, HueSaturation, N8AO, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, Effect, ToneMappingMode, type ChromaticAberrationEffect, type DepthOfFieldEffect, type HueSaturationEffect, type VignetteEffect } from 'postprocessing';
import { useMemo, useRef } from 'react';
import { MathUtils, Uniform, Vector2 } from 'three';
import { frame, getUi } from '../state';

// Speed: samples toward the screen centre, stronger at the edges. Reads as motion blur at a sprint.
class RadialBlurEffect extends Effect {
  constructor() {
    super(
      'RadialBlur',
      /* glsl */ `
      uniform float strength;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 dir = uv - vec2(0.5);
        float s = strength * smoothstep(0.12, 0.75, length(dir));
        vec4 acc = inputColor;
        for (int i = 1; i < 10; i++) acc += texture2D(inputBuffer, uv - dir * s * float(i) / 10.0);
        outputColor = acc / 10.0;
      }`,
      { uniforms: new Map([['strength', new Uniform(0)]]) },
    );
  }
}

export function Effects({ quality }: { quality: 'high' | 'low' }) {
  const radial = useMemo(() => new RadialBlurEffect(), []);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const hue = useRef<HueSaturationEffect>(null);
  const vignette = useRef<VignetteEffect>(null);
  const caOffset = useMemo(() => new Vector2(), []);

  useFrame((_, dt) => {
    const reduced = getUi().reducedMotion;
    const speed = MathUtils.clamp((frame.speed - 7) / 18, 0, 1);
    const gliding = frame.kind === 'glide' || frame.kind === 'rise';
    const s = reduced ? 0 : gliding ? speed * 0.35 : speed;
    const strength = radial.uniforms.get('strength')!;
    strength.value = MathUtils.damp(strength.value, s * 0.075 + frame.slowmo * 0.02, 6, dt);
    caOffset.set(0.0004 + s * 0.0022 + frame.slowmo * 0.003, 0.0002 + s * 0.001);
    if (ca.current) ca.current.offset = caOffset;
    if (hue.current) hue.current.saturation = -0.55 * frame.slowmo;
    if (vignette.current) vignette.current.darkness = 0.32 + frame.slowmo * 0.35;
    if (dof.current) dof.current.bokehScale = frame.slowmo * 5;
  });

  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      {quality === 'high' ? <N8AO aoRadius={3} intensity={3.2} distanceFalloff={1} quality="medium" halfRes /> : <></>}
      {quality === 'high' ? <DepthOfField ref={dof} focusDistance={0.02} focalLength={0.06} bokehScale={0} /> : <></>}
      <Bloom intensity={0.55} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
      <primitive object={radial} />
      <ChromaticAberration ref={ca} offset={caOffset} radialModulation modulationOffset={0.25} />
      <HueSaturation ref={hue} saturation={0} />
      <Vignette ref={vignette} offset={0.32} darkness={0.32} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

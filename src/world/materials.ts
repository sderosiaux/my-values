import { Color, MeshStandardMaterial } from 'three';
import { WORLD } from '../theme';

// White concrete with procedural glazing on vertical faces and paving on roofs. World-space,
// so it works on instanced boxes of any size without UVs. Per-instance `aStyle` picks the facade:
// 0 punched windows · 1 ribbon windows · 2 curtain wall · 3 concrete with slits.
export function facadeMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: new Color(WORLD.concrete), roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aStyle;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying float vStyle;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 wp = vec4(transformed, 1.0);
        vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
          wn = mat3(instanceMatrix) * wn;
        #endif
        vWPos = (modelMatrix * wp).xyz;
        vWNorm = normalize(mat3(modelMatrix) * wn);
        vStyle = aStyle;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNorm;
        varying float vStyle;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float glazing;
        float band(float x, float a, float b) { return step(a, x) * step(x, b); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 n = normalize(vWNorm);
        float wall = 1.0 - step(0.5, abs(n.y));
        vec2 g = vec2(dot(vWPos.xz, vec2(-n.z, n.x)), vWPos.y);
        float above = step(4.5, vWPos.y);
        float st = floor(vStyle + 0.5);
        float win = 0.0;
        vec2 cell = vec2(0.0);
        if (st < 0.5) {
          vec2 c = vec2(3.0, 3.6); cell = floor(g / c); vec2 f = fract(g / c);
          win = band(f.x, 0.2, 0.8) * band(f.y, 0.24, 0.78);
        } else if (st < 1.5) {
          vec2 c = vec2(1.6, 3.6); cell = floor(g / c); vec2 f = fract(g / c);
          win = band(f.y, 0.3, 0.82) * band(f.x, 0.04, 1.0);
        } else if (st < 2.5) {
          vec2 c = vec2(1.5, 3.6); cell = floor(g / c); vec2 f = fract(g / c);
          win = band(f.x, 0.05, 0.97) * band(f.y, 0.05, 0.96);
        } else {
          vec2 c = vec2(4.2, 3.6); cell = floor(g / c); vec2 f = fract(g / c);
          win = band(f.x, 0.44, 0.56) * band(f.y, 0.15, 0.85);
        }
        glazing = win * wall * above;
        float h = wHash(cell + floor(vWPos.xz * 0.013) * 17.0);
        vec3 glass = mix(vec3(0.36, 0.52, 0.72), vec3(0.66, 0.77, 0.88), h);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, glazing);
        // Roof paving: tile joints and per-slab tone give the eye a speed reference.
        float roof = step(0.5, n.y) * step(4.5, vWPos.y);
        vec2 tile = vWPos.xz / 1.25;
        vec2 tf = fract(tile);
        float joint = 1.0 - band(tf.x, 0.025, 0.975) * band(tf.y, 0.025, 0.975);
        float tone = (wHash(floor(tile)) - 0.5) * 0.05;
        diffuseColor.rgb *= 1.0 - roof * (joint * 0.09 - tone);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.06, glazing);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.55, glazing);`,
      );
  };
  return m;
}

export const plainMaterial = () => new MeshStandardMaterial({ color: WORLD.concrete, roughness: 0.85 });
export const propMaterial = () => new MeshStandardMaterial({ color: WORLD.concreteShade, roughness: 0.7 });

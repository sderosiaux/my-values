import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import {
  Bone, BufferAttribute, Color, Group, LatheGeometry, MathUtils, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial,
  Quaternion, ShaderChunk, SkinnedMesh, Vector2, Vector3,
} from 'three';
import { VALUES } from '../content';
import { frame, getUi } from '../state';
import { ACCENTS } from '../theme';

// First-person arms: real hands (the WebXR generic hand, MIT, see public/models/LICENSE.md)
// coming out of a white technical sleeve. They sell the run more than anything else on screen.

const BASE = import.meta.env.BASE_URL;
const HAND_URL = { 1: `${BASE}models/hand-right.glb`, [-1]: `${BASE}models/hand-left.glb` } as const;
// The mesh is light (1.4k vertices): past this curl the knuckles fold into blocks.
const MAX_CURL = 0.95;

// ---------- Skin ----------

/**
 * Skin: light wraps past the terminator and shifts red (a stand-in for subsurface scattering),
 * fine pores break up the specular, fingertips and knuckles run warmer, palms lighter.
 * `aTone` (per vertex, computed from the bind pose): x = warmth, y = palm side.
 */
function skinMaterial() {
  const m = new MeshPhysicalMaterial({ color: '#D7A084', roughness: 0.5, sheen: 0.4, sheenRoughness: 0.55, sheenColor: new Color('#FFCDBB'), clearcoat: 0.06, clearcoatRoughness: 0.55 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTone;\nvarying vec2 vTone;\nvarying vec3 vSkinPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTone = aTone;\nvSkinPos = position * 900.0;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vTone;
        varying vec3 vSkinPos;
        float pHash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 271.3))) * 43758.5453); }
        float pNoise(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(pHash(i), pHash(i + vec3(1,0,0)), f.x), mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x), mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.02, 0.86, 0.82), vTone.x * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.02, 1.0), vTone.y * 0.6);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float pore = pNoise(vSkinPos) - 0.5;
        normal = normalize(normal + vec3(pore * 0.025, (pNoise(vSkinPos.yzx) - 0.5) * 0.025, 0.0));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (pNoise(vSkinPos * 0.5) - 0.5) * 0.18, 0.3, 0.75);`,
      )
      .replace(
        '#include <lights_physical_pars_fragment>',
        ShaderChunk.lights_physical_pars_fragment.replace(
          'vec3 irradiance = dotNL * directLight.color;',
          `float wrapNL = saturate((dot(geometryNormal, directLight.direction) + 0.45) / 1.45);
          vec3 scatter = mix(vec3(1.0), vec3(1.0, 0.6, 0.5), (1.0 - dotNL) * 0.55);
          vec3 irradiance = wrapNL * scatter * directLight.color;`,
        ),
      );
  };
  return m;
}

/** Per-vertex tone from the bind pose: warmth toward the fingertips and over the knuckles, palm side. */
function addTone(mesh: SkinnedMesh, wrist: Bone) {
  const toWrist = new Matrix4().copy(wrist.matrixWorld).invert().multiply(mesh.matrixWorld);
  const normalMat = new Matrix4().extractRotation(toWrist);
  const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal;
  const tone = new Float32Array(pos.count * 2);
  const p = new Vector3(), n = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(toWrist);
    n.fromBufferAttribute(nor, i).applyMatrix4(normalMat).normalize();
    const along = -p.z; // metres from the wrist toward the fingertips
    const tips = MathUtils.smoothstep(along, 0.13, 0.19);
    const knuckles = Math.exp(-(((along - 0.095) / 0.012) ** 2)) * MathUtils.clamp(n.y, 0, 1);
    tone[i * 2] = Math.min(1, tips + knuckles * 0.8);
    tone[i * 2 + 1] = MathUtils.clamp(-n.y, 0, 1);
  }
  mesh.geometry.setAttribute('aTone', new BufferAttribute(tone, 2));
}

// ---------- Hand ----------

type HandRig = { joints: Array<{ bone: Bone; rest: Quaternion; k: number }> };

const FLEX: ReadonlyArray<readonly [string, number]> = [
  ...['index', 'middle', 'ring', 'pinky'].flatMap((f, i) => [
    [`${f}-finger-phalanx-proximal`, 0.85 + i * 0.05] as const,
    [`${f}-finger-phalanx-intermediate`, 1.05] as const,
    [`${f}-finger-phalanx-distal`, 0.75] as const,
  ]),
  ['thumb-phalanx-proximal', 0.45],
  ['thumb-phalanx-distal', 0.6],
];
const X_AXIS = new Vector3(1, 0, 0);
const tmpQ = new Quaternion();

/** WebXR joints: -Z toward the fingertip, +Y on the back of the hand. Flexing is a turn about local X. */
function curlHand(rig: HandRig, curl: number) {
  for (const { bone, rest, k } of rig.joints) bone.quaternion.copy(rest).multiply(tmpQ.setFromAxisAngle(X_AXIS, -curl * k));
}

function RealHand({ side, rig, skin }: { side: 1 | -1; rig: RefObject<HandRig | null>; skin: MeshPhysicalMaterial }) {
  const { scene } = useGLTF(HAND_URL[side]);
  const setup = useMemo(() => {
    const bones: Record<string, Bone> = {};
    scene.traverse((o) => {
      if ((o as Bone).isBone) bones[o.name] = o as Bone;
    });
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const mesh = o as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      if (!mesh.geometry.attributes.aTone) addTone(mesh, bones.wrist);
      mesh.material = skin;
      mesh.frustumCulled = false;
    });
    // Put the wrist joint at the origin with the hand-frame convention: fingers -z, back of hand +y.
    const align = bones.wrist.getWorldQuaternion(new Quaternion()).invert();
    const offset = bones.wrist.getWorldPosition(new Vector3()).negate();
    rig.current = { joints: FLEX.filter(([n]) => bones[n]).map(([n, k]) => ({ bone: bones[n], rest: bones[n].quaternion.clone(), k })) };
    return { align, offset };
  }, [scene, skin, rig]);
  return (
    <group quaternion={setup.align}>
      <group position={setup.offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// ---------- Sleeve ----------

/** A white technical sleeve from the elbow to the wrist, bunched in soft folds. */
function sleeveGeometry() {
  const pts: Vector2[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 = wrist, 1 = elbow
    const r = 0.041 + t * 0.017 + Math.sin(t * 19) * 0.0022 * t + Math.sin(t * 7.3) * 0.0016;
    pts.push(new Vector2(r, -0.25 + t * 0.32));
  }
  const g = new LatheGeometry(pts, 32);
  g.rotateX(Math.PI / 2); // y → -z: wrist end toward -z
  g.computeVertexNormals();
  return g;
}

// ---------- Poses ----------

type ArmPose = { p: Vector3; r: Vector3; curl: number; roll: number };
const pose = (): ArmPose => ({ p: new Vector3(), r: new Vector3(), curl: 0.3, roll: 0 });

// Roll is about the forearm: 0 = palm down; -s·π/2 = palm turned in, thumb up.
function target(kind: string, side: 1 | -1, out: ArmPose) {
  const s = side;
  const bob = frame.bob;
  const pump = Math.sin((frame.stride / 1.15) * Math.PI * 0.5) * s;
  switch (kind) {
    case 'run':
      out.p.set(0.29 * s, -0.36 + pump * 0.06 - Math.abs(pump) * 0.03 * bob, -0.22 + pump * 0.16 * bob);
      out.r.set(0.22 + 0.45 * pump * bob, 0.26 * s, 0);
      out.curl = 0.9;
      out.roll = -1.35 * s;
      return;
    case 'air': {
      const reach = Math.sin(Math.min(1, frame.segU * 1.4) * Math.PI * 0.5);
      out.p.set(0.25 * s, -0.3 + reach * 0.08, -0.26 - reach * 0.1);
      out.r.set(0.25 + reach * 0.35, 0.18 * s, 0);
      out.curl = 0.3;
      out.roll = -0.7 * s;
      return;
    }
    case 'zip':
      // Elbows above the frame: only the hands, gripping the handle, show at the top.
      out.p.set(0.15 * s, 0.31, -0.16);
      out.r.set(0.15, 0.3 * s, 0);
      out.curl = MAX_CURL;
      out.roll = 0.15 * s;
      return;
    case 'slide':
      if (s > 0) { out.p.set(0.26, -0.2, -0.32); out.r.set(0.35, 0.3, 0); out.curl = 0.4; out.roll = -0.9; }
      else { out.p.set(-0.34, -0.42, -0.22); out.r.set(-0.7, -0.4, 0); out.curl = 0.15; out.roll = 0.2; }
      return;
    case 'glide':
      // Flat hands, palms down, arms spread wide.
      out.p.set(0.48 * s, -0.16, -0.24);
      out.r.set(0.05, 0.95 * s, 0);
      out.curl = 0.08;
      out.roll = -0.15 * s;
      return;
    case 'fall':
      out.p.set(0.3 * s, 0.05 + Math.sin(frame.gameTime * 14 + s) * 0.08, -0.3);
      out.r.set(1 + Math.sin(frame.gameTime * 11 * s) * 0.6, 0.4 * s, 0);
      out.curl = 0.15;
      out.roll = -0.6 * s;
      return;
    default:
      out.p.set(0.27 * s, -0.5, -0.16);
      out.r.set(-0.25, 0.25 * s, 0);
      out.curl = 0.45;
      out.roll = -1.2 * s;
  }
}

// ---------- Assembly ----------

function Arm({ side, armRef, roll, rig, cuff, skin, sleeve }: {
  side: 1 | -1;
  armRef: RefObject<Group | null>;
  roll: RefObject<Group | null>;
  rig: RefObject<HandRig | null>;
  cuff: MeshStandardMaterial;
  skin: MeshPhysicalMaterial;
  sleeve: MeshStandardMaterial;
}) {
  const geo = useMemo(sleeveGeometry, []);
  return (
    <group ref={armRef}>
      <group ref={roll}>
        <mesh geometry={geo} material={sleeve} />
        <mesh material={cuff} position={[0, 0, -0.236]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.0425, 0.0425, 0.012, 32, 1, true]} />
        </mesh>
        <group position={[0, 0, -0.238]}>
          <RealHand side={side} rig={rig} skin={skin} />
        </group>
      </group>
    </group>
  );
}

export function Arms() {
  const camera = useThree((s) => s.camera);
  const root = useRef<Group>(null);
  const right = useRef<Group>(null), left = useRef<Group>(null);
  const rollR = useRef<Group>(null), rollL = useRef<Group>(null);
  const rigR = useRef<HandRig | null>(null), rigL = useRef<HandRig | null>(null);
  const handle = useRef<Group>(null);
  const skin = useMemo(skinMaterial, []);
  const sleeve = useMemo(() => new MeshStandardMaterial({ color: '#F2F3F5', roughness: 0.9 }), []);
  const cuff = useMemo(() => new MeshStandardMaterial({ roughness: 0.45, emissiveIntensity: 0.25 }), []);
  const tmp = useMemo(() => ({ r: pose(), l: pose(), c: new Color(), curl: { r: 0.3, l: 0.3 } }), []);

  useFrame((_, dt) => {
    const ui = getUi();
    const g = root.current!;
    g.visible = ui.phase !== 'loading' && ui.phase !== 'title' && frame.kind !== 'rise';
    if (!g.visible) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    tmp.c.set(ACCENTS[VALUES[Math.min(ui.chapter, 5)].accent]);
    cuff.color.copy(tmp.c);
    cuff.emissive.copy(tmp.c);

    const k = 1 - Math.exp(-(frame.kind === 'run' ? 22 : 10) * dt);
    const arms = [
      [right, rollR, rigR, 1, tmp.r, 'r'],
      [left, rollL, rigL, -1, tmp.l, 'l'],
    ] as const;
    for (const [ref, rollRef, rig, side, t, key] of arms) {
      target(frame.kind, side, t);
      const arm = ref.current!;
      arm.position.lerp(t.p, k);
      arm.rotation.set(MathUtils.lerp(arm.rotation.x, t.r.x, k), MathUtils.lerp(arm.rotation.y, t.r.y, k), MathUtils.lerp(arm.rotation.z, t.r.z, k));
      rollRef.current!.rotation.z = MathUtils.lerp(rollRef.current!.rotation.z, t.roll, k);
      tmp.curl[key] = MathUtils.damp(tmp.curl[key], Math.min(MAX_CURL, t.curl), 12, dt);
      if (rig.current) curlHand(rig.current, tmp.curl[key]);
    }
    handle.current!.visible = frame.kind === 'zip';
  });

  return (
    <group ref={root} name="arms">
      <Arm side={1} armRef={right} roll={rollR} rig={rigR} cuff={cuff} skin={skin} sleeve={sleeve} />
      <Arm side={-1} armRef={left} roll={rollL} rig={rigL} cuff={cuff} skin={skin} sleeve={sleeve} />
      <group ref={handle} position={[0, 0.36, -0.46]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.016, 0.016, 0.34, 14]} />
          <meshStandardMaterial color="#C9CDD3" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.4, 6]} />
          <meshStandardMaterial color="#3A3F47" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}


import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, DirectionalLight, FogExp2, Object3D, ShaderMaterial, Vector3 } from 'three';
import { SUN_DIR } from '../director/layout';
import { WORLD } from '../theme';

const SUN = new Vector3(...SUN_DIR).normalize();

// Bright hazy morning: gradient dome with a sun glow, exponential fog for aerial perspective,
// one shadow-casting sun that follows the camera.
export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sun = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);

  useMemo(() => {
    scene.fog = new FogExp2(WORLD.fog, 0.00115);
    scene.background = new Color(WORLD.fog);
  }, [scene]);

  const dome = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new Color(WORLD.fog) },
          uZenith: { value: new Color(WORLD.zenith) },
          uSun: { value: SUN },
          uSunColor: { value: new Color(WORLD.sun) },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSun; uniform vec3 uSunColor; varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
          void main(){
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 c = mix(uHorizon, uZenith, pow(h, 0.5));
            // Cumulus band: projected on a plane above the city, thinning toward the zenith.
            vec2 uv = d.xz / max(d.y, 0.06) * 0.9;
            float cl = smoothstep(0.52, 0.78, fbm(uv * 1.4 + vec2(3.0, 1.0)));
            cl *= smoothstep(0.02, 0.12, d.y) * (1.0 - smoothstep(0.45, 0.9, d.y));
            c = mix(c, vec3(1.0), cl * 0.85);
            float s = max(dot(d, uSun), 0.0);
            c += uSunColor * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.28);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );

  const fwd = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    target.position.copy(camera.position).addScaledVector(fwd, 30);
    target.position.y = Math.max(0, camera.position.y - 6);
    target.updateMatrixWorld();
    l.position.copy(target.position).addScaledVector(SUN, 160);
  });

  return (
    <>
      <mesh material={dome} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[2600, 32, 16]} />
      </mesh>
      <hemisphereLight args={['#CFE0FF', '#DCD3C6', 0.62]} />
      <directionalLight
        ref={sun}
        target={target}
        color={WORLD.sun}
        intensity={3.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <primitive object={target} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#BFD5EE']} />
        <Lightformer intensity={2.5} position={[SUN.x * 10, SUN.y * 10, SUN.z * 10]} scale={[6, 6, 1]} color={WORLD.sun} />
        <Lightformer intensity={0.8} rotation-x={Math.PI / 2} position={[0, 8, 0]} scale={[30, 30, 1]} color="#ffffff" />
        <Lightformer intensity={0.4} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} color="#cfcac2" />
      </Environment>
    </>
  );
}

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { audio } from './audio/engine';
import { Director, director } from './director/Director';
import { Effects } from './fx/Effects';
import { Hud } from './hud/Hud';
import { setUi } from './state';
import { Arms } from './world/Arms';
import { Atmosphere } from './world/Atmosphere';
import { Billboard } from './world/Billboard';
import { Cables } from './world/Cables';
import { City } from './world/City';
import { Extras } from './world/Extras';
import { Judgment } from './world/Judgment';
import { Limits } from './world/Limits';
import { Share } from './world/Share';
import { Signs } from './world/Signs';

// QA: expose the scene to the debug hook (window.__mv.scene).
function ExposeScene() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const w = window as unknown as { __mv?: Record<string, unknown> };
    if (w.__mv) w.__mv.scene = scene;
  }, [scene]);
  return null;
}

const SHOW_ARMS = false;

export function App() {
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  useEffect(() => {
    const fonts = Promise.all([document.fonts.load('800 40px "Inter Tight"'), document.fonts.load('600 20px "JetBrains Mono"')]);
    // A missing sound file must not block the run: it just plays without that sound.
    const sound = audio.load((p) => setUi({ loadProgress: p })).catch((e) => console.error(e));
    Promise.all([fonts, sound]).then(() => setUi({ phase: 'title', loadProgress: 1 }));
  }, []);

  const start = async () => {
    await audio.start();
    director.start();
  };

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 55, near: 0.1, far: 3000, position: [-40, 95, 120] }}
        dpr={[1, quality === 'high' ? 1.75 : 1.2]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        onPointerMissed={() => director.next()}
      >
        <PerformanceMonitor onDecline={() => setQuality('low')} />
        <Suspense fallback={null}>
          <Atmosphere />
          <City />
          <Signs />
          <Billboard />
          <Limits />
          <Cables />
          <Judgment />
          <Share />
          <Extras />
        </Suspense>
        <Director />
        <ExposeScene />
        {/* First-person arms are off until a production-quality rigged, textured model replaces the
            WebXR hand (too low-poly: fingers fold into blocks). Mount after the director when back. */}
        {SHOW_ARMS && (
          <Suspense fallback={null}>
            <Arms />
          </Suspense>
        )}
        <Effects quality={quality} />
      </Canvas>
      <Hud onStart={start} />
    </>
  );
}

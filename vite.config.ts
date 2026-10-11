import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Engine libraries change far less often than the site, so they ship as their own cached chunks.
const VENDOR_GROUPS: ReadonlyArray<readonly [string, RegExp]> = [
  ['three', /node_modules[\\/]three[\\/]/],
  ['r3f', /node_modules[\\/](@react-three|three-stdlib|troika-|three-mesh-bvh|camera-controls|maath|meshline|stats-gl|suspend-react|its-fine|zustand)/],
  ['postfx', /node_modules[\\/](postprocessing|n8ao)[\\/]/],
  ['react', /node_modules[\\/](react|react-dom|scheduler)[\\/]/],
];

export default defineConfig({
  plugins: [react()],
  base: '/my-values/',
  build: {
    // three.js alone minifies to ~700 kB: a WebGL engine, not app code. The 500 kB default is
    // tuned for regular web apps; this ceiling still flags any accidental growth past the engine.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: VENDOR_GROUPS.map(([name, test]) => ({ name, test })),
        },
      },
    },
  },
});

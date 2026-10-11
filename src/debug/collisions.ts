import { Box3, InstancedMesh, Matrix4, Mesh, Vector3, type Object3D } from 'three';
import { CHAPTERS, judgmentBranch, newPose, type Segment } from '../director/script';

// QA: walk the whole scripted camera path and report every sample that comes within
// `radius` of scene geometry. Boxes are world AABBs, so tilted objects can over-report.
// Cables (you hang under them) and the JUDGMENT beam (you run on it) are excluded on purpose, and so
// are labels whose visibility is time-gated so they are gone before the camera reaches them.
export type Hit = { chapter: number; segment: number; kind: string; u: number; at: [number, number, number]; object: string };

const SKIP = new Set(['arms', 'sky', 'route-line', 'ground', 'cable', 'beam', 'timed-label']);

function boxes(scene: Object3D): Array<{ box: Box3; name: string }> {
  const out: Array<{ box: Box3; name: string }> = [];
  const m = new Matrix4();
  scene.traverse((o) => {
    let p: Object3D | null = o;
    while (p) { if (SKIP.has(p.name)) return; p = p.parent; }
    if (o instanceof InstancedMesh) {
      o.geometry.computeBoundingBox();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        out.push({ box: o.geometry.boundingBox!.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld), name: `${o.name || o.geometry.type}#${i}` });
      }
    } else if (o instanceof Mesh) {
      out.push({ box: new Box3().setFromObject(o), name: o.name || `${o.geometry.type} @ ${o.getWorldPosition(new Vector3()).toArray().map((n) => n.toFixed(1)).join(',')}` });
    }
  });
  return out;
}

export function cameraCollisions(scene: Object3D, radius = 0.25, perSecond = 40): Hit[] {
  scene.updateMatrixWorld(true);
  const all = boxes(scene);
  const hits: Hit[] = [];
  const pose = newPose();
  const chapters: Array<readonly Segment[]> = CHAPTERS.map((c, i) => (i === 4 ? [...c.segments, ...judgmentBranch('c')] : c.segments));
  chapters.forEach((segments, chapter) =>
    segments.forEach((seg, segment) => {
      const n = Math.max(2, Math.ceil(seg.dur * perSecond));
      for (let i = 0; i <= n; i++) {
        seg.pose(i / n, pose);
        const hit = all.find(({ box }) => box.distanceToPoint(pose.pos) < radius);
        if (hit) hits.push({ chapter, segment, kind: seg.kind, u: +(i / n).toFixed(3), at: pose.pos.toArray().map((v) => +v.toFixed(2)) as [number, number, number], object: hit.name });
      }
    }),
  );
  return hits;
}

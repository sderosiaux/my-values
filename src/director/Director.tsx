import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { audio, type Shot } from '../audio/engine';
import { JUDGMENT_FAIL, VALUES } from '../content';
import { frame, getUi, setUi } from '../state';
import { CHOICES, type ChoiceId } from './layout';
import { CHAPTERS, judgmentBranch, newPose, type Segment } from './script';

const JUDGMENT = 4;
const PROMISE = 6;
const BASE_FOV = 70;
const Z_AXIS = new Vector3(0, 0, 1);

const SHOT_FOR: Record<string, readonly [Shot, number, number?]> = {
  route: ['route', 0.8],
  vault: ['vault', 0.9],
  jump: ['jump', 0.8],
  land: ['land', 1],
  'zip-on': ['rope', 0.6, 1.3],
  'zip-off': ['land', 0.9],
  'slowmo-in': ['slowmo-in', 1],
  'slowmo-out': ['slowmo-out', 0.9],
  billboard: ['billboard', 0.9],
  slide: ['vault', 0.7, 0.6],
  crane: ['boom', 1],
  'tool-limit': ['warning', 0.8],
  'self-limit': ['route', 0.9, 0.7],
  rope: ['rope', 1],
  choices: ['route', 0.9, 0.8],
  'good-call': ['ui-select', 0.9],
  fail: ['ui-wrong', 1],
  'light-wave': ['light-wave', 1],
  'orb-in': ['ui-select', 0.6, 1.4],
  'orb-out': ['ui-select', 0.6, 0.9],
  elevator: ['title-swell', 0.7],
  leap: ['jump', 1, 0.8],
  end: ['achievement', 0.9],
};

// Imperative controls for the HUD (buttons, scroll prompt).
export const director = {
  start: () => {},
  next: () => {},
  prev: () => {},
  choose: (_id: ChoiceId) => {},
  /** QA only: start a chapter directly. */
  jump: (_chapter: number) => {},
};

export function Director() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const play = useRef({
    segments: [] as readonly Segment[],
    index: 0,
    t: 0, // game seconds into the current segment
    cursor: 0, // next event index in the current segment
    intro: -1, // title → first pose fly-in progress
    stride: 0,
    landAt: -10,
    shake: 0,
    failAt: -1,
    lastPos: new Vector3(),
    orbit: 0,
  });
  const scratch = useRef({ pose: newPose(), ahead: newPose(), m: new Matrix4(), q: new Quaternion(), qRoll: new Quaternion(), fwd: new Vector3(), up: new Vector3(0, 1, 0), target: new Vector3(), from: new Vector3(), fromQ: new Quaternion() });

  useEffect(() => {
    const p = play.current;

    const begin = (chapter: number, segments: readonly Segment[] = CHAPTERS[chapter].segments) => {
      p.segments = segments;
      p.index = 0;
      p.t = 0;
      p.cursor = 0;
      frame.picked = null;
      // Replaying a chapter resets its set pieces (crane, billboard, rope…) but keeps earlier ones.
      const earlier = new Set(CHAPTERS.slice(0, chapter).flatMap((c) => c.segments.flatMap((sg) => (sg.events ?? []).map(([, n]) => n))));
      for (const name of [...frame.fired.keys()]) if (!earlier.has(name)) frame.fired.delete(name);
      setUi({ phase: 'playing', chapter, showCard: false, showParagraph: false, subtitle: null });
      if (getUi().reducedMotion) skipToEnd();
    };

    // Reduced motion: no camera travel, land straight on each chapter's last frame.
    const skipToEnd = () => {
      for (const seg of p.segments) for (const [, name] of seg.events ?? []) fire(name, true);
      p.index = p.segments.length - 1;
      p.t = p.segments[p.index].dur;
      p.cursor = Number.MAX_SAFE_INTEGER;
    };

    director.start = () => {
      p.intro = 0;
      scratch.current.from.copy(camera.position);
      scratch.current.fromQ.copy(camera.quaternion);
      audio.play('title-swell', 0.9);
      audio.playMusic('run', 2.5);
      setUi({ phase: 'playing', chapter: 0 });
    };
    director.jump = (chapter) => {
      p.intro = -1;
      begin(chapter);
    };
    director.next = () => {
      const ui = getUi();
      if (ui.phase !== 'waiting') return;
      if (ui.chapter === JUDGMENT) return begin(JUDGMENT + 1);
      if (ui.chapter < PROMISE) begin(ui.chapter + 1);
    };
    director.prev = () => {
      const ui = getUi();
      if (ui.phase !== 'waiting' && ui.phase !== 'choosing') return;
      audio.play('slowmo-out', 0.6, 1.4);
      begin(Math.max(0, ui.chapter - (ui.phase === 'waiting' && ui.chapter > 0 ? 1 : 0)));
    };
    director.choose = (id) => {
      if (getUi().phase !== 'choosing') return;
      audio.play('ui-select', 0.9);
      p.segments = judgmentBranch(id);
      p.index = 0;
      p.t = 0;
      p.cursor = 0;
      setUi({ phase: 'playing', subtitle: null });
      frame.picked = id;
      if (CHOICES.find((c) => c.id === id)?.good && getUi().reducedMotion) skipToEnd();
    };

    // Input: one scroll gesture, key or swipe = one chapter.
    let lock = 0;
    const step = (dir: 1 | -1) => {
      const now = performance.now();
      if (now < lock) return;
      lock = now + 900;
      if (dir > 0) director.next();
      else director.prev();
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 18) step(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'ArrowDown', 'PageDown', 'Enter'].includes(e.code)) { e.preventDefault(); step(1); }
      if (['ArrowUp', 'PageUp'].includes(e.code)) { e.preventDefault(); step(-1); }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 40) step(dy > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    const fire = (name: string, silent = false) => {
      frame.fired.set(name, frame.gameTime);
      const shot = SHOT_FOR[name];
      if (shot && !silent) audio.play(shot[0], shot[1], shot[2] ?? 1);
      if (name === 'land' || name === 'zip-off') { p.landAt = frame.gameTime; p.shake = 1; }
      if (name === 'card') setUi({ showCard: true });
      if (name === 'paragraph') setUi({ showParagraph: true });
      if (name === 'promise') setUi({ chapter: PROMISE, showCard: true, showParagraph: true });
      if (name === 'glide') audio.playMusic('glide', 2);
      if (name === 'fail') { p.failAt = frame.gameTime; setUi({ phase: 'failed', subtitle: JUDGMENT_FAIL }); }
      if (name === 'end') setUi({ phase: 'ended' });
    };
    (play.current as unknown as { fire: typeof fire }).fire = fire;

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const p = play.current;
    const s = scratch.current;
    const ui = getUi();
    const fire = (play.current as unknown as { fire: (n: string, silent?: boolean) => void }).fire;

    // Title: slow orbit above the route, prod on the horizon.
    if (ui.phase === 'loading' || ui.phase === 'title') {
      p.orbit += dt * 0.035;
      camera.position.set(Math.sin(p.orbit) * 150 - 40, 95 + Math.sin(p.orbit * 0.7) * 8, 60 + Math.cos(p.orbit) * 60);
      camera.lookAt(0, 45, -160);
      camera.fov = 55;
      camera.updateProjectionMatrix();
      frame.gameTime += dt;
      audio.setMusicFeel(1, 20000);
      return;
    }

    // Title → first frame of the run.
    if (p.intro >= 0) {
      p.intro = Math.min(1, p.intro + dt / 2.4);
      const k = p.intro * p.intro * (3 - 2 * p.intro);
      CHAPTERS[0].segments[0].pose(0, s.pose);
      camera.position.lerpVectors(s.from, s.pose.pos, k);
      s.m.lookAt(s.pose.pos, s.pose.look!, s.up);
      s.q.setFromRotationMatrix(s.m);
      camera.quaternion.slerpQuaternions(s.fromQ, s.q, k);
      camera.fov = MathUtils.lerp(55, BASE_FOV, k);
      camera.updateProjectionMatrix();
      frame.gameTime += dt;
      if (p.intro >= 1) {
        p.intro = -1;
        p.segments = CHAPTERS[0].segments;
        p.index = 0;
        p.t = 0;
        p.cursor = 0;
        p.lastPos.copy(s.pose.pos);
        if (ui.reducedMotion) {
          for (const seg of p.segments) for (const [, name] of seg.events ?? []) fire(name, true);
          p.index = p.segments.length - 1;
          p.t = p.segments[p.index].dur;
          p.cursor = Number.MAX_SAFE_INTEGER;
        }
      }
      return;
    }

    if (!p.segments.length) return;
    const seg = p.segments[p.index];

    // Slow-mo window, ramped at both ends.
    let timeScale = 1;
    if (seg.slowmo && ui.phase === 'playing') {
      const u = p.t / seg.dur;
      const { from, to, scale } = seg.slowmo;
      const ramp = 0.06;
      const w = MathUtils.clamp(Math.min((u - from) / ramp, (to - u) / ramp), 0, 1);
      timeScale = MathUtils.lerp(1, scale, w);
    }
    frame.timeScale = timeScale;
    frame.slowmo = MathUtils.damp(frame.slowmo, timeScale < 0.99 ? 1 : 0, 6, dt);
    const gdt = dt * timeScale;
    frame.gameTime += gdt;

    // Advance through segments, firing events as their u is crossed. The glide and the
    // judgment fall keep moving under the end card and the fail message.
    const advancing = ui.phase === 'playing' || ui.phase === 'ended' || ui.phase === 'failed';
    if (advancing) {
      p.t += gdt;
      const u = Math.min(1, p.t / seg.dur);
      const events = seg.events ?? [];
      while (p.cursor < events.length && events[p.cursor][0] <= u) fire(events[p.cursor++][1]);
      if (p.t >= seg.dur) {
        if (p.index < p.segments.length - 1) {
          p.index++;
          p.t = 0;
          p.cursor = 0;
        } else {
          p.t = seg.dur;
          if (ui.phase === 'playing') onSequenceEnd(seg);
        }
      }
    }

    // Judgment fail: hold the fall, then go back to the choice.
    if (ui.phase === 'failed' && frame.gameTime - p.failAt > 2.6) {
      p.segments = CHAPTERS[JUDGMENT].segments.slice(-1);
      p.index = 0;
      p.t = p.segments[0].dur;
      p.cursor = Number.MAX_SAFE_INTEGER;
      frame.picked = null;
      setUi({ phase: 'choosing', subtitle: null });
    }

    const current = p.segments[p.index];
    const u = Math.min(1, p.t / current.dur);
    current.pose(u, s.pose);
    const pose = s.pose;
    const reduced = ui.reducedMotion;

    // Camera speed from actual displacement.
    const moved = pose.pos.distanceTo(p.lastPos);
    frame.speed = gdt > 0 ? MathUtils.damp(frame.speed, moved / Math.max(gdt, 1e-4), 8, dt) : MathUtils.damp(frame.speed, 0, 8, dt);
    p.lastPos.copy(pose.pos);

    // Footfall bob + landing dip + shake.
    p.stride += moved;
    const bob = reduced ? 0 : pose.bob * MathUtils.clamp(frame.speed / 6, 0, 1);
    const phase = (p.stride / 1.15) * Math.PI;
    const sinceLand = frame.gameTime - p.landAt;
    const dip = reduced ? 0 : sinceLand < 0.42 ? -0.45 * Math.sin((sinceLand / 0.42) * Math.PI) : 0;
    p.shake = MathUtils.damp(p.shake, 0, 7, dt);

    frame.kind = current.kind;
    frame.segU = u;
    frame.stride = p.stride;
    frame.bob = bob;

    camera.position.copy(pose.pos);
    camera.position.y += Math.abs(Math.sin(phase)) * 0.085 * bob - 0.04 * bob + dip;
    camera.position.x += Math.sin(phase * 0.5) * 0.04 * bob;

    // Orientation: explicit look target, or the direction of travel.
    if (pose.look) {
      s.target.copy(pose.look);
    } else {
      current.pose(Math.min(1, u + 0.02), s.ahead);
      s.fwd.subVectors(s.ahead.pos, pose.pos);
      if (s.fwd.lengthSq() < 1e-6) s.fwd.set(0, 0, -1);
      s.fwd.y *= 0.35; // keep the horizon calm in jumps
      s.fwd.normalize();
      s.target.copy(pose.pos).addScaledVector(s.fwd, 20);
      s.target.y -= current.kind === 'run' ? 1.2 : 0;
    }
    s.m.lookAt(camera.position, s.target, s.up);
    s.q.setFromRotationMatrix(s.m);
    const roll = (reduced ? 0 : pose.roll) + Math.sin(phase * 0.5) * 0.012 * bob + (Math.random() - 0.5) * 0.03 * p.shake;
    s.qRoll.setFromAxisAngle(Z_AXIS, roll);
    s.q.multiply(s.qRoll);
    const stiffness = current.kind === 'fall' ? 4 : current.kind === 'stand' ? 5 : 9;
    camera.quaternion.slerp(s.q, 1 - Math.exp(-stiffness * dt));

    // FOV: speed kick, tighter in slow-mo.
    const speedFov = BASE_FOV + MathUtils.clamp((frame.speed - 6) / 16, 0, 1) * 16;
    const wantFov = MathUtils.lerp(pose.fov ?? speedFov, 60, frame.slowmo * 0.8);
    camera.fov = MathUtils.damp(camera.fov, reduced ? BASE_FOV : wantFov, 4, dt);
    camera.updateProjectionMatrix();

    // Audio beds follow the motion.
    const running = current.kind === 'run' && bob > 0.25 && advancing;
    audio.setLoop('footsteps', running ? 0.55 : 0, MathUtils.clamp(frame.speed / 7.5, 0.7, 1.3));
    audio.setLoop('breath', ui.phase === 'playing' ? 0.22 : 0.08);
    audio.setLoop('wind', 0.08 + MathUtils.clamp(frame.speed / 25, 0, 1) * 0.55, 1 - frame.slowmo * 0.4);
    audio.setLoop('zipline', current.kind === 'zip' && advancing ? 0.55 : 0);
    audio.setLoop('heartbeat', frame.slowmo * 0.9);
    audio.setLoop('city', 0.22);
    audio.setLoop('glide-wind', current.kind === 'glide' ? 0.7 : 0);
    const idle = ui.phase === 'waiting' || ui.phase === 'choosing';
    audio.setMusicFeel(1 - frame.slowmo * 0.3, frame.slowmo > 0.1 ? 650 : idle ? 1800 : 20000);

    function onSequenceEnd(last: Segment) {
      const ch = getUi().chapter;
      if (ch === JUDGMENT && p.segments === CHAPTERS[JUDGMENT].segments) return setUi({ phase: 'choosing' });
      if (last.kind === 'fall') return;
      if (ch === PROMISE) return;
      setUi({ phase: 'waiting', showCard: true, showParagraph: true });
    }
  });

  return null;
}

export const valueFor = (chapter: number) => VALUES[Math.min(chapter, VALUES.length - 1)];

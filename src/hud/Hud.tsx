import { useEffect, useRef, type CSSProperties } from 'react';
import { audio } from '../audio/engine';
import { director } from '../director/Director';
import { CHOICES } from '../director/layout';
import { PROMISE, VALUES } from '../content';
import { setUi, useUi } from '../state';
import { ACCENTS } from '../theme';
import './hud.css';

const accentVar = (i: number) => ({ '--accent': ACCENTS[VALUES[Math.min(i, 5)].accent] }) as CSSProperties;

export function Hud({ onStart }: { onStart: () => void }) {
  const ui = useUi();
  const value = VALUES[Math.min(ui.chapter, 5)];
  const playing = ui.phase !== 'loading' && ui.phase !== 'title';
  const inValues = playing && ui.chapter < 6;
  // Frozen while the pill fades out, so it doesn't flip to the value after next.
  const nextLabel = useRef('');
  if (ui.phase === 'waiting') nextLabel.current = ui.chapter < 5 ? VALUES[ui.chapter + 1].word : 'prod';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (ui.phase === 'choosing' && n >= 1 && n <= CHOICES.length) director.choose(CHOICES[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.phase]);

  const toggleSound = () => {
    audio.setMuted(!ui.muted);
    setUi({ muted: !ui.muted });
  };

  return (
    <div className="hud">
      {playing && (
        <div className="route" aria-hidden style={{ opacity: ui.phase === 'ended' ? 0 : 1 }}>
          {VALUES.map((v, i) => (
            <span key={v.word} className={i < ui.chapter ? 'done' : i === ui.chapter ? 'now' : ''}>
              <i style={{ background: ACCENTS[v.accent] }} />
            </span>
          ))}
        </div>
      )}

      {playing && (
        <button className="sound" onClick={toggleSound} aria-pressed={!ui.muted}>
          {ui.muted ? 'Sound off' : 'Sound on'}
        </button>
      )}

      <section className={`strip ${inValues && ui.showCard ? 'on' : ''}`} style={accentVar(ui.chapter)} aria-live="polite">
        <h2>{value.word}</h2>
        <p className="line">{value.line}</p>
        <p className={`para ${ui.showParagraph ? 'on' : ''}`}>{value.paragraph}</p>
      </section>

      <p className={`promise ${ui.chapter === 6 && ui.showParagraph && ui.phase !== 'ended' ? 'on' : ''}`}>{PROMISE}</p>

      {/* The run moves on by itself; the bar shows when, and a click skips the wait. */}
      <button
        key={ui.autoToken}
        className={`prompt ${ui.phase === 'waiting' ? 'on' : ''}`}
        style={{ '--auto': `${ui.autoMs}ms` } as CSSProperties}
        onClick={() => director.next()}
        tabIndex={ui.phase === 'waiting' ? 0 : -1}
      >
        <span className="fill" aria-hidden />
        <span className="label">Next: {nextLabel.current}</span>
      </button>

      {ui.phase === 'choosing' && (
        <div className="choices">
          <p>
            The <b>AI</b> suggests five routes. You make the call.
          </p>
          <div className="row">
            {CHOICES.map((c, i) => (
              <button key={c.id} onMouseEnter={() => audio.play('ui-hover', 0.6)} onClick={() => director.choose(c.id)}>
                <kbd>{i + 1}</kbd>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`flash ${ui.phase === 'failed' ? 'on' : ''}`} />
      {ui.phase === 'failed' && ui.subtitle && <p className="subtitle">{ui.subtitle}</p>}

      <Unlock chapter={ui.unlockChapter} token={ui.unlockToken} />
      <TitleScreen visible={ui.phase === 'loading' || ui.phase === 'title'} loading={ui.phase === 'loading'} progress={ui.loadProgress} onStart={onStart} />
      <EndScreen visible={ui.phase === 'ended'} />
    </div>
  );
}

// Arcade beat when a value is cleared: the word slams in, sparks burst out.
const SPARKS = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { a: `${(i / 28) * 360 + r(1) * 10}deg`, d: `${140 + r(2) * 200}px`, s: `${6 + r(3) * 9}px`, delay: `${r(4) * 0.08}s`, white: i % 3 === 0 };
});

function Unlock({ chapter, token }: { chapter: number; token: number }) {
  if (!token) return null;
  const v = VALUES[Math.min(chapter, VALUES.length - 1)];
  return (
    <div key={token} className="unlock" style={accentVar(chapter)} aria-hidden>
      <div className="ring" />
      <div className="burst">
        {SPARKS.map((p, i) => (
          <i key={i} style={{ '--a': p.a, '--d': p.d, '--s': p.s, animationDelay: p.delay, background: p.white ? '#fff' : undefined } as CSSProperties} />
        ))}
      </div>
      <div className="stamp">
        <b>{v.word}</b>
        <span>This is what good looks like.</span>
      </div>
    </div>
  );
}

function TitleScreen({ visible, loading, progress, onStart }: { visible: boolean; loading: boolean; progress: number; onStart: () => void }) {
  return (
    <div className={`screen ${visible ? '' : 'off'}`}>
      <div>
        <p className="by">Stéphane Derosiaux</p>
        <h1>
          Ready to work
          <br />
          with me?
        </h1>
        <p className="sub">See what it's like, at full speed.</p>
        <button className="start" disabled={loading} onClick={onStart} autoFocus>
          {loading ? `Loading ${Math.round(progress * 100)}%` : "I'm ready"}
        </button>
        <p className="hint">Sound on. It runs on its own.</p>
      </div>
    </div>
  );
}

function EndScreen({ visible }: { visible: boolean }) {
  return (
    <div className={`screen end ${visible ? '' : 'off'}`}>
      <div>
        <h1>Your turn.</h1>
        <div className="links">
          <a className="primary" href="https://www.linkedin.com/in/stephane-derosiaux/" target="_blank" rel="noreferrer">
            Follow me on LinkedIn
          </a>
          <a href="https://github.com/sderosiaux" target="_blank" rel="noreferrer">
            See what I build on GitHub
          </a>
          <button onClick={() => location.reload()}>Run it again</button>
        </div>
      </div>
    </div>
  );
}

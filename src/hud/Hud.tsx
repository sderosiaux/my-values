import { useEffect, type CSSProperties } from 'react';
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

      <button className={`prompt ${ui.phase === 'waiting' ? 'on' : ''}`} onClick={() => director.next()} tabIndex={ui.phase === 'waiting' ? 0 : -1}>
        Scroll to keep running
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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

      <TitleScreen visible={ui.phase === 'loading' || ui.phase === 'title'} loading={ui.phase === 'loading'} progress={ui.loadProgress} onStart={onStart} />
      <EndScreen visible={ui.phase === 'ended'} />
    </div>
  );
}

function TitleScreen({ visible, loading, progress, onStart }: { visible: boolean; loading: boolean; progress: number; onStart: () => void }) {
  return (
    <div className={`screen ${visible ? '' : 'off'}`}>
      <div>
        <h1>My values</h1>
        <p className="by">Stéphane Derosiaux</p>
        <div className="bars" aria-hidden>
          {VALUES.map((v) => (
            <i key={v.word} style={{ background: ACCENTS[v.accent] }} />
          ))}
        </div>
        <button className="start" disabled={loading} onClick={onStart} autoFocus>
          {loading ? `Loading ${Math.round(progress * 100)}%` : 'Start the run'}
        </button>
        <p className="hint">Sound on, headphones help. Scroll, space or swipe to move on.</p>
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

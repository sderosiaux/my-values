// WebAudio engine: one music bus (low-pass + rate for slow-mo), looping beds with target gains,
// and one-shot effects. Buffers decode on page load; the context resumes on the first click.

const BASE = `${import.meta.env.BASE_URL}audio/`;

export const MUSIC = ['run', 'glide'] as const;
export const LOOPS = ['footsteps', 'wind', 'breath', 'zipline', 'heartbeat', 'city', 'glide-wind'] as const;
export const SHOTS = [
  'jump', 'land', 'vault', 'slowmo-in', 'slowmo-out', 'billboard', 'boom', 'warning', 'rope', 'ui-hover', 'ui-select',
  'ui-wrong', 'title-swell', 'achievement', 'light-wave', 'route', 'unlock', 'launch',
] as const;

export type Music = (typeof MUSIC)[number];
export type Loop = (typeof LOOPS)[number];
export type Shot = (typeof SHOTS)[number];

type Channel = { source: AudioBufferSourceNode; gain: GainNode };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private music = new Map<Music, Channel>();
  private loops = new Map<Loop, Channel>();
  private musicRate = 1;
  private loading: Promise<void> | null = null;
  muted = false;

  load(onProgress?: (p: number) => void): Promise<void> {
    if (this.loading) return this.loading;
    this.ctx = new AudioContext();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicFilter.Q.value = 0.7;
    this.musicFilter.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.55;
    this.musicBus.connect(this.musicFilter);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    const names = [...MUSIC, ...LOOPS, ...SHOTS];
    let done = 0;
    this.loading = Promise.all(
      names.map(async (name) => {
        const res = await fetch(`${BASE}${name}.mp3`);
        if (!res.ok) throw new Error(`audio ${name}: HTTP ${res.status}`);
        this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        onProgress?.(++done / names.length);
      }),
    ).then(() => undefined);
    return this.loading;
  }

  async start(): Promise<void> {
    await this.load().catch(() => undefined);
    await this.ctx!.resume();
    for (const loop of LOOPS) if (this.buffers.has(loop)) this.loops.set(loop, this.channel(loop, this.sfxBus, true, 0));
  }

  private channel(name: string, bus: AudioNode, loop: boolean, gain: number): Channel {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.buffers.get(name)!;
    source.loop = loop;
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(g).connect(bus);
    source.start();
    return { source, gain: g };
  }

  /** Crossfade to a music track (or silence with null). */
  playMusic(track: Music | null, fade = 1.5): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [name, ch] of this.music) {
      if (name === track) continue;
      ch.gain.gain.setTargetAtTime(0, now, fade / 3);
      ch.source.stop(now + fade * 2);
      this.music.delete(name);
    }
    if (track && !this.music.has(track) && this.buffers.has(track)) {
      const ch = this.channel(track, this.musicBus, true, 0);
      ch.source.playbackRate.value = this.musicRate;
      ch.gain.gain.setTargetAtTime(1, now, fade / 3);
      this.music.set(track, ch);
    }
  }

  /** Slow-mo and idle: rate < 1 pitches the score down, cutoff muffles it. */
  setMusicFeel(rate: number, cutoffHz: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicRate = rate;
    for (const ch of this.music.values()) ch.source.playbackRate.setTargetAtTime(rate, now, 0.08);
    this.musicFilter.frequency.setTargetAtTime(cutoffHz, now, 0.08);
  }

  setLoop(loop: Loop, gain: number, rate = 1): void {
    const ch = this.loops.get(loop);
    if (!ch || !this.ctx) return;
    const now = this.ctx.currentTime;
    ch.gain.gain.setTargetAtTime(gain, now, 0.12);
    ch.source.playbackRate.setTargetAtTime(rate, now, 0.12);
  }

  play(shot: Shot, gain = 1, rate = 1): void {
    if (!this.ctx || !this.buffers.has(shot)) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(shot)!;
    source.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    source.connect(g).connect(this.sfxBus);
    source.start();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
  }
}

export const audio = new AudioEngine();

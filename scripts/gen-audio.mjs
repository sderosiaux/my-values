// Generates the soundtrack (Lyria via Gemini API) and sound effects (ElevenLabs) into public/audio.
// Idempotent: existing files are skipped. Keys: GEMINI_API_KEY, ELEVENLABS_API_KEY.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/audio');
fs.mkdirSync(OUT, { recursive: true });

const MUSIC = [
  {
    file: 'run.mp3',
    model: 'lyria-3.5',
    prompt: `Instrumental only, no vocals. Cinematic electronic score for a first-person parkour game set on sunlit white rooftops above a clean modern city: airy, glassy, optimistic, a strong sense of speed and freedom. Clean modern mix, wide stereo.
[0:00 - 0:20] Intro: soft airy pads like wind, distant glassy bell arpeggio, slow pulse, no drums.
[0:20 - 0:50] Build: sub-bass pulse enters, crisp hi-hats, a fast arpeggiated synth gaining speed, tension rising.
[0:50 - 1:30] Run: driving breakbeat at 128 BPM, bright analog synth lead, wide airy pads, propulsive and euphoric.
[1:30 - 1:50] Breakdown: drums drop out, suspended pads, a heartbeat-like kick, a moment of focus.
[1:50 - 2:30] Climax: full energy, layered arpeggios, big uplifting chords, soaring lead.
[2:30 - 2:50] Outro: drums fade, ethereal pads and bell arpeggio, the feeling of flying above the city.`,
  },
  {
    file: 'glide.mp3',
    model: 'lyria-3-clip-preview',
    prompt: 'Instrumental only, no vocals. Euphoric cinematic finale for a video game ending where the hero glides above a sunlit city: soaring warm synth chords, shimmering arpeggios, slow wide drums, uplifting and free.',
  },
];

// [file, prompt, seconds, loop]
const SFX = [
  ['footsteps.mp3', 'fast running footsteps on a concrete rooftop, sneakers, steady sprint rhythm, close perspective, no music', 4, true],
  ['wind.mp3', 'steady high-altitude wind rushing past the ears while running fast, airy, no music', 8, true],
  ['breath.mp3', 'athletic controlled breathing of a runner during a sprint, close microphone, no music', 6, true],
  ['jump.mp3', 'quick body whoosh of a parkour jump, air movement, cloth', 1.2, false],
  ['land.mp3', 'parkour landing on a concrete roof, sneakers impact and short roll, cloth rustle', 1.2, false],
  ['vault.mp3', 'hand slap on a metal air conditioning unit and a quick vault over it', 1, false],
  ['zipline.mp3', 'metal pulley zipping fast along a steel cable, high pitched whirring', 4, true],
  ['slowmo-in.mp3', 'cinematic time slowing down effect, deep reversed whoosh into a muffled low drone', 2.5, false],
  ['slowmo-out.mp3', 'cinematic time snapping back to normal speed, sharp whoosh', 1.5, false],
  ['heartbeat.mp3', 'slow deep heartbeat thump, cinematic, no music', 3, true],
  ['billboard.mp3', 'large metal billboard panels flipping and clanking into place', 2, false],
  ['boom.mp3', 'hydraulic telescopic boom lift extending, electric motor whine and hydraulic hiss, ending with a metal strain creak at full extension', 3, false],
  ['warning.mp3', 'short industrial machine warning alarm, two tone beep, limit reached', 1.2, false],
  ['rope.mp3', 'rope thrown through the air and caught, taut snap', 1.5, false],
  ['ui-hover.mp3', 'subtle futuristic game user interface hover tick, soft', 0.5, false],
  ['ui-select.mp3', 'clean futuristic game user interface confirm chime, bright', 0.8, false],
  ['ui-wrong.mp3', 'short low digital error buzz, game user interface', 1, false],
  ['city.mp3', 'distant city ambience heard from a rooftop, faint traffic, a few birds, open air', 10, true],
  ['glide-wind.mp3', 'loud wind roar of a wingsuit glide at high speed', 6, true],
  ['title-swell.mp3', 'cinematic riser swelling into a bright impact, video game title screen start', 3, false],
  ['achievement.mp3', 'bright uplifting achievement unlocked chime, video game', 2, false],
  ['light-wave.mp3', 'shimmering magical light whoosh spreading across a city', 2, false],
  ['route.mp3', 'holographic line drawing sound, rising synthetic shimmer', 1.5, false],
];

const exists = (f) => fs.existsSync(path.join(OUT, f)) && fs.statSync(path.join(OUT, f)).size > 0;

async function music({ file, model, prompt }) {
  if (exists(file)) return console.log('skip', file);
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ model, input: prompt }),
  });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status} ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const audio = (json.steps ?? [])
    .flatMap((s) => s.content ?? [])
    .find((c) => c.type === 'audio' && c.data);
  if (!audio) throw new Error(`${file}: no audio in response ${JSON.stringify(json).slice(0, 400)}`);
  fs.writeFileSync(path.join(OUT, file), Buffer.from(audio.data, 'base64'));
  console.log('ok', file, audio.mime_type ?? audio.mimeType ?? '');
}

async function sfx([file, text, seconds, loop]) {
  if (exists(file)) return console.log('skip', file);
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.5, loop, model_id: 'eleven_text_to_sound_v2' }),
  });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  fs.writeFileSync(path.join(OUT, file), Buffer.from(await res.arrayBuffer()));
  console.log('ok', file);
}

const only = process.argv[2];
const jobs = [
  ...MUSIC.filter((m) => !only || m.file === only).map((m) => () => music(m)),
  ...SFX.filter((s) => !only || s[0] === only).map((s) => () => sfx(s)),
];
const failures = [];
const pool = Array.from({ length: 4 }, async () => {
  while (jobs.length) {
    const job = jobs.shift();
    try { await job(); } catch (e) { failures.push(e.message); console.error('FAIL', e.message); }
  }
});
await Promise.all(pool);
if (failures.length) { console.error(`${failures.length} failure(s)`); process.exit(1); }

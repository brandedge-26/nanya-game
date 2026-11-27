/* ---------------- audio: machine sounds, UI sfx, procedural music ---------------- */
const snd = { ctx: null };
function audioInit() {
  if (snd.ctx) { if (snd.ctx.state === 'suspended') snd.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = (snd.ctx = new C());
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(c.destination);
    snd.master = c.createGain(); snd.master.connect(comp);
    snd.sfx = c.createGain(); snd.sfx.connect(snd.master);
    snd.mus = c.createGain(); snd.mus.connect(snd.master);
    applyVolumes();
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    snd.nb = nb;
    const noise = () => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(); return s; };
    const gain = (v = 0) => { const g = c.createGain(); g.gain.value = v; g.connect(snd.sfx); return g; };
    const sp = c.createOscillator(); sp.type = 'sawtooth'; const spf = c.createBiquadFilter(); spf.type = 'bandpass'; spf.Q.value = 7;
    snd.spinG = gain(); sp.connect(spf); spf.connect(snd.spinG); sp.start(); snd.spin = sp; snd.spf = spf;
    const sp2 = c.createOscillator(); sp2.type = 'sine'; snd.whineG = gain(); sp2.connect(snd.whineG); sp2.start(); snd.whine = sp2;
    const cut = noise(), cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.Q.value = 1.3; snd.cutF = cf; snd.cutG = gain(); cut.connect(cf); cf.connect(snd.cutG);
    const ch = c.createOscillator(); ch.type = 'square'; const chf = c.createBiquadFilter(); chf.type = 'lowpass'; chf.frequency.value = 1900; snd.chatG = gain(); ch.connect(chf); chf.connect(snd.chatG); ch.start(); snd.chat = ch;
    const cl = noise(), clf = c.createBiquadFilter(); clf.type = 'highpass'; clf.frequency.value = 3800; snd.coolG = gain(); cl.connect(clf); clf.connect(snd.coolG);
    const hum = noise(), hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 140; snd.humG = gain(0.04); hum.connect(hf); hf.connect(snd.humG);
    const amb = noise(), af = c.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 400; af.Q.value = 0.4; snd.ambG = gain(0.0); amb.connect(af); af.connect(snd.ambG);
  } catch (e) { snd.ctx = null; }
}
function applyVolumes() { if (!snd.ctx) return; snd.sfx.gain.value = settings.sfx; snd.mus.gain.value = settings.music * 0.42; }
function tone(f, dur, g = 0.12, type = 'triangle', to, delay = 0, bus) {
  if (!snd.ctx) return;
  const c = snd.ctx, t = c.currentTime + delay, o = c.createOscillator(), gg = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + 0.008); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gg); gg.connect(bus || snd.sfx); o.start(t); o.stop(t + dur + 0.02);
}
function burst(dur, f, g, type = 'highpass', delay = 0, bus, q = 0.8) {
  if (!snd.ctx) return;
  const c = snd.ctx, t = c.currentTime + delay, s = c.createBufferSource(), gg = c.createGain(), fl = c.createBiquadFilter();
  s.buffer = snd.nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q; gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(gg); gg.connect(bus || snd.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function sweep(dur, f0, f1, g, delay = 0) {
  if (!snd.ctx) return;
  const c = snd.ctx, t = c.currentTime + delay, s = c.createBufferSource(), gg = c.createGain(), fl = c.createBiquadFilter();
  s.buffer = snd.nb; fl.type = 'bandpass'; fl.Q.value = 2.5; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + dur * 0.6); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(gg); gg.connect(snd.sfx); s.start(t); s.stop(t + dur + 0.05);
}
const sfx = {
  hover: () => tone(2400, 0.03, 0.025, 'sine'),
  click: () => { tone(1500, 0.05, 0.06, 'square'); tone(750, 0.08, 0.05, 'triangle', null, 0.02); },
  back: () => tone(600, 0.08, 0.06, 'triangle', 380),
  whoosh: () => sweep(0.45, 300, 4200, 0.35),
  impact: () => { burst(0.5, 220, 0.8, 'lowpass'); tone(55, 0.6, 0.6, 'sine', 32); },
  atc: () => { burst(0.25, 300, 0.5, 'lowpass'); tone(70, 0.3, 0.35, 'sine', 40); burst(0.12, 2500, 0.3, 'highpass', 0.18); burst(0.1, 3200, 0.2, 'highpass', 0.9); },
  spinup: () => { tone(80, 1.2, 0.08, 'sawtooth', 600); },
  snap: () => { burst(0.4, 1500, 0.9); tone(90, 0.4, 0.4, 'square', 40); },
  done: () => { tone(660, 0.12); tone(990, 0.3, 0.12, 'triangle', null, 0.12); },
  pass: () => { [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.35, 0.1, 'triangle', null, k * 0.09)); },
  stamp: () => { burst(0.25, 180, 0.9, 'lowpass'); tone(48, 0.35, 0.7, 'sine', 30); },
  tick: () => tone(1800 + Math.random() * 200, 0.025, 0.03, 'square'),
  coin: () => { tone(1320, 0.08, 0.06, 'square'); tone(1760, 0.14, 0.06, 'square', null, 0.06); },
  level: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, k) => tone(f, 0.4, 0.09, 'sawtooth', null, k * 0.07)); burst(0.8, 6000, 0.12, 'highpass', 0.35); },
  achieve: () => { [880, 1108, 1318].forEach((f, k) => tone(f, 0.5, 0.08, 'sine', null, k * 0.08)); },
  perfect: () => { tone(1568, 0.12, 0.07, 'sine'); tone(2093, 0.18, 0.06, 'sine', null, 0.05); },
  mult: (m) => { tone(400 + m * 180, 0.18, 0.08, 'sawtooth', 800 + m * 300); },
  warn: () => { tone(880, 0.09, 0.08, 'square'); tone(880, 0.09, 0.08, 'square', null, 0.14); },
  glitch: () => { for (let k = 0; k < 4; k++) burst(0.04, 2000 + Math.random() * 4000, 0.15, 'bandpass', k * 0.05, null, 6); },
  boom: () => { burst(1.4, 120, 0.9, 'lowpass'); tone(40, 1.6, 0.9, 'sine', 24); sweep(1.2, 200, 6000, 0.2); },
};

// ---- procedural music: menu (ambient pulse) and in-game (industrial techno with groove-driven layers)
const MUS = { on: false, track: 'menu', step: 0, next: 0, intensity: 0, bpm: 112 };
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G (midi)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function musicPlay(track) {
  if (!snd.ctx) return;
  if (MUS.on && MUS.track === track) return;
  MUS.track = track; MUS.bpm = track === 'menu' ? 112 : 126;
  if (!MUS.on) { MUS.on = true; MUS.step = 0; MUS.next = snd.ctx.currentTime + 0.1; }
}
function musicStop() { MUS.on = false; }
function voice(type, f, t, dur, g, cutoff, q = 1, bus) {
  const c = snd.ctx, o = c.createOscillator(), gg = c.createGain(), fl = c.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cutoff, t); fl.Q.value = q;
  gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(gg); gg.connect(bus || snd.mus); o.start(t); o.stop(t + dur + 0.05);
  return fl;
}
function musicTick() {
  if (!snd.ctx || !MUS.on) return;
  const c = snd.ctx, spb = 60 / MUS.bpm / 4;
  while (MUS.next < c.currentTime + 0.15) {
    const t = MUS.next, s = MUS.step, bar = Math.floor(s / 16), b = s % 16, chord = CHORDS[bar % 4], game = MUS.track === 'game', I = MUS.intensity;
    // kick
    if (b % 4 === 0 && (game || bar % 2 === 1 || b === 0)) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(game ? 160 : 120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(game ? 0.9 : 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32); o.connect(g); g.connect(snd.mus); o.start(t); o.stop(t + 0.35); }
    // clap
    if (game && (b === 4 || b === 12)) burst(0.14, 1700, 0.35, 'bandpass', t - c.currentTime, snd.mus, 1.2);
    // hats
    if (game ? b % 2 === 1 || (I > 0.5 && b % 2 === 0) : b % 4 === 2) burst(b % 4 === 2 ? 0.09 : 0.035, 8500, game ? 0.16 : 0.07, 'highpass', t - c.currentTime, snd.mus);
    // bass
    if (game) { const pat = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0]; if (pat[b]) voice('sawtooth', mtof(chord[0] - 24 + (b === 14 ? 7 : 0)), t, spb * 1.6, 0.22, 420 + I * 900, 6); }
    else if (b === 0 || b === 8) voice('sawtooth', mtof(chord[0] - 24), t, spb * 7, 0.12, 300, 2);
    // pad (every bar)
    if (b === 0) for (const n of chord) for (const det of [-7, 7]) { const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det; fl.type = 'lowpass'; fl.frequency.value = game ? 700 : 1100; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(game ? 0.018 : 0.03, t + spb * 6); g.gain.linearRampToValueAtTime(0.0001, t + spb * 16); o.connect(fl); fl.connect(g); g.connect(snd.mus); o.start(t); o.stop(t + spb * 16 + 0.1); }
    // arp layer (menu always soft; in game driven by the groove multiplier)
    if ((!game && b % 2 === 0) || (game && I > 0.25)) { const n = chord[(s >> (game ? 0 : 1)) % 3] + 12 + (b % 8 === 7 ? 12 : 0); voice('square', mtof(n), t, spb * 0.9, game ? 0.035 + I * 0.03 : 0.028, game ? 1800 + I * 2500 : 1400, 4); }
    MUS.next += spb; MUS.step++;
  }
}

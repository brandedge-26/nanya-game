/* ---------------- profile, progression, upgrades, achievements ---------------- */
const profile = Object.assign({ name: '', country: '', xp: 0, credits: 0, up: { coat: 0, cool: 0, bal: 0, mpg: 0 }, skin: 'carbide', skins: { carbide: true },
  stats: { jobs: 0, perfect: 0, sRanks: {}, dailies: 0, maxMult: 1, chipsCut: 0 }, ach: {}, progress: {}, seenIntro: false }, store.get('profile', {}));
const saveProfile = () => store.set('profile', profile);
const xpFor = (L) => 150 * (L - 1) * L;
function levelOf(xp) { let L = 1; while (xp >= xpFor(L + 1)) L++; return L; }
const RANKS = [[1, 'Apprentice'], [3, 'Machinist'], [5, 'Senior Machinist'], [7, 'CNC Programmer'], [9, 'Master Machinist'], [12, 'Zero Tolerance Legend']];
const rankOf = (L) => RANKS.filter(r => L >= r[0]).pop()[1];
const UPGRADES = [
  { id: 'coat', name: 'TiAlN Tool Coating', desc: 'Harder, hotter-running carbide. Cuts heat build-up.', cost: [400, 900, 1600], fx: ['−15% heat', '−28% heat', '−40% heat'], icon: '◆' },
  { id: 'cool', name: 'High-Pressure Coolant', desc: 'Bigger tank and a stronger pump at the nozzle.', cost: [350, 800, 1400], fx: ['+30% tank', '+60% tank', '+100% tank'], icon: '◉' },
  { id: 'bal', name: 'Spindle Balancing', desc: 'Dynamic balancing pushes the chatter limit up.', cost: [500, 1100, 1800], fx: ['+7% chatter limit', '+14% chatter limit', '+20% chatter limit'], icon: '◎' },
  { id: 'mpg', name: 'MPG Handwheel Pro', desc: 'Precision manual pulse generator. Gently pulls the cutter onto the line.', cost: [600, 1300], fx: ['12% path assist', '22% path assist'], icon: '✛' },
];
const SKINS = [
  { id: 'carbide', name: 'Micrograin Carbide', color: 0xb9bec5, cost: 0 }, { id: 'tin', name: 'TiN Gold', color: 0xd9a63a, cost: 250 },
  { id: 'dlc', name: 'DLC Black', color: 0x2a2c30, cost: 300 }, { id: 'altin', name: 'AlTiN Violet', color: 0x6b5fa8, cost: 450 }, { id: 'nanya', name: 'NANYA Orange', color: 0xff6900, cost: 600 },
];
const UPFX = {
  heat: () => [1, 0.85, 0.72, 0.6][profile.up.coat], tank: () => [1, 1.3, 1.6, 2][profile.up.cool], cool: () => [1, 1.15, 1.3, 1.45][profile.up.cool],
  bal: () => [1, 1.07, 1.14, 1.2][profile.up.bal], mpg: () => [0, 0.12, 0.22][profile.up.mpg],
};
const ACH = [
  ['first', 'First Chip', 'Complete your first job.'], ['flawless', 'Flawless', 'Max deviation under 0.30 mm on any job.'], ['dry', 'Dry Run', 'Pass a job without coolant.'],
  ['speed', 'Rapid Traverse', 'Finish under 80% of the target time.'], ['groove', 'In The Groove', 'Reach a x4 multiplier.'], ['hot', 'Hot Hands', 'Pass with peak tool heat above 90%.'],
  ['s3', 'Triple S', 'Earn S rank on 3 different jobs.'], ['corners', 'Corner Craftsman', 'Land 25 perfect corners in total.'], ['nv', 'High Speed Club', 'Unlock the NV-855.'],
  ['lathe', 'Turned On', 'Unlock the 3605M lathe.'], ['daily', 'Daily Grinder', 'Complete a daily part.'], ['shop', 'Tooled Up', 'Buy your first workshop upgrade.'],
  ['all3', 'Zero Tolerance', 'Three stars on every job.'], ['legend', 'Legend', 'Reach operator level 10.'],
];
const achQueue = [];
function unlock(id) { if (profile.ach[id]) return false; profile.ach[id] = Date.now(); saveProfile(); achQueue.push(id); return true; }
function totals() { let stars = 0, score = 0; for (const j of JOBS) { const p = profile.progress[j.id]; if (p) { stars += p.stars; score += p.best; } } return { stars, score }; }
const unlocked = (mid) => totals().stars >= MACHINES[mid].need;
const applySkin = () => { const s = SKINS.find(k => k.id === profile.skin) || SKINS[0]; M_cutter.color.setHex(s.color); };
applySkin();

/* ---------------- game state ---------------- */
let state = 'boot', G = null, view = 0, lastPost = null, timeScale = 1, camMode = 'menu';
const ptr = { x: 0, y: 0, down: false, has: false, cx: 0, cy: 0 };
let coolKey = false, coolBtn = false;

function resetMaterial(P) {
  if (P.lathe) { for (let k = 0; k < LW; k++) { radData[k * 4] = R0 * 10; radData[k * 4 + 1] = 0; radData[k * 4 + 2] = 0; radData[k * 4 + 3] = 0; } radTex.needsUpdate = true; }
  else { depthData.fill(0); depthTex.needsUpdate = true; }
}
function buildGuide(P) {
  const pos = guide.geometry.attributes.position.array, n = Math.min(P.n, MAXN), w = P.lathe ? 0.35 : 0.55;
  for (let i = 0; i < n; i++) {
    const a = P.pts[Math.max(0, i - 1)], b = P.pts[Math.min(n - 1, i + 1)], p = P.pts[i];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty * w, ny = tx * w;
    if (P.lathe) pos.set([p[0] + nx, p[1] + ny, 0.5, p[0] - nx, p[1] - ny, 0.5], i * 6);
    else pos.set([p[0] + nx, 0.35, p[1] + ny, p[0] - nx, 0.35, p[1] - ny], i * 6);
  }
  guide.geometry.attributes.position.needsUpdate = true;
  guide.geometry.setDrawRange(0, (n - 1) * 6);
  guide.material.depthTest = !P.lathe;
}
function colorGuide(P, i0, now) {
  const col = guide.geometry.attributes.color.array, n = Math.min(P.n, MAXN), pulse = 0.75 + Math.sin(now * 8) * 0.25;
  for (let i = 0; i < n; i++) {
    let r, g, b;
    if (i < i0) { r = g = b = 0.1; }
    else if (i < i0 + 260) {
      const fade = 1 - ((i - i0) / 260) * 0.7;
      if (P.hard[i]) { r = 2.6 * fade * pulse; g = 0.15; b = 0.35 * fade; }
      else if (P.rec[i] / P.F < 0.8) { r = 2.2 * fade; g = 0.9 * fade; b = 0; }
      else { r = g = b = 1.6 * fade; }
    } else if (P.hard[i]) { r = 0.6; g = 0.02; b = 0.08; }
    else { r = 0.35; g = 0.15; b = 0.0; }
    col.set([r, g, b, r, g, b], i * 6);
  }
  guide.geometry.attributes.color.needsUpdate = true;
}

function startJob(id) {
  const job = jobById(id), P = prepare(job), M = P.M, s = P.pts[0];
  G = {
    P, M, job, i: 0, x: s[0] + (P.lathe ? 12 : -16), y: s[1] + (P.lathe ? 16 : -16), tipY: 6, engaged: false, started: false, t: 0, heat: 0,
    tank: 100 * UPFX.tank(), coolant: 100 * UPFX.tank(), feed: 0, load: 0, devS: 0, devW: 0, devMax: 0, chS: 0, cutLen: 0, gouge: 0, broken: false, done: false, peak: 0, shake: 0,
    bins: new Float32Array(Math.ceil(P.n / 2) + 2), spin: 0, rpmNow: 0, atcT: 0, hintStage: 0, chipAcc: 0, chat: 0, coolOn: false, coolUsed: 0, removed: 0, moved: 0,
    groove: 0, mult: 1, maxMult: 1, offBand: 0, style: 0, zone: 0, zoneClean: true, perfect: 0, hardWarned: -1, endT: 0, inspT: 0,
  };
  resetMaterial(P); chips.clear(); drops.clear(); sparks.clear();
  setWorld('game'); mill.visible = !P.lathe; lathe.visible = P.lathe;
  toolU.r = (job.tool || 0.8) / 2; topMat.uniforms.toolR.value = toolU.r; topMat.uniforms.heatMix.value = 0; stockMat.uniforms.heatMix.value = 0; topMat.uniforms.showTool.value = 1;
  cutterMesh.scale.set(toolU.r, 1, toolU.r); cutterMesh.visible = true; spindle.visible = true; probe.visible = false;
  pacer.scale.setScalar(P.lathe ? 2.2 : toolU.r + 1.6); cursor.scale.setScalar(P.lathe ? 1.6 : toolU.r + 0.6); startRing.scale.setScalar(P.lathe ? 2.6 : toolU.r + 2.2);
  pacer.rotation.set(P.lathe ? 0 : -Math.PI / 2, 0, 0); cursor.rotation.copy(pacer.rotation); startRing.rotation.copy(pacer.rotation);
  buildGuide(P); colorGuide(P, 0, 0);
  key.castShadow = settings.gfx > 0;
  hudSetup(); view = 0; snapCam = true; timeScale = 1;
  screen(null); $('hud').classList.add('on');
  state = 'atc'; G.atcT = 0;
  const tname = P.lathe ? 'CNMG 0.8R turning insert' : `Ø${job.tool} carbide end mill`;
  bigMsg(P.lathe ? 'TURRET INDEX · T0101' : `TOOL CHANGE · ${P.gc[1].t.split(' ')[0]}`, `${tname} · ${M.name} ${P.lathe ? 'BMT turret' : `arm-type ATC ${M.atc} s`}`, 1.9);
  sfx.atc(); setTimeout(() => sfx.spinup(), 700);
  musicPlay('game');
}

/* ---------------- simulation ---------------- */
function popup(text, cls = '', big = false) { if (!G) return; spawnPopup(text, cls, big); }
function simulate(dt) {
  if (!G) return;
  const P = G.P, M = G.M, job = G.job;
  if (state === 'atc') {
    G.atcT += dt;
    G.rpmNow = lerp(G.rpmNow, job.rpm * clamp((G.atcT - 0.8) / 0.8, 0, 1), 0.2);
    if (G.atcT > Math.max(1.6, M.atc + 0.6)) {
      state = 'play';
      bigMsg('CYCLE START', job.tutorial ? 'Move to the orange beam, then press and hold to plunge.' : P.lathe ? 'Press and hold to feed the insert into the bar. Follow the profile toward the chuck.' : 'Press and hold to plunge. Follow the glowing toolpath.', 2.4);
      sfx.impact(); flash(0.35);
    }
    return;
  }
  if (state === 'inspect' || state === 'post') { G.inspT += dt; return; }
  if (state !== 'play') return;
  const coolOn = (coolKey || coolBtn) && G.coolant > 0 && !G.done && !G.broken;
  const engaged = ptr.down && !G.broken && !G.done;
  if (engaged && !G.started) { G.started = true; tone(220, 0.15, 0.08); }
  if (G.started && !G.done && !G.broken) G.t += dt;
  // path assist (MPG upgrade): bias the target toward the nearest path point
  let tx = ptr.x, ty = ptr.y;
  const assist = Math.min(0.4, UPFX.mpg() + (ptr.touch && settings.touchAssist ? 0.12 : 0));
  if (assist && engaged) { const p = P.pts[Math.min(P.n - 1, G.i + 4)]; tx = lerp(tx, p[0], assist); ty = lerp(ty, p[1], assist); }
  const vmax = engaged ? 110 : M.rapid * 3, dx = tx - G.x, dy = ty - G.y, d = Math.hypot(dx, dy);
  const step = Math.min(d, vmax * dt), ox = G.x, oy = G.y;
  if (ptr.has && d > 1e-4) { G.x += (dx / d) * step; G.y += (dy / d) * step; }
  if (P.lathe) G.y = Math.max(0, G.y); else { G.x = clamp(G.x, -70, 70); G.y = clamp(G.y, -50, 50); }
  const moved = Math.hypot(G.x - ox, G.y - oy);
  G.tipY = lerp(G.tipY, engaged ? -job.depth : 6, Math.min(1, dt * 14));
  const i0 = G.i, rf = P.rec[Math.min(G.i, P.n - 1)], lo = rf * 0.75, hi = rf * 1.15 * M.rig * UPFX.bal();
  let chat = 0, rub = false, removed = 0, inBand = false, bd = 9;
  if (engaged) {
    let bj = G.i; bd = 1e9;
    for (let j = Math.max(0, G.i - 6); j < Math.min(P.n, G.i + 70); j++) { const p = P.pts[j], q = (p[0] - G.x) ** 2 + (p[1] - G.y) ** 2; if (q < bd) { bd = q; bj = j; } }
    bd = Math.sqrt(bd);
    const onPath = bd < 2.2;
    if (onPath && bj > G.i) G.i = bj;
    const inst = (((G.i - i0) * 0.5) / Math.max(dt, 1e-3)) * 60;
    G.feed += (inst - G.feed) * Math.min(1, dt * 5);
    if (moved > 0) {
      if (onPath) { G.devS += bd * bd * moved; G.devW += moved; G.devMax = Math.max(G.devMax, bd); const b = G.i >> 1; G.bins[b] = Math.max(G.bins[b], bd); }
      else G.gouge += moved;
      chat = G.feed > hi ? clamp((G.feed - hi) / (0.7 * rf), 0, 1) : 0;
      if (P.hard[G.i] && G.feed > rf * 1.05) chat = Math.max(chat, 0.5); // hard spot: punishes speed
      G.chS += chat * moved; G.cutLen += moved;
      const bad = !onPath && bd > 1.2;
      if (P.lathe) removed = turnCut(ox, oy, G.x, G.y, chat, bad, bd);
      else removed = stamp(ox, oy, G.x + (Math.random() - 0.5) * chat * 0.6, G.y + (Math.random() - 0.5) * chat * 0.6, toolU.r, job.depth, chat, bad, bd);
      if (bad && bd > 3) toast('OFF THE TOOLPATH', 'red');
    }
    rub = G.started && G.t > 1.2 && G.feed < rf * 0.45;
    inBand = onPath && bd < 0.5 && G.feed >= lo && G.feed <= hi && chat < 0.05;
    G.heat += dt * ((rub ? 20 : 1.5) + chat * 22 + (P.lathe ? 1 : 0) + (P.hard[G.i] ? 4 : 0)) * UPFX.heat();
    if (chat > 0.3) { toast('CHATTER · EASE OFF', 'red'); if (Math.random() < 0.3) sparks.emit(P.lathe ? G.x : G.x, P.lathe ? G.y : 0.5, P.lathe ? 0 : G.y, (Math.random() - 0.5) * 300, 150 + Math.random() * 300, (Math.random() - 0.5) * 300, 0.3, 1); }
    else if (rub && G.heat > 40) toast('RUBBING · KEEP THE FEED UP');
  } else { G.heat -= dt * 12; G.feed += (0 - G.feed) * Math.min(1, dt * 8); }
  if (coolOn) { G.heat -= dt * 45 * UPFX.cool(); G.coolant = Math.max(0, G.coolant - dt * 12); G.coolUsed += dt * 12; }
  G.heat = clamp(G.heat, 0, 100); G.peak = Math.max(G.peak, G.heat);
  G.load = lerp(G.load, engaged ? clamp(G.feed / Math.max(1, rf) * 0.55 + chat * 0.5 + (P.lathe ? 0.1 : job.depth * 0.06), 0, 1.2) : 0.05, Math.min(1, dt * 6));
  G.shake = chat; G.chat = chat; G.coolOn = coolOn; G.engaged = engaged; G.removed = removed; G.moved = moved;
  G.rpmNow = lerp(G.rpmNow, job.rpm, 0.1);
  // groove multiplier: stay on line, in band, no chatter
  if (engaged && G.started && moved > 0) {
    if (inBand) { G.groove += dt; G.offBand = 0; G.style += dt * 12 * G.mult; }
    else { G.offBand += dt; if (G.offBand > 0.45 && G.groove > 0) { if (G.mult > 1) popup('COMBO LOST', 'lost'); G.groove = 0; } }
  }
  const m = 1 + (G.groove > 2) + (G.groove > 5) + (G.groove > 9);
  if (m > G.mult) { popup(`GROOVE x${m}`, 'mult', true); sfx.mult(m); }
  G.mult = m; G.maxMult = Math.max(G.maxMult, m);
  // perfect corners
  const Z = P.zones[G.zone];
  if (Z && engaged) {
    if (G.i >= Z[0] && G.i < Z[1] && !(inBand || (onLineLoose(bd) && G.feed <= hi))) G.zoneClean = false;
    if (G.i >= Z[1]) {
      if (G.zoneClean && G.started) { const pts = 40 * G.mult; G.style += pts; G.perfect++; popup(`PERFECT CORNER +${pts}`, 'perfect'); sfx.perfect(); }
      G.zone++; G.zoneClean = true;
    }
  }
  // hard spot warnings
  const hs = (job.hard || []).findIndex(([a]) => G.i > a * P.n - 60 && G.i < a * P.n);
  if (hs >= 0 && G.hardWarned !== hs) { G.hardWarned = hs; bigMsg('HARD SPOT AHEAD', 'Back the feed off through the red zone', 1.4, 'red'); sfx.warn(); }
  if (G.heat > 85 && Math.random() < 0.02) sfx.warn();
  if (G.heat >= 100 && !G.broken) { G.broken = true; sfx.snap(); flash(0.6); glitch(); toast('TOOL BROKEN', 'red'); for (let k = 0; k < 40; k++) sparks.emit(P.lathe ? G.x : G.x, P.lathe ? G.y : 1, P.lathe ? 0 : G.y, (Math.random() - 0.5) * 600, 100 + Math.random() * 500, (Math.random() - 0.5) * 600, 0.6, 1.2); setTimeout(() => endJob(), 1400); }
  if (G.i >= P.n - 3 && !G.done && !G.broken) { G.done = true; ptr.down = false; sfx.done(); endJob(); }
  timeScale = !G.done && G.i > P.n * 0.965 ? 0.45 : 1;
  // tutorial hints
  if (job.tutorial && settings.hints) {
    const st = G.hintStage;
    if (st === 0 && G.started) { hint('Follow the <b>pacer ring</b>. Keep the feed needle inside the <b>green band</b>.'); G.hintStage = 1; }
    else if (st === 1 && P.rec[Math.min(P.n - 1, G.i + 30)] < P.F * 0.8) { hint('<b>Orange</b> on the path is a corner. <b>Slow down</b> before it for a <b>Perfect Corner</b>.'); G.hintStage = 2; }
    else if (st === 2 && G.heat > 45) { hint('Tool is heating. Hold <b>Space</b> or tap <b>Coolant</b>.'); G.hintStage = 3; }
    else if (st === 3 && G.mult >= 2) { hint('Stay clean to build your <b>Groove</b> multiplier up to <b>x4</b>.'); G.hintStage = 4; }
  }
}
const onLineLoose = (bd) => bd < 0.7;
function turnCut(x0, y0, x1, y1, chat, bad, dev) {
  const rn = 0.8, steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.1)), dva = 1 + Math.round(clamp(dev / 1.0, 0, 1) * 254);
  let removed = 0;
  for (let s = 1; s <= steps; s++) {
    const px = x0 + ((x1 - x0) * s) / steps, py = y0 + ((y1 - y0) * s) / steps;
    const k0 = Math.max(0, Math.floor(((px - rn + 60) / 120) * LW)), k1 = Math.min(LW - 1, Math.ceil(((px + rn + 60) / 120) * LW));
    for (let k = k0; k <= k1; k++) {
      const xk = (k / LW) * 120 - 60, dxk = xk - px; if (Math.abs(dxk) > rn) continue;
      const cutR = Math.max(0, py + rn - Math.sqrt(rn * rn - dxk * dxk)), cur = radData[k * 4] / 10;
      if (cutR < cur) { removed += cur - cutR; radData[k * 4] = Math.round(cutR * 10); radData[k * 4 + 2] = Math.max(radData[k * 4 + 2] * 0.5, chat * 255); if (bad) radData[k * 4 + 1] = 255; radData[k * 4 + 3] = dva; }
    }
  }
  if (removed) radTex.needsUpdate = true;
  return removed;
}

/* ---------------- scoring ---------------- */
function evaluate() {
  const P = G.P, rms = G.devW ? Math.sqrt(G.devS / G.devW) : 9, ch = G.cutLen ? G.chS / G.cutLen : 0;
  const ra = clamp(0.4 + ch * 6, 0.4, 6.3), ok = G.done && !G.broken;
  const acc = ok ? Math.round(clamp(1 - rms / 1.2, 0, 1) * 500) : 0, fin = ok ? Math.round(clamp((6.3 - ra) / 5.9, 0, 1) * 250) : 0;
  const cyc = ok ? Math.round((clamp(P.par / Math.max(G.t, 0.1), 0, 1.25) / 1.25) * 250) : 0, pen = ok ? Math.round(G.gouge * 4) : 0;
  const style = ok ? Math.round(Math.min(250, G.style)) : 0;
  const score = Math.max(0, acc + fin + cyc + style - pen);
  const pass = ok && rms < 0.6 && G.gouge < 8;
  const grade = !pass ? 'FAIL' : score >= 1000 ? 'S' : score >= 850 ? 'A' : score >= 700 ? 'B' : 'C';
  const stars = !pass ? 0 : score >= 1000 ? 3 : score >= 850 ? 2 : 1;
  const b = G.job.bonus || {}, coolPct = G.coolUsed;
  const bonusOk = pass && ({ time: G.t <= P.par, corners: G.perfect >= (b.n || 4), dry: coolPct < 0.5, groove: G.maxMult >= 4, flawless: G.devMax < 0.35, heat: G.peak < 80 })[b.id];
  return { rms, ra, score, acc, fin, cyc, style, pen, pass, grade, stars, bonusOk: !!bonusOk, time: G.t, par: P.par, accPct: clamp(100 * (1 - rms / 1.5), 0, 100),
    pct: G.i / (P.n - 1), broken: G.broken, max: G.devMax, peak: G.peak, cool: coolPct, perfect: G.perfect, maxMult: G.maxMult };
}
function award(r) {
  const job = G.job, before = { xp: profile.xp, credits: profile.credits, level: levelOf(profile.xp), stars: totals().stars };
  let first = false;
  if (job.daily) { const k = 'daily-' + dayKey; r.best = r.score > store.get(k, 0); if (r.best) store.set(k, r.score); if (r.pass) { profile.stats.dailies++; unlock('daily'); } }
  else if (job.shift) { r.best = false; }
  else { const p = profile.progress[job.id] || { best: 0, stars: 0 }; first = !p.done && r.pass; r.best = r.score > p.best; if (r.best) p.best = r.score; p.stars = Math.max(p.stars, r.stars); if (r.pass) p.done = true; profile.progress[job.id] = p; }
  const xp = r.pass ? Math.round(r.score * 0.35 + r.stars * 50 + (r.bonusOk ? 100 : 0) + (first ? 150 : 0)) : Math.round(r.pct * 60);
  const cr = r.pass ? Math.round(r.score * 0.4 + r.stars * 60 + (r.bonusOk ? 150 : 0) + (first ? 200 : 0)) : 0;
  profile.xp += xp; profile.credits += cr; profile.stats.jobs++; profile.stats.perfect += r.perfect; profile.stats.maxMult = Math.max(profile.stats.maxMult, r.maxMult);
  if (r.grade === 'S' && !job.daily) profile.stats.sRanks[job.id] = 1;
  // achievements
  if (r.pass) unlock('first');
  if (r.pass && r.max < 0.3) unlock('flawless');
  if (r.pass && r.cool < 0.5) unlock('dry');
  if (r.pass && r.time < r.par * 0.8) unlock('speed');
  if (r.maxMult >= 4) unlock('groove');
  if (r.pass && r.peak > 90) unlock('hot');
  if (Object.keys(profile.stats.sRanks).length >= 3) unlock('s3');
  if (profile.stats.perfect >= 25) unlock('corners');
  if (unlocked('nv855')) unlock('nv');
  if (unlocked('m3605')) unlock('lathe');
  if (JOBS.every(j => (profile.progress[j.id] || {}).stars === 3)) unlock('all3');
  if (levelOf(profile.xp) >= 10) unlock('legend');
  saveProfile();
  return { xp, cr, first, before, after: { xp: profile.xp, credits: profile.credits, level: levelOf(profile.xp), stars: totals().stars } };
}

function endJob() {
  if (state !== 'play') return;
  coolBtn = false; ptr.down = false; timeScale = 1;
  if (G.broken) { state = 'post'; setTimeout(() => showResults(), 300); return; }
  state = 'inspect'; G.inspT = 0;
  $('hud').classList.remove('on'); $('cine').classList.add('on');
  bigMsg('CYCLE COMPLETE', 'Part to CMM for inspection', 1.6); sfx.impact(); flash(0.5);
  if (snd.ctx) { const t = snd.ctx.currentTime; for (const g of [snd.cutG, snd.chatG, snd.coolG]) g.gain.setTargetAtTime(0, t, 0.05); }
}

/* ---------------- camera ---------------- */
let snapCam = true; const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
const VIEWS = ['OPERATOR', 'TOP', 'CLOSE'];
function cameraRig(dt, now) {
  const aspect = innerWidth / innerHeight;
  if (camMode === 'menu') {
    SR.t += dt;
    const far = clamp(1.25 / aspect, 1, 2.1), a = SR.t * 0.09 + 0.5;
    const title = state === 'title';
    const r = (title ? 6200 : 7200) * far;
    wantLook.set(0, 1250, 0);
    if (!title && aspect > 1.1) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.17, 0, innerWidth, innerHeight);
    else if (!title) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.2, innerWidth, innerHeight);
    else camera.clearViewOffset();
    wantPos.set(Math.sin(a) * r, (title ? 1500 : 2300) + Math.sin(SR.t * 0.25) * 300, Math.cos(a) * r);
    const k = snapCam ? 1 : 1 - Math.exp(-dt * 2); camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); snapCam = false;
    camera.position.copy(camPos); camera.lookAt(camLook); camera.fov = 34; camera.updateProjectionMatrix();
    SR.ring.material.color.setRGB(3 + Math.sin(now * 2) * 0.6, 1.05 + Math.sin(now * 2) * 0.2, 0);
    SR.dust.rotation.y += dt * 0.01; SR.dust.position.y = Math.sin(now * 0.2) * 80;
    return;
  }
  if (!G) return;
  camera.clearViewOffset();
  const far = clamp(0.8 / aspect, 1, 2.2), P = G.P;
  if (state === 'inspect' || state === 'post') {
    const t = G.inspT, a = -0.6 + t * 0.35;
    if (P.lathe) { wantLook.set(0, 8, 0); wantPos.set(Math.sin(a) * 60, 50 + Math.sin(t) * 10, 180 + Math.cos(a) * 30); }
    else { wantLook.set(0, -4, 0); wantPos.set(Math.sin(a) * 160, 120 - t * 6, Math.cos(a) * 160); }
  } else if (P.lathe) {
    if (view === 0) { wantLook.set(2, 20, 0); wantPos.set(0, 80, 275); }
    else if (view === 1) { wantLook.set(4, 0, 0); wantPos.set(4, 240, 46); }
    else { wantLook.set(G.x, G.y, 0); wantPos.set(G.x + 8, G.y + 26, 82); }
  } else {
    if (view === 0) { wantLook.set(0, -2, aspect < 0.8 ? -2 : -6); if (aspect < 0.8) wantPos.set(0, 190, 160); else wantPos.set(0, 150, 195); }
    else if (view === 1) { wantLook.set(0, 0, 0); wantPos.set(0, 300, 0.01); }
    else { wantLook.set(G.x, 0, G.y); wantPos.set(G.x + 10, 70, G.y + 84); }
  }
  if (state !== 'inspect' && state !== 'post') wantPos.sub(wantLook).multiplyScalar(view === 2 ? 1 : far * (aspect < 0.8 ? 1.5 : 1)).add(wantLook);
  else wantPos.sub(wantLook).multiplyScalar(far).add(wantLook);
  if (state === 'atc') { const u = clamp(G.atcT / 1.7, 0, 1), e = ease(u); wantPos.lerp(P.lathe ? new THREE.Vector3(G.x + 60, G.y + 90, 120) : new THREE.Vector3(G.x + 120, 160, G.y + 120), 1 - e); }
  if (timeScale < 1 && state === 'play') { wantPos.lerp(P.lathe ? new THREE.Vector3(G.x + 30, G.y + 30, 90) : new THREE.Vector3(G.x + 50, 60, G.y + 70), 0.6); wantLook.lerp(P.lathe ? new THREE.Vector3(G.x, G.y, 0) : new THREE.Vector3(G.x, 0, G.y), 0.6); }
  const k = snapCam ? 1 : 1 - Math.exp(-dt * (state === 'inspect' || state === 'post' ? 2.5 : 6));
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); snapCam = false;
  const sh = settings.shake ? G.shake * 0.8 : 0;
  camera.position.copy(camPos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0));
  camera.lookAt(camLook);
  const tele = aspect < 0.8 && view !== 2 && state !== 'inspect' && state !== 'post';
  camera.fov = (view === 1 && state === 'play' ? 30 : P.lathe ? 34 : 38) * (tele ? (P.lathe ? 0.8 : 0.62) : 1); camera.updateProjectionMatrix();
}
function setWorld(w) {
  const game = w === 'game';
  showroom.visible = !game; encl.visible = game; mill.visible = false; lathe.visible = false;
  guide.visible = pacer.visible = cursor.visible = startRing.visible = beam.visible = game;
  for (const p of [chips, drops, sparks]) p.mesh.visible = game;
  scene.fog.near = game ? 700 : 9000; scene.fog.far = game ? 1600 : 32000;
  hemi.intensity = game ? 0.55 : 0.35; key.intensity = game ? 2.3 : 0.4; rim.intensity = game ? 0.8 : 0;
  camMode = game ? 'game' : 'menu'; snapCam = true;
  if (!game) setShowroomMachine(SR.cur);
}

/* ---------------- per-frame visuals ---------------- */
const tmpV = new THREE.Vector3(), heatCol = new THREE.Color();
const floorMill = (x, z) => (Math.abs(x) < 50 && Math.abs(z) < 35 ? 0 : Math.abs(x) < 74 && Math.abs(z) < 48 ? -6 : -58);
const floorLathe = () => -120;
function visuals(dt, now) {
  if (!G) return;
  const P = G.P, hc = G.heat / 100;
  G.spin += (G.rpmNow / 60) * Math.PI * 2 * dt;
  if (state === 'inspect') {
    G.tipY = lerp(G.tipY, 80, Math.min(1, dt * 3));
    const hm = clamp((G.inspT - 0.6) / 1.2, 0, 1); topMat.uniforms.heatMix.value = hm; stockMat.uniforms.heatMix.value = hm;
    // CMM probe walks the toolpath
    const u = clamp((G.inspT - 0.8) / 3.2, 0, 1), k = Math.min(P.n - 1, Math.floor(u * (P.n - 1))), p = P.pts[k], dev = G.bins[k >> 1] || 0;
    probe.visible = u > 0 && u < 1;
    const bob = Math.abs(Math.sin(G.inspT * 14)) * 3;
    if (P.lathe) { probe.position.set(p[0], p[1] + 1.5 + bob, 0); probe.rotation.set(0, 0, 0); }
    else { probe.position.set(p[0], -G.job.depth + 1.5 + bob, p[1]); }
    probe.userData.band.material.color.setRGB(dev < 0.3 ? 0.1 : 2.5, dev < 0.3 ? 2.2 : dev < 0.6 ? 1 : 0.2, dev < 0.3 ? 0.8 : 0.1);
    cineUpdate(k, dev, u);
    if (G.inspT > 4.6 && state === 'inspect') { state = 'post'; probe.visible = false; showResults(); }
  }
  if (!P.lathe) {
    toolU.pos.set(G.x, G.tipY, G.y); spindle.position.copy(toolU.pos);
    cutterMesh.rotation.y = G.spin * 0.05; fluteTex.offset.x = (G.spin * 0.08) % 1;
    M_cutter.emissiveIntensity = hc * hc * 2.2; cutterMesh.visible = !G.broken;
    topMat.uniforms.camPos.value.copy(camera.position); topMat.uniforms.heat.value = hc;
    cursor.position.set(ptr.x, 0.5, ptr.y);
  } else {
    turret.position.set(G.x, state === 'inspect' ? lerp(turret.position.y, 90, dt * 2) : G.y, 0);
    turret.userData.insert.visible = !G.broken;
    stockSpin.rotation.y = G.spin * 0.12; chuckSpin.rotation.y = G.spin * 0.12;
    stockMat.uniforms.camPos.value.copy(camera.position);
    cursor.position.set(ptr.x, ptr.y, 1);
  }
  cursor.visible = state === 'play' && ptr.has && !G.engaged;
  if (G.started && !G.done && state === 'play') {
    let lo = 0, hi = P.n - 1; const t = G.t; while (lo < hi) { const mid = (lo + hi) >> 1; if (P.tAt[mid] < t) lo = mid + 1; else hi = mid; }
    const p = P.pts[lo]; pacer.visible = true;
    if (P.lathe) pacer.position.set(p[0], p[1], 1); else pacer.position.set(p[0], 0.6, p[1]);
  } else pacer.visible = false;
  const s0 = P.pts[0]; startRing.visible = beam.visible = !G.started && state === 'play';
  if (P.lathe) { startRing.position.set(s0[0], s0[1], 1); beam.position.set(s0[0], s0[1] + 80, 1); }
  else { startRing.position.set(s0[0], 0.6, s0[1]); beam.position.set(s0[0], 80, s0[1]); }
  startRing.material.opacity = 0.6 + Math.sin(now * 6) * 0.4; beam.material.opacity = 0.55 + Math.sin(now * 6) * 0.3;
  guide.visible = state !== 'inspect';
  if (state === 'play' || state === 'atc') colorGuide(P, G.i, now);
  if (state === 'play' && G.engaged && G.moved > 0) {
    G.chipAcc += P.lathe ? Math.min(3, G.removed * 0.3) : Math.min(1.5, G.removed / 60);
    if (P.lathe) heatCol.setRGB(1, 1, 1).lerp(new THREE.Color(0.85, 0.65, 0.3), clamp(hc * 1.6, 0, 1)).lerp(new THREE.Color(0.25, 0.35, 0.9), clamp(hc * 2 - 0.9, 0, 1));
    while (G.chipAcc >= 1) {
      G.chipAcc -= 1; profile.stats.chipsCut++;
      if (P.lathe) chips.emit(G.x + Math.random() * 2, G.y + 1, 2, 80 + Math.random() * 200, 200 + Math.random() * 300, 120 + Math.random() * 260, 3.5, 1.2 + Math.random() * 1.4, heatCol);
      else { const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 130; chips.emit(G.x + Math.cos(a) * toolU.r, 1, G.y + Math.sin(a) * toolU.r, Math.cos(a) * sp, 90 + Math.random() * 160, Math.sin(a) * sp, 2.6, 0.8 + Math.random() * 0.6, new THREE.Color(0.85, 0.87, 0.9)); }
    }
  }
  if (G.coolOn) {
    const nozzles = P.lathe ? [turret.userData.noz.clone().add(turret.position)] : [spindle.userData['noz-1'].clone().add(spindle.position), spindle.userData['noz1'].clone().add(spindle.position)];
    const target = P.lathe ? tmpV.set(G.x, G.y, 0) : tmpV.set(G.x, G.tipY + 4, G.y);
    for (const nz of nozzles) for (let k = 0; k < 3; k++) {
      const d = target.clone().sub(nz).normalize().multiplyScalar(520);
      drops.emit(nz.x, nz.y, nz.z, d.x + (Math.random() - 0.5) * 60, d.y + (Math.random() - 0.5) * 60, d.z + (Math.random() - 0.5) * 60, 0.6, 1 + Math.random(), null);
    }
  }
  chips.update(dt, P.lathe ? floorLathe : floorMill, 10);
  drops.update(dt, P.lathe ? (x) => (Math.abs(x) < 60 ? -0.5 : -120) : floorMill, -1, -1800);
  sparks.update(dt, P.lathe ? floorLathe : floorMill, 20, -1500);
  // post FX state
  fxPass.uniforms.heat.value = lerp(fxPass.uniforms.heat.value, state === 'play' ? clamp((G.heat - 70) / 30, 0, 1) : 0, Math.min(1, dt * 4));
  fxPass.uniforms.groove.value = lerp(fxPass.uniforms.groove.value, state === 'play' ? (G.mult - 1) / 3 : 0, Math.min(1, dt * 3));
  fxPass.uniforms.ca.value = 0.0012 + G.chat * 0.006;
  // machine audio
  if (snd.ctx) {
    const t = snd.ctx.currentTime, rpm = G.rpmNow, live = state === 'play' || state === 'atc';
    snd.spin.frequency.setTargetAtTime((rpm / 60) * (P.lathe ? 4 : 2.2) + 30, t, 0.08);
    snd.spf.frequency.setTargetAtTime(700 + rpm * (P.lathe ? 0.3 : 0.12), t, 0.1);
    snd.spinG.gain.setTargetAtTime(live ? 0.045 : 0, t, 0.2);
    snd.whine.frequency.setTargetAtTime(400 + rpm * 0.25, t, 0.1); snd.whineG.gain.setTargetAtTime(live ? 0.012 : 0, t, 0.2);
    snd.cutF.frequency.setTargetAtTime(P.lathe ? 1700 : 3300, t, 0.1);
    snd.cutG.gain.setTargetAtTime(live && G.engaged && G.moved > 0 && G.removed > 0 ? 0.17 : 0, t, 0.04);
    snd.chatG.gain.setTargetAtTime(G.chat * 0.1, t, 0.03); snd.chat.frequency.setTargetAtTime(110 + G.chat * 90 + Math.random() * 30, t, 0.02);
    snd.coolG.gain.setTargetAtTime(G.coolOn ? 0.06 : 0, t, 0.08);
    MUS.intensity = state === 'play' ? (G.mult - 1) / 3 : 0;
  }
}

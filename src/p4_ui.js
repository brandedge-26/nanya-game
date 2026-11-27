/* ---------------- UI plumbing ---------------- */
const SCREENS = ['title', 'menu', 'contracts', 'workshop', 'operator', 'settings', 'board'];
let curScreen = null, menuSel = 0, zoneSel = 'x8', skipRes = false;
function screen(id) {
  curScreen = id;
  for (const s of SCREENS) $(s).classList.toggle('on', s === id);
  if (id) { $('hud').classList.remove('on'); $('cine').classList.remove('on'); }
}
function overlay(id, on) { $(id).classList.toggle('on', on); }
function transition(fn) {
  const w = $('wipe'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); sfx.whoosh();
  setTimeout(fn, 380);
}
let flashV = 0;
function flash(a) { flashV = Math.max(flashV, a); }
function glitch() { const g = $('glitchEl'); g.classList.remove('on'); void g.offsetWidth; g.classList.add('on'); sfx.glitch(); }
let bigTimer = 0;
function bigMsg(t, s, dur, cls = '') {
  const b = $('big'); $('bigT').textContent = t; $('bigS').textContent = s || ''; b.className = ''; void b.offsetWidth; b.className = 'on ' + cls;
  clearTimeout(bigTimer); bigTimer = setTimeout(() => { b.className = 'off ' + cls; }, dur * 1000);
}
let toastT = 0, hintT = 0;
function toast(t, cls = '') { const e = $('toast'); if (toastT > 0 && e.textContent === t) { toastT = 0.9; return; } e.textContent = t; e.className = 'on ' + cls; toastT = 0.9; }
function hint(html) { $('hint').innerHTML = html; $('hint').classList.add('on'); hintT = 4.8; }
const projV = new THREE.Vector3();
function spawnPopup(text, cls, big) {
  if (G.P.lathe) projV.set(G.x, G.y + 6, 0); else projV.set(G.x, 8, G.y);
  projV.project(camera);
  const x = (projV.x * 0.5 + 0.5) * innerWidth, y = (-projV.y * 0.5 + 0.5) * innerHeight - 40 - Math.random() * 30;
  const e = document.createElement('div'); e.className = 'pop ' + cls + (big ? ' big' : ''); e.textContent = text;
  e.style.left = clamp(x, 120, innerWidth - 120) + 'px'; e.style.top = clamp(y, 80, innerHeight - 80) + 'px';
  $('pops').appendChild(e); setTimeout(() => e.remove(), 1250);
}
function bindHover(root) { root.querySelectorAll('button,.mi,a.btn').forEach(b => { if (b._h) return; b._h = 1; b.addEventListener('pointerenter', () => sfx.hover()); }); }

/* ---------------- HUD ---------------- */
function hudSetup() {
  const P = G.P, job = G.job;
  $('hMach').textContent = `${P.M.name} · ${job.daily ? 'Daily part' : `Job ${String(JOBS.indexOf(job) + 1).padStart(2, '0')}`} · ${job.client}`;
  $('hName').textContent = job.name; $('hPrg').textContent = P.gc[0].t.split(' ')[0]; $('hSpin').textContent = `S${job.rpm} M03`;
  G._gc = -1; $('hint').classList.remove('on');
  // minimap path (static) cached in an offscreen canvas
  const c = document.createElement('canvas'); c.width = 380; c.height = 266; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, 380, 266);
  if (!P.lathe) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.strokeRect(10, 10, 360, 246); }
  drawPart(g, 380, 266, P.pts, P.lathe, 'rgba(255,105,0,.55)', 3);
  G.miniBase = c;
}
function drawDial(dt) {
  const c = $('dial'), W = (c.width = c.clientWidth * 2), H = (c.height = c.clientHeight * 2), g = c.getContext('2d');
  const P = G.P, rf = P.rec[Math.min(G.i, P.n - 1)], lo = rf * 0.75, hi = rf * 1.15 * G.M.rig * UPFX.bal(), max = rf * 2;
  const cx = W / 2, cy = H * 0.78, R = Math.min(W * 0.44, H * 0.7), a0 = Math.PI * 1.1, a1 = Math.PI * 1.9, ang = (v) => a0 + (a1 - a0) * clamp(v / max, 0, 1);
  g.lineCap = 'butt';
  g.lineWidth = R * 0.13; g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
  g.strokeStyle = 'rgba(22,224,122,.55)'; g.beginPath(); g.arc(cx, cy, R, ang(lo), ang(hi)); g.stroke();
  g.strokeStyle = 'rgba(255,59,48,.45)'; g.beginPath(); g.arc(cx, cy, R, ang(hi), a1); g.stroke();
  for (let k = 0; k <= 20; k++) { const a = a0 + (a1 - a0) * (k / 20), r1 = R + R * 0.1, r2 = R + R * (k % 5 ? 0.15 : 0.22); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = k % 5 ? 2 : 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
  const na = ang(G.feed), inb = G.feed >= lo && G.feed <= hi;
  g.strokeStyle = inb ? '#16e07a' : G.feed > hi ? '#ff3b30' : '#ff6900'; g.lineWidth = 6; g.shadowColor = g.strokeStyle; g.shadowBlur = 14;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * R * 1.05, cy + Math.sin(na) * R * 1.05); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, R * 0.12, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${H * 0.2}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.fillText(Math.round(G.feed), cx, cy - R * 0.32);
  g.fillStyle = !G.engaged ? '#8a919c' : inb ? '#16e07a' : G.feed > hi ? '#ff3b30' : '#ff6900';
  g.font = `700 ${H * 0.085}px "Chakra Petch", sans-serif`; g.fillText(!G.engaged ? 'RETRACTED' : inb ? 'FEED IN BAND' : G.feed > hi ? 'TOO FAST' : 'TOO SLOW', cx, cy - R * 0.08);
  g.fillStyle = '#8a919c'; g.font = `600 ${H * 0.07}px "Chakra Petch", sans-serif`; g.fillText('MM/MIN', cx, cy + R * 0.2);
}
function drawProg() {
  const c = $('pbar'), W = (c.width = c.clientWidth * 2), H = (c.height = c.clientHeight * 2), g = c.getContext('2d'), P = G.P;
  const segs = 60, gap = 3, sw = (W - gap * (segs - 1)) / segs, pct = G.i / (P.n - 1);
  for (let k = 0; k < segs; k++) {
    const a = k / segs, idx = Math.floor(a * P.n), x = k * (sw + gap);
    const done = a < pct, hard = P.hard[idx], slow = P.rec[idx] / P.F < 0.8;
    g.fillStyle = done ? (hard ? '#ff3b6a' : '#ff6900') : hard ? 'rgba(255,59,106,.35)' : slow ? 'rgba(255,194,74,.22)' : 'rgba(255,255,255,.1)';
    g.beginPath(); g.moveTo(x + 4, 0); g.lineTo(x + sw, 0); g.lineTo(x + sw - 4, H); g.lineTo(x, H); g.fill();
  }
}
function drawMini() {
  const c = $('mini'); if (!c.clientWidth) return;
  const W = (c.width = 380), H = (c.height = 266), g = c.getContext('2d'), P = G.P;
  g.clearRect(0, 0, W, H); if (G.miniBase) g.drawImage(G.miniBase, 0, 0);
  // map tool position into the same frame drawPart used
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  const pts = P.lathe ? P.pts.concat(P.pts.map(p => [p[0], -p[1]])) : P.pts;
  for (const [x, y] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const s = Math.min((W * 0.82) / (maxx - minx || 1), (H * 0.78) / (maxy - miny || 1)), ox = W / 2 - ((minx + maxx) / 2) * s, oy = H / 2 - ((miny + maxy) / 2) * s;
  g.strokeStyle = '#ff6900'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= G.i; i += 3) { const p = P.pts[i]; i ? g.lineTo(ox + p[0] * s, oy + p[1] * s) : g.moveTo(ox + p[0] * s, oy + p[1] * s); } g.stroke();
  g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(ox + G.x * s, oy + G.y * s, 6, 0, 7); g.fill(); g.shadowBlur = 0;
}
let hudFrame = 0;
function hudUpdate(dt) {
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').className = '';
  if (hintT > 0 && (hintT -= dt) <= 0) $('hint').classList.remove('on');
  if (!G || !$('hud').classList.contains('on')) return;
  const P = G.P;
  hudFrame++;
  const live = Math.round(Math.min(250, G.style) + (G.devW ? clamp(1 - Math.sqrt(G.devS / G.devW) / 1.2, 0, 1) * 500 * (G.i / P.n) : 0) + 250 * (G.i / P.n));
  $('hPts').textContent = live;
  const me = $('hMult'); if (me.textContent !== 'x' + G.mult) { me.textContent = 'x' + G.mult; me.className = 'mult' + (G.mult === 1 ? ' m1' : '') + ' pop'; setTimeout(() => me.classList.remove('pop'), 160); }
  const gl = G.mult >= 4 ? 1 : ((G.groove - [0, 0, 2, 5, 9][G.mult]) / ([2, 3, 4, 1][G.mult - 1]));
  $('gFill').style.width = clamp(gl, 0, 1) * 100 + '%';
  const rms = G.devW ? Math.sqrt(G.devS / G.devW) : 0;
  $('hAcc').textContent = G.devW ? clamp(100 * (1 - rms / 1.5), 0, 100).toFixed(1) + '%' : '—'; $('hDev').textContent = rms.toFixed(3);
  $('hCyc').textContent = fmt(G.t); $('hPct').textContent = Math.round((G.i / (P.n - 1)) * 100) + '%';
  const pace = G.started ? P.tAt[Math.min(G.i, P.n - 1)] - G.t : 0;
  const pe = $('hPace'); pe.textContent = G.started ? (pace >= 0 ? `+${pace.toFixed(1)}s AHEAD` : `${pace.toFixed(1)}s BEHIND`) : 'PACE —'; pe.className = G.started ? (pace >= 0 ? 'ahead' : 'behind') : '';
  $('bHeat').style.width = G.heat + '%'; $('vHeat').textContent = Math.round(G.heat) + '%';
  const cp = (G.coolant / G.tank) * 100; $('bCoolb').style.width = cp + '%'; $('vCool').textContent = Math.round(cp) + '%';
  $('bLoad').style.width = clamp(G.load / 1.2, 0, 1) * 100 + '%'; $('vLoad').textContent = Math.round(G.load * 100) + '%';
  const cb = $('bCool'); cb.classList.toggle('on', !!G.coolOn); cb.querySelector('small').textContent = Math.round(cp) + '%';
  if (!isTouch || hudFrame % 2 === 0) drawDial(dt);
  if (hudFrame % 3 === 0) { drawProg(); drawMini(); }
  let cur = 0; for (let k = 0; k < P.gc.length; k++) if (P.gc[k].i <= G.i && (G.started || P.gc[k].i < 0)) cur = k;
  if (cur !== G._gc) { G._gc = cur; const a = Math.max(0, cur - 2), b = Math.min(P.gc.length, a + 7); $('hLines').innerHTML = P.gc.slice(a, b).map((l, k) => `<div${a + k === cur ? ' class="cur"' : ''}>${esc(l.t)}</div>`).join(''); }
}
function cineUpdate(k, dev, u) {
  $('cPt').textContent = String(Math.floor(u * 400)).padStart(3, '0') + ' / 400'; $('cDev').textContent = dev.toFixed(3) + ' mm';
  const st = $('cSt'); st.textContent = dev < 0.3 ? 'IN TOL' : dev < 0.6 ? 'WARNING' : 'OUT OF TOL'; st.style.color = dev < 0.3 ? 'var(--ok)' : dev < 0.6 ? 'var(--or)' : 'var(--bad)';
  $('cBar').style.width = u * 100 + '%';
  if (Math.random() < 0.15) sfx.tick();
}

/* ---------------- drawing helpers ---------------- */
function drawPart(ctx, w, h, pts, lathe, color = '#ff6900', lw = 4) {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  const P = lathe ? pts.concat(pts.map(p => [p[0], -p[1]])) : pts;
  for (const [x, y] of P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const s = Math.min((w * 0.82) / (maxx - minx || 1), (h * 0.78) / (maxy - miny || 1)), cx = w / 2 - ((minx + maxx) / 2) * s, cy = h / 2 - ((miny + maxy) / 2) * s;
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.shadowColor = color; ctx.shadowBlur = 12;
  const pass = (sgn) => { ctx.beginPath(); pts.forEach(([x, y], k) => { const X = cx + x * s, Y = cy + y * s * sgn; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); };
  pass(1); if (lathe) pass(-1);
  ctx.shadowBlur = 0;
  return { s, cx, cy, minx, maxx, miny, maxy };
}
function drawBlueprint(c, P, prog) {
  const w = (c.width = c.clientWidth * 2), h = (c.height = c.clientHeight * 2), g = c.getContext('2d');
  g.fillStyle = '#061325'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,170,255,.08)'; g.lineWidth = 1; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.strokeStyle = 'rgba(160,200,255,.5)'; g.strokeRect(14, 14, w - 28, h - 28);
  const n = Math.max(2, Math.floor(P.pts.length * prog));
  const f = drawPart(g, w, h * 0.86, P.pts.slice(0, n), P.lathe, '#bfe0ff', 4);
  // dimensions
  if (prog >= 1) {
    const y0 = h * 0.86 * 0.5 + (P.lathe ? f.maxy : f.maxy) * f.s + 34, x0 = f.cx + f.minx * f.s, x1 = f.cx + f.maxx * f.s;
    g.strokeStyle = '#ff6900'; g.fillStyle = '#ff6900'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
    for (const x of [x0, x1]) { g.beginPath(); g.moveTo(x, y0 - 10); g.lineTo(x, y0 + 10); g.stroke(); }
    g.font = '600 24px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(`${(f.maxx - f.minx).toFixed(1)}`, (x0 + x1) / 2, y0 - 10);
  }
  // title block
  g.fillStyle = 'rgba(6,19,37,.9)'; g.fillRect(w - 340, h - 110, 326, 96); g.strokeStyle = 'rgba(160,200,255,.6)'; g.strokeRect(w - 340, h - 110, 326, 96);
  g.fillStyle = '#bfe0ff'; g.textAlign = 'left'; g.font = '600 20px "JetBrains Mono", monospace';
  g.fillText(`DWG ZT-${String(JOBS.indexOf(P.job) + 1).padStart(3, '0')}  REV A`, w - 326, h - 80);
  g.fillText(P.lathe ? 'MATL  STEEL Ø40' : 'MATL  6061-T6', w - 326, h - 52); g.fillText('TOL   ±0.30 mm', w - 326, h - 24);
}
function shareCard(r) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 1200, 630); bg.addColorStop(0, '#0d0d0e'); bg.addColorStop(1, '#000'); x.fillStyle = bg; x.fillRect(0, 0, 1200, 630);
  const gl = x.createRadialGradient(920, 320, 0, 920, 320, 420); gl.addColorStop(0, 'rgba(255,105,0,.4)'); gl.addColorStop(1, 'rgba(255,105,0,0)'); x.fillStyle = gl; x.fillRect(0, 0, 1200, 630);
  x.fillStyle = '#ff6900'; x.beginPath(); x.moveTo(0, 0); x.lineTo(80, 0); x.lineTo(0, 80); x.fill();
  if (logoImg.complete && logoImg.naturalWidth) x.drawImage(logoImg, 70, 56, 280, (280 * logoImg.naturalHeight) / logoImg.naturalWidth);
  x.fillStyle = '#ff6900'; x.font = '700 22px "Chakra Petch", sans-serif'; x.fillText('Z E R O   T O L E R A N C E', 70, 140);
  x.fillStyle = '#fff'; x.font = '700 52px "Chakra Petch", sans-serif'; x.fillText(G.job.name.toUpperCase(), 70, 210);
  x.fillStyle = '#c8ccd3'; x.font = '600 26px "Rajdhani", sans-serif'; x.fillText(`${profile.name || 'OPERATOR'} · NANYA ${G.M.name}`, 70, 250);
  x.fillStyle = '#fff'; x.font = 'italic 700 180px "Chakra Petch", sans-serif'; x.fillText(String(r.score), 60, 440);
  x.fillStyle = r.grade === 'FAIL' ? '#ff3b30' : '#ff6900'; x.beginPath(); x.moveTo(90, 470); x.lineTo(230, 470); x.lineTo(210, 530); x.lineTo(70, 530); x.fill();
  x.fillStyle = '#000'; x.font = 'italic 700 44px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.fillText(r.grade, 150, 516); x.textAlign = 'left';
  x.font = '44px sans-serif'; for (let k = 0; k < 3; k++) { x.fillStyle = k < r.stars ? '#ff6900' : '#333'; x.fillText('★', 250 + k * 50, 518); }
  x.fillStyle = '#c8ccd3'; x.font = '600 26px "JetBrains Mono", monospace'; if (!r.broken) x.fillText(`±${r.rms.toFixed(3)}mm  Ra ${r.ra.toFixed(1)}  ${fmt(r.time)}`, 420, 512);
  x.fillStyle = '#ff6900'; x.font = '700 30px "Chakra Petch", sans-serif'; x.fillText('CAN YOU BEAT IT?  ', 70, 592);
  x.fillStyle = '#fff'; x.font = '600 28px "Rajdhani", sans-serif'; x.fillText('nye-cnc.com', 370, 592);
  x.save(); x.translate(720, 110); drawPart(x, 440, 400, G.P.pts, G.P.lathe, '#ff6900', 7); x.restore();
  return c.toDataURL('image/png');
}

/* ---------------- results ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, skipRes ? 0 : ms));
async function showResults() {
  skipRes = false;
  $('cine').classList.remove('on'); $('hud').classList.remove('on');
  const r = evaluate(), job = G.job, aw = award(r);
  if (job.shift) shiftRecord(r);
  else lastPost = job.daily ? { mode: 'daily-' + dayKey, score: r.score, label: job.name } : { mode: 'career', score: totals().score, label: 'Career total' };
  $('rTag').textContent = `${G.M.name} · Inspection report${r.best && r.score ? ' · new personal best' : ''}`;
  $('rTitle').textContent = job.name;
  const st = $('rStamp'); st.className = 'stamp ' + r.grade; st.textContent = r.grade === 'FAIL' ? 'FAIL' : r.grade;
  $('rScore').textContent = '0'; $('rStars').innerHTML = '';
  const v = $('rVerdict');
  if (r.broken) { v.textContent = `Tool broke at ${Math.round(r.pct * 100)}% · too much heat`; v.className = 'verdict fail'; }
  else if (!r.pass) { v.textContent = 'Out of tolerance · rejected'; v.className = 'verdict fail'; }
  else { v.textContent = r.time <= r.par ? 'Passed inspection · under target time' : 'Passed inspection'; v.className = 'verdict pass'; }
  const rows = [['Accuracy', r.acc, ''], ['Surface finish', r.fin, ''], ['Cycle time', r.cyc, ''], ['Style · groove & corners', r.style, 'sty'], ['Penalties', -r.pen, 'neg']];
  $('rBrk').innerHTML = rows.map(([a, b, c]) => `<div class="${c}"><span>${a}</span><b>${b > 0 ? '+' : ''}${b}</b></div>`).join('');
  const bz = job.bonus || {}; const be = $('rBonus'); be.className = 'bonusr ' + (r.bonusOk ? 'ok' : 'no'); be.textContent = `${r.bonusOk ? '✓' : '○'} Bonus: ${bz.text || '—'}${r.bonusOk ? ' · +150 CR' : ''}`;
  const S = (a, b) => `<div><small>${a}</small><b>${b}</b></div>`;
  $('rStats').innerHTML = [S('Accuracy', r.broken ? '—' : r.accPct.toFixed(1) + '%'), S('Avg dev', r.broken ? '—' : r.rms.toFixed(3)), S('Max dev', r.broken ? '—' : r.max.toFixed(2)), S('Finish Ra', r.broken ? '—' : r.ra.toFixed(1) + 'µm'),
    S('Cycle', fmt(r.time)), S('Target', fmt(r.par)), S('Peak heat', Math.round(r.peak) + '%'), S('Corners', r.perfect + ' perfect')].join('');
  $('rFact').innerHTML = G.M.fact; $('rMach').href = G.M.url; $('rMach').textContent = `View the ${G.M.name}`;
  $('rXp').textContent = '+0'; $('rCr').textContent = '+0'; $('rLv').classList.remove('on'); $('rAch').innerHTML = '';
  const L0 = aw.before.level, fracOf = (xp) => { const L = levelOf(xp); return (xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)); };
  $('rXpBar').style.transition = 'none'; $('rXpBar').style.width = fracOf(aw.before.xp) * 100 + '%';
  // buttons
  const next = !job.daily ? JOBS[JOBS.indexOf(job) + 1] : null, canNext = r.pass && next && unlocked(next.m);
  let btns = [];
  if (job.shift) btns = shiftButtons(r);
  else if (canNext) btns.push(['Next job', () => { overlay('results', false); openBrief(next.id); }, 'pri']);
  if (!job.shift) btns.push([r.pass ? 'Retry for more' : 'Retry', () => { overlay('results', false); transition(() => startJob(job.id)); }, canNext ? '' : 'pri']);
  if (!job.shift) btns.push(['Submit score', () => { overlay('results', false); toMenu('board', true); }, '']);
  btns.push(['Share card', () => { const im = $('rCard'); im.src = shareCard(r); im.hidden = !im.hidden; copyScore(r); }, ''],
    ...(job.shift ? [] : [[job.daily ? 'Main menu' : 'Contracts', () => { overlay('results', false); toMenu(job.daily ? 'menu' : 'contracts'); }, '']]));
  $('rBtns').innerHTML = ''; for (const [t, fn, c] of btns) { const b = document.createElement('button'); b.className = 'btn ' + c; b.textContent = t; b.onclick = () => { sfx.click(); fn(); }; $('rBtns').appendChild(b); }
  $('rCard').hidden = true; bindHover($('results'));
  overlay('results', true); drawChart(r);
  setWorld('game'); musicPlay('menu');
  // animated reveal
  await sleep(350); st.classList.add('go'); sfx.stamp(); flash(0.25);
  await sleep(350);
  const items = $('rBrk').children;
  let shown = 0;
  for (let k = 0; k < items.length; k++) {
    items[k].classList.add('in'); sfx.tick();
    const target = shown + rows[k][1], t0 = performance.now();
    await new Promise(res => { const f = () => { const u = skipRes ? 1 : clamp((performance.now() - t0) / 260, 0, 1); $('rScore').textContent = Math.round(lerp(shown, target, u)); if (u < 1) requestAnimationFrame(f); else res(); }; f(); });
    shown = target;
  }
  $('rScore').textContent = r.score;
  for (let k = 0; k < 3; k++) { await sleep(180); $('rStars').innerHTML = [0, 1, 2].map(j => `<span class="${j < Math.min(k + 1, r.stars) ? 'on' : ''}">★</span>`).join(''); if (k < r.stars) tone(880 + k * 220, 0.15, 0.08, 'triangle'); }
  if (r.pass) sfx.pass(); else sfx.back();
  await sleep(300);
  // XP + credits
  const t1 = performance.now();
  $('rXpBar').style.transition = 'width .9s cubic-bezier(.2,.9,.3,1)';
  await new Promise(res => { const f = () => { const u = skipRes ? 1 : clamp((performance.now() - t1) / 1000, 0, 1); $('rXp').textContent = '+' + Math.round(aw.xp * u); $('rCr').textContent = '+' + Math.round(aw.cr * u); if (Math.random() < 0.3 && u < 1) sfx.tick(); if (u < 1) requestAnimationFrame(f); else res(); }; f(); });
  if (aw.after.level > L0) { $('rXpBar').style.width = '100%'; await sleep(500); $('rXpBar').style.transition = 'none'; $('rXpBar').style.width = '0%'; void $('rXpBar').offsetWidth; $('rXpBar').style.transition = 'width .6s'; const lv = $('rLv'); lv.textContent = `LEVEL UP · ${aw.after.level} · ${rankOf(aw.after.level).toUpperCase()}`; lv.classList.add('on'); sfx.level(); flash(0.2); }
  $('rXpBar').style.width = fracOf(aw.after.xp) * 100 + '%';
  if (aw.cr) sfx.coin();
  const newAch = achQueue.slice(); $('rAch').innerHTML = newAch.map(id => `<span>★ ${ACH.find(a => a[0] === id)[1]}</span>`).join('');
  for (const m of Object.values(MACHINES)) if (m.need && aw.before.stars < m.need && aw.after.stars >= m.need) { await sleep(400); bigMsg(`${m.name} UNLOCKED`, m.sub, 2.4); sfx.boom(); }
}
function drawChart(r) {
  const c = $('rChart'), w = (c.width = c.clientWidth * 2 || 800), h = (c.height = 192), g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const bins = G.bins, n = bins.length, y = (v) => h - 12 - (Math.min(v, 1) / 1) * (h - 24);
  g.fillStyle = 'rgba(22,224,122,.08)'; g.fillRect(0, y(0.3), w, h - 12 - y(0.3));
  g.strokeStyle = 'rgba(255,255,255,.1)'; for (const v of [0.3, 0.6]) { g.beginPath(); g.moveTo(0, y(v)); g.lineTo(w, y(v)); g.stroke(); }
  const bw = w / n;
  for (let k = 0; k < n; k++) { const v = bins[k]; if (!v) continue; g.fillStyle = v < 0.3 ? '#16e07a' : v < 0.6 ? '#ff6900' : '#ff3b30'; g.fillRect(k * bw, y(v), Math.max(1, bw - 0.5), h - 12 - y(v)); }
  g.fillStyle = '#8a919c'; g.font = '18px "JetBrains Mono", monospace'; g.fillText('0.30', 6, y(0.3) - 4); g.fillText('0.60', 6, y(0.6) - 4);
}
function copyScore(r) {
  const t = `I scored ${r.score} (${r.grade}) on "${G.job.name}" in ZERO TOLERANCE on the NANYA ${G.M.name}. Can you beat it? https://nye-cnc.com/`;
  try { navigator.clipboard.writeText(t).then(() => toastRes('Score copied · paste it on LinkedIn or WhatsApp'), () => toastRes(t)); } catch (e) { toastRes(t); }
}
function toastRes(t) { $('rVerdict').textContent = t; $('rVerdict').className = 'verdict pass'; }

/* ---------------- menus ---------------- */
const MENU = [
  ['contracts', 'Contracts', 'Career · 11 jobs on 3 NANYA machines'], ['shift', 'Night Shift', 'Arcade · endless parts, 3 tools, one total'], ['daily', 'Daily Challenge', 'One part, every machinist, today'],
  ['quiz', 'Shop Talk', 'Machinist quiz · win credits'], ['workshop', 'Workshop', 'Upgrades and cutter coatings'],
  ['operator', 'Operator', 'Profile, rank and achievements'], ['board', 'Leaderboard', 'Top scores'], ['settings', 'Settings', 'Graphics, audio, controls'],
];
function nextReset() { const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.floor((m - n) / 1000); return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`; }
function renderMenu() {
  $('mlist').innerHTML = MENU.map(([id, t, s], k) => `<button class="mi${k === menuSel ? ' sel' : ''}" data-m="${id}"><i>0${k + 1}</i><span><b>${t}</b><small>${id === 'daily' ? `${s} · resets in ${nextReset()}` : s}</small></span>${id === 'daily' && !store.get('daily-' + dayKey, 0) ? '<em>NEW</em>' : id === 'workshop' && profile.credits >= 350 ? '<em>CR</em>' : ''}</button>`).join('');
  $('mlist').querySelectorAll('.mi').forEach((b, k) => { b.onclick = () => { sfx.click(); activateMenu(b.dataset.m); }; b.onpointerenter = () => { menuSel = k; $('mlist').querySelectorAll('.mi').forEach((x, j) => x.classList.toggle('sel', j === k)); }; });
  renderOpCard(); renderShow(); bindHover($('menu'));
}
function renderOpCard() {
  const L = levelOf(profile.xp), f = (profile.xp - xpFor(L)) / (xpFor(L + 1) - xpFor(L)), t = totals();
  $('opcard').innerHTML = `<div class="opr"><div class="hex">${L}</div><div><b>${esc(profile.name || 'Operator')}</b><small>${rankOf(L)}</small></div></div>
    <div class="bar" style="margin-top:12px"><i style="width:${f * 100}%"></i></div>
    <div class="oprow"><span>XP ${profile.xp} / ${xpFor(L + 1)}</span><span class="cr">${profile.credits}</span><span>★ ${t.stars} / 33</span></div>`;
}
const SHOW = ['nv855', 'x8', 'm3605'];
function renderShow() {
  const m = MACHINES[SR.cur];
  $('mshow').innerHTML = `<div class="tag">In the showroom</div><h3>${m.name}</h3><p>${m.sub}</p><div class="specs">${m.stats.slice(0, 4).map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('')}</div>
    <div class="mnav"><button class="arrowb" data-sh="-1" aria-label="Previous machine">◀</button><button class="arrowb" data-sh="1" aria-label="Next machine">▶</button><span class="spacer" style="flex:1"></span><a class="btn sm" href="${m.url}" target="_blank" rel="noopener">Specs</a><a class="btn pri sm" href="https://nye-cnc.com/" target="_blank" rel="noopener">Get quote</a></div>`;
  $('mshow').querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { sfx.click(); cycleShow(+b.dataset.sh); });
  bindHover($('mshow'));
}
function cycleShow(d) { const i = (SHOW.indexOf(SR.cur) + d + SHOW.length) % SHOW.length; setShowroomMachine(SHOW[i]); flash(0.15); sfx.whoosh(); renderShow(); }
function activateMenu(id) {
  if (id === 'daily') { openBrief('daily'); return; }
  if (id === 'shift') { openShift(); return; }
  if (id === 'quiz') { openQuiz(); return; }
  transition(() => toMenu(id));
}
function toMenu(id, withForm) {
  G = null; state = 'menu'; setWorld('menu');
  for (const o of ['brief', 'pause', 'results', 'quiz', 'shiftOv', 'shiftEnd']) overlay(o, false);
  musicPlay('menu');
  screen(id);
  if (id === 'menu') renderMenu();
  if (id === 'contracts') renderContracts();
  if (id === 'workshop') renderWorkshop();
  if (id === 'operator') renderOperator();
  if (id === 'settings') renderSettings();
  if (id === 'board') renderBoard(withForm);
  if (achQueue.length) showAchToasts();
}
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { sfx.back(); transition(() => toMenu('menu')); });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { sfx.back(); overlay(b.dataset.close, false); });

/* contracts */
const NODEPOS = [[0.12, 0.62], [0.36, 0.3], [0.62, 0.6], [0.86, 0.3]];
function renderContracts() {
  const t = totals(); $('crC').textContent = profile.credits;
  $('zones').innerHTML = Object.values(MACHINES).map(m => `<button class="zt${m.id === zoneSel ? ' on' : ''}${unlocked(m.id) ? '' : ' lock'}" data-z="${m.id}"><small>${m.zone}${unlocked(m.id) ? '' : ' · 🔒 ' + m.need + '★'}</small><b>${m.name}</b></button>`).join('');
  $('zones').querySelectorAll('[data-z]').forEach(b => b.onclick = () => { sfx.click(); zoneSel = b.dataset.z; setShowroomMachine(zoneSel); renderContracts(); });
  const m = MACHINES[zoneSel], jobs = JOBS.filter(j => j.m === zoneSel), open = unlocked(zoneSel);
  const pos = jobs.map((_, k) => NODEPOS[k] || [0.5, 0.5]);
  const map = $('map');
  map.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${pos.slice(1).map((p, k) => `<line x1="${pos[k][0] * 100}" y1="${pos[k][1] * 100}" x2="${p[0] * 100}" y2="${p[1] * 100}" stroke="${open && (profile.progress[jobs[k].id] || {}).done ? '#ff6900' : 'rgba(255,255,255,.2)'}" stroke-width=".5" stroke-dasharray="2 1.2" vector-effect="non-scaling-stroke" style="stroke-width:3px"/>`).join('')}</svg>` +
    jobs.map((j, k) => { const p = profile.progress[j.id] || {}, prevDone = k === 0 || (profile.progress[jobs[k - 1].id] || {}).done, can = open && prevDone;
      return `<button class="node${p.done ? ' done' : ''}${can ? '' : ' lock'}" data-j="${j.id}" style="left:${pos[k][0] * 100}%;top:${pos[k][1] * 100}%" ${can ? '' : 'disabled'}><div class="hx"><span>${String(JOBS.indexOf(j) + 1).padStart(2, '0')}</span></div><b>${esc(j.name)}</b><small>${esc(j.client)}${j.hard ? ' · ⚠ hard spot' : ''}</small><span class="stars">${[0, 1, 2].map(s => `<span class="${s < (p.stars || 0) ? 'on' : ''}">★</span>`).join('')}</span></button>`; }).join('');
  map.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { sfx.click(); openBrief(b.dataset.j); });
  $('zinfo').innerHTML = `<div class="ph" style="background-image:url(${m.img})"></div><div class="tag">${m.zone}</div><h3>${m.name}</h3><p>${m.sub}</p><div class="specs">${m.stats.map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('')}</div>
    ${open ? `<div class="oprow" style="margin-top:4px"><span>Zone stars</span><span class="or">★ ${jobs.reduce((a, j) => a + ((profile.progress[j.id] || {}).stars || 0), 0)} / ${jobs.length * 3}</span></div>` : `<div class="zlock">Locked · earn ${m.need} ★ to unlock (you have ${t.stars}).</div>`}
    <div class="row" style="margin-top:12px"><a class="btn sm" href="${m.url}" target="_blank" rel="noopener">Real specs ↗</a></div>`;
  bindHover($('contracts'));
}

/* brief */
let briefAnim = 0, briefJob = null;
function openBrief(id) {
  const job = jobById(id), P = prepare(job), M = P.M; briefJob = id;
  if (!curScreen || curScreen === 'title') toMenu(job.daily ? 'menu' : 'contracts');
  setShowroomMachine(job.m);
  $('bTag').textContent = job.daily ? `Daily challenge · ${M.name} · resets in ${nextReset()}` : `${M.zone} · ${M.name} · Job ${String(JOBS.indexOf(job) + 1).padStart(2, '0')} · Client: ${job.client}`;
  $('bTitle').textContent = job.name; $('bLead').textContent = job.brief;
  const rows = P.lathe
    ? [['Tool', 'T0101 · CNMG 0.8R insert'], ['Stock', 'Ø40 × 120 mm steel'], ['Spindle', `${job.rpm} rpm`], ['Toolpath', `${(P.n * 0.5).toFixed(0)} mm`], ['Target cycle', fmt(P.par)], ['Hard spots', job.hard ? job.hard.length : 'None']]
    : [['Tool', `Ø${job.tool} carbide end mill`], ['Stock', '6061-T6 · 100 × 70 × 30'], ['Depth of cut', `${job.depth.toFixed(1)} mm`], ['Programmed feed', `F${Math.round(P.F)} mm/min`], ['Toolpath', `${(P.n * 0.5).toFixed(0)} mm`], ['Target cycle', fmt(P.par)], ['Hard spots', job.hard ? job.hard.length : 'None']];
  $('bSpec').innerHTML = rows.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
  const p = job.daily ? null : profile.progress[job.id], best = job.daily ? store.get('daily-' + dayKey, 0) : p ? p.best : 0;
  $('bObj').innerHTML = `<div><span>★ Pass inspection (dev &lt; 0.60 mm, no broken tool)</span><span>${p && p.stars >= 1 ? '✓' : ''}</span></div><div><span>★★ Score 850+</span><span>${p && p.stars >= 2 ? '✓' : ''}</span></div><div><span>★★★ Score 1000+</span><span>${p && p.stars >= 3 ? '✓' : ''}</span></div>` +
    `<div class="bonus"><span>◆ Bonus: ${esc(job.bonus ? job.bonus.text : '—')}</span><span>+150 CR</span></div>` + (best ? `<div><span>Personal best</span><span class="mono">${best}</span></div>` : '');
  const sk = SKINS.find(s => s.id === profile.skin);
  $('bLdout').innerHTML = UPGRADES.map(u => `<span>${u.icon} ${u.name.split(' ').slice(-1)[0]} L${profile.up[u.id]}</span>`).join('') + `<span>Coating: ${sk.name}</span>`;
  $('bGo').onclick = () => { sfx.click(); overlay('brief', false); transition(() => startJob(id)); };
  overlay('brief', true); bindHover($('brief'));
  const c = $('bDraw'), t0 = performance.now(); cancelAnimationFrame(briefAnim);
  const f = () => { const u = clamp((performance.now() - t0) / 1400, 0, 1); drawBlueprint(c, P, ease(u)); if (u < 1) briefAnim = requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

/* workshop */
function renderWorkshop() {
  $('crW').textContent = profile.credits;
  $('ups').innerHTML = UPGRADES.map(u => {
    const lv = profile.up[u.id], max = u.cost.length, cost = u.cost[lv];
    return `<div class="gp ucard"><div class="ic">${u.icon}</div><h4>${u.name}</h4><p>${u.desc}</p><div class="pips">${u.cost.map((_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div>
      <div class="fx">${lv ? 'Now: ' + u.fx[lv - 1] : 'Not installed'}${lv < max ? ` → ${u.fx[lv]}` : ''}</div>
      ${lv < max ? `<button class="btn ${profile.credits >= cost ? 'pri' : ''} sm" data-u="${u.id}" ${profile.credits >= cost ? '' : 'disabled'}>Install · ◆ ${cost}</button>` : '<button class="btn sm" disabled>Max level</button>'}</div>`;
  }).join('');
  $('skins').innerHTML = SKINS.map(s => { const own = profile.skins[s.id], eq = profile.skin === s.id;
    return `<div class="gp skin"><div class="sw" style="background:linear-gradient(135deg,#${s.color.toString(16).padStart(6, '0')},#111)"></div><b>${s.name}</b>
      <button class="btn sm ${eq ? '' : own ? 'pri' : ''}" data-s="${s.id}" ${eq || (!own && profile.credits < s.cost) ? 'disabled' : ''} style="margin-top:8px">${eq ? 'Equipped' : own ? 'Equip' : '◆ ' + s.cost}</button></div>`; }).join('');
  $('ups').querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = UPGRADES.find(x => x.id === b.dataset.u), cost = u.cost[profile.up[u.id]]; if (profile.credits < cost) return; profile.credits -= cost; profile.up[u.id]++; saveProfile(); sfx.coin(); flash(0.15); unlock('shop'); renderWorkshop(); showAchToasts(); });
  $('skins').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = SKINS.find(x => x.id === b.dataset.s); if (!profile.skins[s.id]) { if (profile.credits < s.cost) return; profile.credits -= s.cost; profile.skins[s.id] = true; sfx.coin(); } else sfx.click(); profile.skin = s.id; applySkin(); saveProfile(); renderWorkshop(); });
  bindHover($('workshop'));
}
/* operator */
function renderOperator() {
  const L = levelOf(profile.xp), t = totals(), st = profile.stats;
  $('opPage').innerHTML = `<div class="tag">Operator file</div><div class="h2">${esc(profile.name || 'Operator')}</div>
    <div class="gp" style="padding:18px;margin-top:14px;max-width:760px"><div class="opr"><div class="hex">${L}</div><div><b>${rankOf(L)}</b><small>${profile.xp} XP · next level at ${xpFor(L + 1)}</small></div></div>
    <div style="display:flex;gap:10px;margin-top:14px"><input class="txt" id="opName" maxlength="20" value="${esc(profile.name)}" aria-label="Callsign"><button class="btn sm" id="opSave">Rename</button></div></div>
    <div class="pstats"><div><b>${t.stars}</b><small>Stars</small></div><div><b>${t.score}</b><small>Career score</small></div><div><b>${st.jobs}</b><small>Jobs run</small></div><div><b>${st.perfect}</b><small>Perfect corners</small></div><div><b>x${st.maxMult}</b><small>Best groove</small></div><div><b>${st.chipsCut}</b><small>Chips cut</small></div><div><b>${st.dailies}</b><small>Daily parts</small></div><div><b>${Object.keys(profile.ach).length}/${ACH.length}</b><small>Achievements</small></div></div>
    <div class="tag" style="margin-top:26px">Achievements</div>
    <div class="agrid">${ACH.map(([id, n, d], k) => `<div class="gp ach${profile.ach[id] ? ' on' : ''}"><i>${k + 1}</i><b>${n}</b><small>${d}</small></div>`).join('')}</div>`;
  $('opSave').onclick = () => { const v = $('opName').value.trim().slice(0, 20); if (v) { profile.name = v.toUpperCase(); saveProfile(); sfx.click(); renderOperator(); } };
  bindHover($('operator'));
}
/* settings */
function renderSettings() {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${settings[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  $('setList').innerHTML = `
    <div class="gp setr"><div><b>Graphics</b><small>Low for phones · Ultra adds bloom, film grain and lens effects</small></div>${seg('gfx', [[0, 'Low'], [1, 'High'], [2, 'Ultra']])}</div>
    <div class="gp setr"><div><b>Music</b><small>Procedural soundtrack</small></div><input type="range" min="0" max="1" step="0.05" value="${settings.music}" data-r="music" aria-label="Music volume"></div>
    <div class="gp setr"><div><b>Effects</b><small>Machine and interface sounds</small></div><input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" data-r="sfx" aria-label="Effects volume"></div>
    <div class="gp setr"><div><b>Touch control</b><small>Drag: steer from anywhere, finger never covers the tool · Direct: tool follows your finger</small></div>${seg('touchMode', [['drag', 'Drag'], ['direct', 'Direct']])}</div>
    <div class="gp setr"><div><b>Touch sensitivity</b><small>How far the cutter moves per finger movement</small></div><input type="range" min="0.6" max="1.8" step="0.05" value="${settings.touchSens}" data-r="touchSens" aria-label="Touch sensitivity"></div>
    <div class="gp setr"><div><b>Touch assist</b><small>Gently pulls the cutter onto the toolpath on touch screens</small></div>${seg('touchAssist', [[true, 'On'], [false, 'Off']])}</div>
    <div class="gp setr"><div><b>Announcer</b><small>Voice callouts for combos, corners and grades</small></div>${seg('announcer', [[true, 'On'], [false, 'Off']])}</div>
    <div class="gp setr"><div><b>Camera shake</b><small>Shake on chatter and impacts</small></div>${seg('shake', [[true, 'On'], [false, 'Off']])}</div>
    <div class="gp setr"><div><b>Tutorial hints</b><small>Coaching tips on the first job</small></div>${seg('hints', [[true, 'On'], [false, 'Off']])}</div>
    <div class="gp setr"><div><b>Reset progress</b><small>Clears stars, XP, credits and achievements on this device</small></div><button class="btn sm" id="rst">Reset</button></div>`;
  $('setList').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; settings[k] = v; store.set('settings', settings); sfx.click(); if (k === 'gfx') applyGfx(); renderSettings(); });
  $('setList').querySelectorAll('[data-r]').forEach(r => r.oninput = () => { settings[r.dataset.r] = +r.value; store.set('settings', settings); applyVolumes(); });
  let armed = false; $('rst').onclick = () => { if (!armed) { armed = true; $('rst').textContent = 'Tap again to confirm'; return; } const keep = profile.name; Object.assign(profile, { xp: 0, credits: 0, up: { coat: 0, cool: 0, bal: 0, mpg: 0 }, skin: 'carbide', skins: { carbide: true }, stats: { jobs: 0, perfect: 0, sRanks: {}, dailies: 0, maxMult: 1, chipsCut: 0 }, ach: {}, progress: {}, name: keep }); saveProfile(); applySkin(); sfx.back(); renderSettings(); };
  bindHover($('settings'));
}
/* leaderboard */
let boardTab = 'daily';
function renderBoard(withForm) {
  if (withForm && lastPost) boardTab = lastPost.mode === 'career' ? 'career' : lastPost.mode === 'shift' ? 'shift' : 'daily';
  const mode = boardTab === 'daily' ? 'daily-' + dayKey : boardTab;
  const rows = store.get('board', []).filter(r => r.mode === mode).sort((a, b) => b.score - a.score).slice(0, 15);
  $('bTable').innerHTML = rows.length ? `<table><thead><tr><th>#</th><th>Machinist</th><th>Company</th><th class="n">Score</th></tr></thead><tbody>${rows.map((r, k) => `<tr class="${r.me ? 'me' : ''}"><td>${k + 1}</td><td>${esc(r.name)}${r.country ? ' · ' + esc(r.country) : ''}</td><td>${esc(r.company || '—')}</td><td class="n">${r.score}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No scores on this board yet. Machine a part and claim the top spot.</p>';
  $('bTabs').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.t === boardTab); b.onclick = () => { boardTab = b.dataset.t; sfx.click(); renderBoard(false); }; });
  const f = $('leadf'); f.hidden = !(withForm && lastPost && lastPost.score > 0);
  if (lastPost) { $('lScore').textContent = `${lastPost.score} · ${lastPost.label}`; f.querySelector('[name=name]').value = profile.name || ''; }
  bindHover($('board'));
}
$('leadf').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target), entry = { name: f.get('name').trim(), company: f.get('company').trim(), email: f.get('email').trim(), country: f.get('country').trim(), score: lastPost.score, mode: lastPost.mode, label: lastPost.label, at: Date.now(), me: true };
  const b = store.get('board', []); b.push(entry); store.set('board', b);
  if (LEAD_ENDPOINT) fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {});
  $('leadf').hidden = true; sfx.pass(); renderBoard(false);
});

/* achievements toast */
let achBusy = false;
function showAchToasts() {
  if (achBusy || !achQueue.length) return; achBusy = true;
  const id = achQueue.shift(), a = ACH.find(x => x[0] === id);
  $('achName').textContent = a[1]; $('achT').classList.add('on'); sfx.achieve();
  setTimeout(() => { $('achT').classList.remove('on'); setTimeout(() => { achBusy = false; showAchToasts(); }, 500); }, 2600);
}

/* ---------------- input ---------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), planeMill = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), planeLathe = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hitP = new THREE.Vector3();
function worldAt(cx, cy) {
  if (!G) return null;
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(G.P.lathe ? planeLathe : planeMill, hitP) ? [hitP.x, G.P.lathe ? hitP.y : hitP.z] : null;
}
function project(e) { // mouse / pen / "direct" touch: the cutter goes where you point (touch is offset above the finger)
  const w = worldAt(e.clientX, e.clientY - (e.pointerType === 'touch' ? 70 : 0));
  if (w) { ptr.x = w[0]; ptr.y = w[1]; ptr.has = true; }
}
const clampPtr = () => { if (!G) return; if (G.P.lathe) { ptr.x = clamp(ptr.x, -62, 62); ptr.y = clamp(ptr.y, 0, 40); } else { ptr.x = clamp(ptr.x, -70, 70); ptr.y = clamp(ptr.y, -50, 50); } };
// "drag" touch (default on phones): trackpad style. Touch anywhere, the cutter follows your finger's movement 1:1 in the
// work plane, so the finger never hides the tool. Before the cycle starts the tool auto-approaches the start point and plunges.
const T = { id: null, prev: null, active: false };
const relTouch = (e) => e.pointerType === 'touch' && settings.touchMode !== 'direct';
const glc = $('gl');
glc.addEventListener('pointerdown', (e) => {
  audioInit(); if (state !== 'play' && !(state === 'atc' && relTouch(e))) return; e.preventDefault();
  ptr.touch = e.pointerType === 'touch';
  if (relTouch(e)) {
    if (T.id !== null) return; // ignore extra fingers on the canvas
    T.id = e.pointerId; T.active = true; T.prev = worldAt(e.clientX, e.clientY);
    if (!G.started) { const s0 = G.P.pts[0]; ptr.x = s0[0]; ptr.y = s0[1]; ptr.down = false; } // auto-approach; plunge when there
    else { ptr.x = G.x; ptr.y = G.y; ptr.down = true; }
    ptr.has = true;
    if (navigator.vibrate) navigator.vibrate(6);
  } else { project(e); ptr.down = true; }
  try { glc.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
}, { passive: false });
glc.addEventListener('pointermove', (e) => {
  if (state !== 'play' && state !== 'atc') return;
  if (relTouch(e)) {
    if (e.pointerId !== T.id || !G) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, last = evs && evs.length ? evs[evs.length - 1] : e;
    const w = worldAt(last.clientX, last.clientY);
    if (w && T.prev && G.started) { const k = settings.touchSens || 1; ptr.x += (w[0] - T.prev[0]) * k; ptr.y += (w[1] - T.prev[1]) * k; clampPtr(); }
    T.prev = w;
  } else project(e);
}, { passive: true });
const up = (e) => {
  if (e && relTouch(e)) { if (e.pointerId !== T.id) return; T.id = null; T.active = false; T.prev = null; }
  ptr.down = false;
};
glc.addEventListener('pointerup', up); glc.addEventListener('pointercancel', up); glc.addEventListener('lostpointercapture', up);
$('cine').addEventListener('pointerdown', () => { if (state === 'inspect') G.inspT = 99; });
$('results').addEventListener('pointerdown', (e) => { if (!e.target.closest('button,a')) skipRes = true; });
addEventListener('keydown', (e) => {
  audioInit();
  if (e.target && e.target.closest && e.target.closest('input')) return;
  if (state === 'title' && titleReady) { startFromTitle(); return; }
  if (state === 'play' || state === 'paused') {
    if (e.code === 'Space' || e.code === 'KeyC') { if (state === 'play') { coolKey = true; e.preventDefault(); } }
    if (e.code === 'KeyV' && state === 'play') cycleView();
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    return;
  }
  if (state === 'inspect' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) { G.inspT = 99; return; }
  if ($('brief').classList.contains('on')) { if (e.code === 'Enter') $('bGo').click(); if (e.code === 'Escape') overlay('brief', false); return; }
  if ($('results').classList.contains('on')) { skipRes = true; if (e.code === 'Enter') { const b = $('rBtns').querySelector('.btn.pri'); if (b) b.click(); } return; }
  if (curScreen === 'menu') {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { menuSel = (menuSel + 1) % MENU.length; sfx.hover(); renderMenu(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { menuSel = (menuSel + MENU.length - 1) % MENU.length; sfx.hover(); renderMenu(); }
    if (e.code === 'ArrowLeft') cycleShow(-1); if (e.code === 'ArrowRight') cycleShow(1);
    if (e.code === 'Enter') { sfx.click(); activateMenu(MENU[menuSel][0]); }
  } else if (curScreen && curScreen !== 'title' && e.code === 'Escape' && !e.target.closest('input')) { sfx.back(); transition(() => toMenu('menu')); }
});
addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyC') coolKey = false; });
$('bCool').addEventListener('pointerdown', (e) => { e.preventDefault(); audioInit(); coolBtn = !coolBtn; });
$('bView').onclick = () => cycleView();
$('bPause').onclick = () => togglePause();
function cycleView() { view = (view + 1) % 3; toast('CAMERA · ' + VIEWS[view]); sfx.click(); }
function togglePause() {
  if (state === 'play') { state = 'paused'; overlay('pause', true); $('pShake').textContent = 'Camera shake: ' + (settings.shake ? 'On' : 'Off'); if (snd.ctx) snd.sfx.gain.value = 0; bindHover($('pause')); }
  else if (state === 'paused') { state = 'play'; overlay('pause', false); applyVolumes(); }
}
$('pResume').onclick = () => { sfx.click(); togglePause(); };
$('pRestart').onclick = () => { overlay('pause', false); applyVolumes(); transition(() => startJob(G.job.id)); };
$('pShake').onclick = () => { settings.shake = !settings.shake; store.set('settings', settings); $('pShake').textContent = 'Camera shake: ' + (settings.shake ? 'On' : 'Off'); };
$('pQuit').onclick = () => { overlay('pause', false); applyVolumes(); const d = G && G.job.daily; transition(() => toMenu(d ? 'menu' : 'contracts')); };
$('csf').addEventListener('submit', (e) => { e.preventDefault(); const v = $('csName').value.trim().slice(0, 20); if (!v) return; profile.name = v.toUpperCase(); saveProfile(); overlay('callsign', false); sfx.pass(); renderMenu(); });

/* ---------------- boot sequence ---------------- */
let titleReady = false;
$('title').addEventListener('pointerdown', () => { if (titleReady) startFromTitle(); });
$('tickRun').innerHTML = [
  '<b>NV-855</b> · 12,000 rpm direct-drive spindle · ±0.005 mm / 300 mm', '<b>NANO-X8</b> · Eco-Line 3-axis VMC · 24-tool ATC in 1.8 s', '<b>3605M</b> · Ø520 mm max turning diameter · C-axis + BMT turret',
  '<b>TIP</b> · Orange path = corner. Slow down for a Perfect Corner', '<b>TIP</b> · Stay in the green band to build a x4 Groove', '<b>TIP</b> · Red zone = hard spot. Back off the feed',
  '<b>DAILY</b> · A new part every day for every machinist', '<b>NANYA CNC</b> · Get an instant quote at nye-cnc.com',
].map(t => `<span>${t}</span>`).join('');

/* ---------------- loop ---------------- */
function applyGfx() {
  const g = settings.gfx, pr = g === 0 ? 1 : g === 1 ? Math.min(devicePixelRatio || 1, 1.25) : Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr); key.castShadow = g > 0; if (SR.spot) SR.spot.castShadow = g > 0;
  fxPass.uniforms.grain.value = g === 2 ? 0.045 : 0.0; fxPass.uniforms.vig.value = 1;
  composer.setPixelRatio(pr); resize();
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w * 0.5, h * 0.5); camera.aspect = w / h; camera.updateProjectionMatrix(); fxPass.uniforms.res.value.set(w, h);
}
addEventListener('resize', resize);
let last = performance.now();
function tick(dt, now) {
  musicTick();
  const sdt = dt * timeScale;
  simulate(sdt);
  cameraRig(state === 'paused' ? 0 : dt, now);
  if (G && state !== 'paused') visuals(sdt, now);
  hudUpdate(dt);
  flashV *= Math.exp(-dt * 5); $('flashEl').style.opacity = flashV.toFixed(3); fxPass.uniforms.flash.value = flashV * 0.4;
  fxPass.uniforms.time.value = now;
  if (state === 'menu' && !G && curScreen && achQueue.length && !achBusy) showAchToasts();
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  tick(dt, t / 1000);
  if (state === 'boot') return;
  if (settings.gfx > 0) composer.render(); else renderer.render(scene, camera);
}

window.__ZT = { worldAt: (x, y) => worldAt(x, y), T, get state() { return state; }, get G() { return G; }, ptr, tick, startJob, openBrief, toMenu, profile, setView(v) { view = v; snapCam = true; }, cool(v) { coolBtn = v; }, skip() { skipRes = true; }, startFromTitle };

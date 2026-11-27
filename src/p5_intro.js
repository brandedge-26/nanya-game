document.querySelectorAll('img[data-logo]').forEach(i => { i.src = i.dataset.logo === 'full' ? IMG.full : IMG.logo; });
/* =====================================================================
   INTRO — "Machined From Solid"
   Engage gate (unlocks audio) → blueprint → raster-cut N-mark in raw steel
   → orange ignite + shockwave → NANYA slit-open → CNC lock → light sweep
   + glint → tagline → studio card → title screen.
   ===================================================================== */
const loadImg = (src) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function introSound() {
  if (!snd.ctx) return { cutOn() {}, cutOff() {}, stop() {} };
  const c = snd.ctx, t0 = c.currentTime, out = c.createGain(); out.gain.value = 1; out.connect(snd.sfx);
  // low drone bed
  const dr = c.createGain(); dr.gain.setValueAtTime(0.0001, t0); dr.gain.exponentialRampToValueAtTime(0.16, t0 + 1.2); dr.connect(out);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.connect(dr);
  const oscs = [55, 55.4, 82.4].map((f, k) => { const o = c.createOscillator(); o.type = k === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
  lp.frequency.setValueAtTime(180, t0); lp.frequency.exponentialRampToValueAtTime(900, t0 + 2.7); lp.frequency.exponentialRampToValueAtTime(220, t0 + 3.4);
  // cutter whine + crackle
  const cs = c.createBufferSource(); cs.buffer = snd.nb; cs.loop = true; const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 3400; cf.Q.value = 2.2;
  const cg = c.createGain(); cg.gain.value = 0; cs.connect(cf); cf.connect(cg); cg.connect(out); cs.start();
  const wo = c.createOscillator(); wo.type = 'sawtooth'; wo.frequency.value = 1180; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 2400; wf.Q.value = 9;
  const wg = c.createGain(); wg.gain.value = 0; wo.connect(wf); wf.connect(wg); wg.connect(out); wo.start();
  // pad that blooms on the hit
  const pad = c.createGain(); pad.gain.value = 0.0001; const pf = c.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 1400; pf.connect(pad); pad.connect(out);
  const pads = [220, 277.2, 329.6, 440, 554.4].map(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 14; o.connect(pf); o.start(); return o; });
  return {
    cutOn() { const t = c.currentTime; cg.gain.setTargetAtTime(0.13, t, 0.05); wg.gain.setTargetAtTime(0.022, t, 0.05); },
    cutOff() { const t = c.currentTime; cg.gain.setTargetAtTime(0, t, 0.04); wg.gain.setTargetAtTime(0, t, 0.04); },
    hit() { const t = c.currentTime; pad.gain.setValueAtTime(0.0001, t); pad.gain.exponentialRampToValueAtTime(0.05, t + 0.08); pad.gain.exponentialRampToValueAtTime(0.018, t + 2.4); pad.gain.exponentialRampToValueAtTime(0.0001, t + 5.2); },
    whine(f) { wo.frequency.setTargetAtTime(f, c.currentTime, 0.02); },
    stop() { const t = c.currentTime; out.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { for (const o of [...oscs, ...pads, wo]) try { o.stop(); } catch (e) { /* stopped */ } try { cs.stop(); } catch (e) { /* stopped */ } }, 1500); },
  };
}

async function runSplash() {
  $('ver').textContent = `${VERSION} · ${isTouch ? 'TOUCH' : 'KEYBOARD + MOUSE'}`;
  $('studioName').textContent = STUDIO_CREDIT;
  const L = { full: await loadImg(IMG.full) };
  // -------- engage gate: fake boot log + loading bar, then CLICK TO ENGAGE --------
  const logs = ['LOADING SHADERS', 'HOMING AXES · X  Y  Z', 'SPINDLE WARM-UP · 12,000 RPM', 'CALIBRATING PROBE', 'READY'];
  const t0 = performance.now(); let ready = false, engaged = false;
  const gateTick = () => {
    if (engaged) return;
    const u = clamp((performance.now() - t0) / 1500, 0, 1);
    $('gBar').style.width = (ease(u) * 100).toFixed(1) + '%'; $('gPct').textContent = String(Math.round(ease(u) * 100)).padStart(3, '0') + '%';
    $('gLog').textContent = logs[Math.min(logs.length - 1, Math.floor(u * (logs.length - 1) + 0.0001))];
    if (u >= 1 && !ready) { ready = true; $('gate').classList.add('ready'); }
    requestAnimationFrame(gateTick);
  };
  gateTick();
  const engage = () => {
    if (!ready || engaged) return; engaged = true;
    audioInit(); applyVolumes();
    $('gate').classList.add('out'); setTimeout(() => { $('gate').style.display = 'none'; }, 600);
    playIntro(L);
  };
  $('gate').addEventListener('pointerdown', engage); $('gGo').addEventListener('click', engage);
  addEventListener('keydown', function k(e) { if (!engaged) { if (ready) { e.preventDefault(); engage(); removeEventListener('keydown', k); } } });
  window.__ZTengage = () => { ready = true; engage(); };
}

function playIntro(L) {
  const cv = $('introc'), g = cv.getContext('2d'); cv.style.display = 'block';
  let W, H, DPR, box; // box = logo layout (viewBox 24..104 × 20..80)
  const off = {};
  const layout = () => {
    DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const AR = 790 / 1100, lw = Math.min(W * 0.6, H * 0.58 / AR, 720), lh = lw * AR;
    box = { x: W / 2 - lw / 2, y: H * 0.46 - lh / 2, w: lw, h: lh, s: lw / 80 };
    // pre-render layers at device resolution
    const mk = (draw) => { const c = document.createElement('canvas'); c.width = Math.ceil(lw * DPR); c.height = Math.ceil(lh * DPR); const x = c.getContext('2d'); x.scale(DPR, DPR); draw(x, lw, lh); return c; };
    // split the logo into layers: chrome / orange (mark), NANYA, CNC
    const full = mk((x, w, h) => L.full && x.drawImage(L.full, 0, 0, w, h)), fw = full.width, fh = full.height, src = full.getContext('2d').getImageData(0, 0, fw, fh).data;
    for (const k of ['chrome', 'orange', 'nanya', 'cnc']) {
      const c = document.createElement('canvas'); c.width = fw; c.height = fh; const x = c.getContext('2d'), img = x.createImageData(fw, fh), d = img.data;
      for (let yy = 0; yy < fh; yy++) {
        const v = yy / fh, region = v < 0.692 ? 'mark' : v < 0.873 ? 'nanya' : 'cnc';
        for (let xx = 0; xx < fw; xx++) {
          const i = (yy * fw + xx) * 4; if (!src[i + 3]) continue;
          const r = src[i], g2 = src[i + 1], b = src[i + 2], mx = Math.max(r, g2, b), sat = mx ? (mx - Math.min(r, g2, b)) / mx : 0;
          const want = region === 'mark' ? (sat > 0.42 && r > g2 ? 'orange' : 'chrome') : region;
          if (want === k) { d[i] = r; d[i + 1] = g2; d[i + 2] = b; d[i + 3] = src[i + 3]; }
        }
      }
      x.putImageData(img, 0, 0); off[k] = c;
    }
    off.mark = mk((x, w, h) => { x.drawImage(off.chrome, 0, 0, w, h); x.drawImage(off.orange, 0, 0, w, h); });
    { const md = off.mark.getContext('2d').getImageData(0, 0, off.mark.width, off.mark.height).data, A = new Uint8Array(off.mark.width * off.mark.height); for (let k = 0; k < A.length; k++) A[k] = md[k * 4 + 3]; off.markA = A; }
    off.logo = mk((x, w, h) => { x.drawImage(off.mark, 0, 0, w, h); x.drawImage(off.nanya, 0, 0, w, h); x.drawImage(off.cnc, 0, 0, w, h); });
    // raw machined steel version of the mark
    off.raw = mk((x, w, h) => {
      x.drawImage(off.mark, 0, 0, w, h); x.globalCompositeOperation = 'source-atop';
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#d8dbdf'); gr.addColorStop(0.5, '#8e939a'); gr.addColorStop(1, '#5a5f66'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let k = 0; k < h; k += 1.5) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; x.fillRect(0, k, w, 0.7); }
      x.globalAlpha = 0.35; x.drawImage(off.mark, 0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'saturation'; x.fillStyle = '#888'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.drawImage(off.mark, 0, 0, w, h); x.globalCompositeOperation = 'source-over';
    });
    // blueprint edges of the mark (alpha gradient magnitude)
    off.edge = (() => {
      const c = document.createElement('canvas'); c.width = off.mark.width; c.height = off.mark.height; const x = c.getContext('2d');
      const src = off.mark.getContext('2d').getImageData(0, 0, c.width, c.height).data, img = x.createImageData(c.width, c.height), d = img.data, cw = c.width;
      for (let yy = 1; yy < c.height - 1; yy++) for (let xx = 1; xx < cw - 1; xx++) {
        const i = (yy * cw + xx) * 4 + 3, gx = src[i + 4] - src[i - 4], gy = src[i + cw * 4] - src[i - cw * 4], m = Math.min(255, Math.hypot(gx, gy) * 1.6);
        if (m > 20) { d[i - 3] = 120; d[i - 2] = 200; d[i - 1] = 255; d[i] = m; }
      }
      x.putImageData(img, 0, 0); return c;
    })();
    off.bg = mk(() => {}); // placeholder (bg is drawn live)
  };
  layout();
  const steel = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#0b0c0d'; x.fillRect(0, 0, 512, 512); for (let k = 0; k < 3000; k++) { const v = 14 + Math.random() * 14 | 0; x.fillStyle = `rgba(${v},${v},${v + 2},.5)`; x.fillRect(Math.random() * 512, Math.random() * 512, 60 + Math.random() * 200, 1); } return g.createPattern(c, 'repeat'); })();
  const V2S = (u, v) => [box.x + u * box.w, box.y + v * box.h];
  const MB = { x0: 0.162, x1: 0.892, y0: 0.0, y1: 0.684 }; // mark bbox (fractions of the logo box)
  const ROWS = 15, parts = [], chipsA = [];
  const S = introSound();
  let start = performance.now(), last = start, lastRow = -1, hitDone = false, clunk = false, ting = false, whoosh = false, tag = false, alive = true, cutting = false, shake = 0;
  const tl = { cut0: 0.95, cut1: 2.75, hit: 2.75, ign: 0.42, slit0: 3.15, cnc0: 3.55, sweep0: 4.0, glint: 4.75, tag0: 4.35, out0: 6.4, end: 7.0 };
  const cutPoint = (p) => { // raster zig-zag
    const rf = p * ROWS, r = Math.min(ROWS - 1, Math.floor(rf)), u = rf - r, dir = r % 2 ? -1 : 1;
    const vx = dir > 0 ? lerp(MB.x0, MB.x1, u) : lerp(MB.x1, MB.x0, u), vy = MB.y0 + ((r + 0.5) / ROWS) * (MB.y1 - MB.y0);
    return { r, u, dir, vx, vy };
  };
  const onResize = () => layout(); addEventListener('resize', onResize);
  let skipped = false, ended = false;
  const skip = () => { if (skipped || ended) return; skipped = true; finishIntro(); };
  setTimeout(() => { $('boot').addEventListener('pointerdown', skip); addEventListener('keydown', function k() { skip(); removeEventListener('keydown', k); }); }, 600);
  $('skipn').classList.add('on');

  function finishIntro() {
    alive = false; S.cutOff(); S.stop(); removeEventListener('resize', onResize);
    cv.style.transition = 'opacity .5s'; cv.style.opacity = '0';
    setTimeout(() => {
      cv.style.display = 'none';
      if (STUDIO_CREDIT && !skipped) { $('sp2').classList.add('on'); tone(196, 1.2, 0.05, 'sine'); setTimeout(() => { $('sp2').classList.remove('on'); setTimeout(toTitle, 500); }, 1900); }
      else toTitle();
    }, skipped ? 200 : 500);
  }
  function toTitle() {
    if (state === 'title') return;
    $('boot').classList.add('out'); state = 'title'; screen('title'); setWorld('menu'); snapCam = true;
    $('pressTxt').textContent = isTouch ? 'TAP TO START' : 'PRESS ANY KEY'; musicPlay('menu');
    setTimeout(() => { titleReady = true; }, 400);
  }
  const clipRect = (x, y, w, h, fn) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(); g.restore(); };

  const frame = (now) => {
    if (!alive) return; requestAnimationFrame(frame);
    const t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // ---- background ----
    g.fillStyle = steel; g.fillRect(0, 0, W, H);
    const bgA = clamp(t / 0.6, 0, 1);
    const rg = g.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.max(W, H) * 0.7); rg.addColorStop(0, `rgba(40,30,22,${0.55 * bgA})`); rg.addColorStop(1, 'rgba(0,0,0,.96)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // after-hit orange ambience
    if (t > tl.hit) { const a = Math.exp(-(t - tl.hit) * 0.9) * 0.35 + 0.08; const og = g.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, box.w * 0.9); og.addColorStop(0, `rgba(255,105,0,${a})`); og.addColorStop(1, 'rgba(255,105,0,0)'); g.fillStyle = og; g.fillRect(0, 0, W, H); }
    // shake
    if (shake > 0) { shake = Math.max(0, shake - dt * 2.6); g.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 14); }
    // ---- blueprint grid + edges ----
    const bpA = clamp((t - 0.15) / 0.5, 0, 1) * (1 - clamp((t - tl.hit) / 0.4, 0, 1));
    if (bpA > 0) {
      g.strokeStyle = `rgba(110,170,255,${0.07 * bpA})`; g.lineWidth = 1;
      const gs = box.s * 2.5; for (let x = box.x - gs * 4; x < box.x + box.w + gs * 4; x += gs) { g.beginPath(); g.moveTo(x, box.y - gs * 2); g.lineTo(x, box.y + box.h + gs * 2); g.stroke(); }
      for (let y = box.y - gs * 2; y < box.y + box.h + gs * 2; y += gs) { g.beginPath(); g.moveTo(box.x - gs * 4, y); g.lineTo(box.x + box.w + gs * 4, y); g.stroke(); }
      const ep = clamp((t - 0.2) / 0.75, 0, 1);
      clipRect(box.x, box.y, box.w * ep, box.h, () => { g.globalAlpha = bpA; g.drawImage(off.edge, box.x, box.y, box.w, box.h); g.globalAlpha = 1; });
      // dimension + crosshair annotations
      const [ax, ay] = V2S(MB.x0, MB.y1 + 0.03), [bx] = V2S(MB.x1, 0);
      g.strokeStyle = `rgba(255,105,0,${0.8 * bpA})`; g.fillStyle = g.strokeStyle; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * ep, ay); g.stroke();
      g.font = `600 ${Math.max(10, box.s * 1.3)}px "JetBrains Mono", monospace`; g.textAlign = 'left';
      if (ep > 0.6) { g.fillText('OP10 · RASTER POCKET · T05 Ø6 · S12000 · F2400', box.x, box.y - box.s * 1.2); g.textAlign = 'right'; g.fillText('±0.005', bx, ay - 4); }
      for (const [cx, cy] of [V2S(MB.x0, MB.y0), V2S(MB.x1, MB.y0), V2S(MB.x0, MB.y1), V2S(MB.x1, MB.y1)]) { g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 8); g.stroke(); }
    }
    // ---- raster cut of the mark (raw steel) ----
    const cp = clamp((t - tl.cut0) / (tl.cut1 - tl.cut0), 0, 1);
    if (t >= tl.cut0 && t < tl.hit + tl.ign + 0.05) {
      const P = cutPoint(Math.min(cp, 0.9999));
      g.save(); g.beginPath();
      const [x0, y0] = V2S(MB.x0 - 0.012, MB.y0), rowH = ((MB.y1 - MB.y0) / ROWS) * box.h, full = (MB.x1 - MB.x0 + 0.024) * box.w;
      if (cp >= 1) g.rect(box.x, box.y, box.w, box.h);
      else {
        g.rect(x0, box.y, full, (y0 - box.y) + P.r * rowH); // rows done (+ everything above the bbox)
        const [cx] = V2S(P.vx, 0);
        if (P.dir > 0) g.rect(x0, y0 + P.r * rowH, cx - x0, rowH); else g.rect(cx, y0 + P.r * rowH, x0 + full - cx, rowH);
      }
      g.clip(); g.drawImage(off.raw, box.x, box.y, box.w, box.h); g.restore();
      if (cp < 1) {
        if (!cutting) { cutting = true; S.cutOn(); }
        if (P.r !== lastRow) { lastRow = P.r; tone(1900 + P.r * 40, 0.03, 0.05, 'square'); S.whine(1100 + P.r * 30); }
        const [cx, cy] = V2S(P.vx, P.vy);
        // is the cutter inside material? (alpha test on the mark)
        const mx = Math.floor((cx - box.x) * DPR), my = Math.floor((cy - box.y) * DPR);
        const inMat = off.markA ? off.markA[clamp(my, 0, off.mark.height - 1) * off.mark.width + clamp(mx, 0, off.mark.width - 1)] > 60 : true;
        // spindle glow
        const rr = box.s * (inMat ? 3.2 : 2);
        const gl = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 3); gl.addColorStop(0, 'rgba(255,250,235,1)'); gl.addColorStop(0.18, 'rgba(255,170,60,.9)'); gl.addColorStop(1, 'rgba(255,90,0,0)');
        g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, rr * 3, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
        if (inMat) for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4 - P.dir * 0.5; const sp = 240 + Math.random() * 520; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp - P.dir * 120, vy: Math.sin(a) * sp, l: 0.35 + Math.random() * 0.5 }); }
        if (inMat && Math.random() < 0.5) chipsA.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 200 - P.dir * 90, vy: -120 - Math.random() * 220, r: Math.random() * 6, l: 1.2, s: box.s * (0.4 + Math.random() * 0.5) });
      } else if (cutting) { cutting = false; S.cutOff(); }
    }
    // ---- HIT: ignite + shockwave ----
    if (t >= tl.hit && !hitDone) {
      hitDone = true; shake = 1; S.hit(); sfx.impact(); burst(1.4, 120, 0.9, 'lowpass'); tone(41, 1.6, 0.8, 'sine', 30); burst(0.5, 4200, 0.25);
      for (let k = 0; k < 90; k++) { const a = Math.random() * Math.PI * 2, sp = 300 + Math.random() * 900; const [cx, cy] = V2S(0.55, 0.36); parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, l: 0.4 + Math.random() * 0.8 }); }
    }
    if (t >= tl.hit) {
      const ig = clamp((t - tl.hit) / tl.ign, 0, 1), [ix0] = V2S(MB.x0 - 0.02, 0), [ix1] = V2S(MB.x1 + 0.02, 0), sx = lerp(ix0, ix1, ease(ig));
      if (ig < 1) { clipRect(sx, box.y, box.w, box.h, () => g.drawImage(off.raw, box.x, box.y, box.w, box.h)); }
      clipRect(box.x, box.y, sx - box.x, box.h, () => g.drawImage(off.mark, box.x, box.y, box.w, box.h));
      if (ig < 1) { // hot ignition edge
        const eg = g.createLinearGradient(sx - box.s * 6, 0, sx + box.s * 2, 0); eg.addColorStop(0, 'rgba(255,105,0,0)'); eg.addColorStop(0.8, 'rgba(255,200,120,.95)'); eg.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.rect(sx - box.s * 6, box.y, box.s * 8, box.h); g.clip(); g.globalAlpha = 0.9; g.fillStyle = eg; g.fillRect(sx - box.s * 6, box.y, box.s * 8, box.h); g.restore();
      }
      // shockwave rings
      const st = t - tl.hit; if (st < 1.3) {
        const [cx, cy] = V2S(0.55, 0.36);
        for (const [d, w, a] of [[0, 5, 1], [0.12, 2, 0.6]]) { const u = clamp((st - d) / 1.1, 0, 1); if (u <= 0) continue; g.strokeStyle = `rgba(255,${130 + 80 * (1 - u)},40,${a * (1 - u)})`; g.lineWidth = w * (1 - u) + 0.5; g.beginPath(); g.ellipse(cx, cy, ease(u) * Math.max(W, H) * 0.75, ease(u) * Math.max(W, H) * 0.75 * 0.55, 0, 0, 7); g.stroke(); }
      }
      // flash
      if (st < 0.35) { g.fillStyle = `rgba(255,235,210,${(1 - st / 0.35) * 0.85})`; g.fillRect(-20, -20, W + 40, H + 40); }
    }
    // ---- NANYA slit open ----
    if (t >= tl.slit0) {
      if (!whoosh) { whoosh = true; sweep(0.55, 500, 6000, 0.3); burst(0.12, 2600, 0.25); }
      const u = ease(clamp((t - tl.slit0) / 0.45, 0, 1)), [, ny0] = V2S(0, 0.695), [, ny1] = V2S(0, 0.865), cy = (ny0 + ny1) / 2, hh = (ny1 - ny0) / 2 + 2;
      const [lx0] = V2S(-0.005, 0), [lx1] = V2S(1.005, 0), cx = (lx0 + lx1) / 2, hw = (lx1 - lx0) / 2 + 2;
      clipRect(cx - hw * u, cy - hh * Math.min(1, u * 3), hw * 2 * u, hh * 2 * Math.min(1, u * 3), () => g.drawImage(off.nanya, box.x, box.y, box.w, box.h));
      if (u < 1) { g.fillStyle = `rgba(255,220,170,${1 - u})`; g.fillRect(cx - hw * u, cy - 0.75, hw * 2 * u, 1.5); }
    }
    // ---- CNC + side lines lock ----
    if (t >= tl.cnc0) {
      const u = clamp((t - tl.cnc0) / 0.32, 0, 1), e = ease(u);
      g.save(); g.globalAlpha = e; const [ccx, ccy] = V2S(0.5, 0.94), sc = lerp(1.35, 1, e);
      g.translate(ccx, ccy); g.scale(sc, sc); g.translate(-ccx, -ccy);
      // lines slide in from the sides: draw left + right parts offset, centre CNC scaled
      const [lx] = V2S(0.262, 0), [rx] = V2S(0.672, 0);
      clipRect(lx - e * (lx - box.x), box.y, e * (lx - box.x), box.h, () => g.drawImage(off.cnc, box.x, box.y, box.w, box.h));
      clipRect(rx, box.y, e * (box.x + box.w - rx), box.h, () => g.drawImage(off.cnc, box.x, box.y, box.w, box.h));
      clipRect(lx, box.y, rx - lx, box.h, () => g.drawImage(off.cnc, box.x, box.y, box.w, box.h));
      g.restore();
      if (u >= 1 && !clunk) { clunk = true; burst(0.18, 300, 0.7, 'lowpass'); tone(110, 0.25, 0.4, 'square', 60); burst(0.06, 5000, 0.2); shake = Math.max(shake, 0.25); }
    }
    // ---- light sweep across the full logo ----
    if (t >= tl.sweep0 && t < tl.sweep0 + 1.3) {
      const u = (t - tl.sweep0) / 1.3, sxp = lerp(box.x - box.w * 0.4, box.x + box.w * 1.4, ease(u));
      const tmp = off.sweep || (off.sweep = document.createElement('canvas')); tmp.width = off.logo.width; tmp.height = off.logo.height; const x = tmp.getContext('2d');
      x.drawImage(off.logo, 0, 0); x.globalCompositeOperation = 'source-atop';
      const lx = (sxp - box.x) * DPR, bw = box.w * 0.16 * DPR, gr = x.createLinearGradient(lx - bw, 0, lx + bw, tmp.height * 0.3);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, tmp.width, tmp.height);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.75; g.drawImage(tmp, box.x, box.y, box.w, box.h); g.restore();
    }
    // ---- glint on the flick tip ----
    if (t >= tl.glint && t < tl.glint + 0.9) {
      if (!ting) { ting = true; tone(2637, 1.4, 0.07, 'sine'); tone(3951, 1.0, 0.04, 'sine', null, 0.02); }
      const u = (t - tl.glint) / 0.9, a = Math.sin(u * Math.PI), [gx, gy] = V2S(0.872, 0.03), R = box.s * 9 * a;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(gx, gy); g.rotate(u * 1.2);
      const gg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.5); gg.addColorStop(0, `rgba(255,255,255,${a})`); gg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gg; g.beginPath(); g.arc(0, 0, R * 0.5, 0, 7); g.fill();
      g.fillStyle = `rgba(255,240,220,${a})`;
      for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 4 * (k % 2 ? 1 : 1)); g.beginPath(); g.moveTo(-R * (k % 2 ? 0.45 : 1), 0); g.lineTo(0, -R * 0.03); g.lineTo(R * (k % 2 ? 0.45 : 1), 0); g.lineTo(0, R * 0.03); g.fill(); }
      g.restore();
    }
    // ---- tagline ----
    if (t >= tl.tag0) {
      if (!tag) { tag = true; tone(392, 0.9, 0.035, 'sine'); }
      const u = ease(clamp((t - tl.tag0) / 0.9, 0, 1)), y = box.y + box.h + Math.max(26, box.s * 3.2), fs = Math.max(11, Math.min(17, box.s * 1.45));
      const lines = W < 600 ? ['PRECISION CNC MACHINE TOOLS', 'TAICHUNG  ·  TAIWAN'] : ['PRECISION CNC MACHINE TOOLS   ·   TAICHUNG, TAIWAN'];
      g.textAlign = 'center'; g.font = `600 ${fs}px "Chakra Petch", sans-serif`;
      lines.forEach((s, k) => {
        const sp = lerp(fs * 1.1, fs * 0.42, u); g.fillStyle = k ? `rgba(255,120,20,${u})` : `rgba(205,208,212,${u})`;
        let wsum = 0; for (const ch of s) wsum += g.measureText(ch).width + sp; let x = W / 2 - wsum / 2;
        g.textAlign = 'left'; for (const ch of s) { g.fillText(ch, x, y + k * fs * 1.9); x += g.measureText(ch).width + sp; }
      });
      const pu = clamp((t - tl.tag0 - 0.9) / 0.5, 0, 1);
      if (pu > 0) { g.textAlign = 'center'; g.font = `500 ${fs * 0.8}px "Chakra Petch", sans-serif`; g.fillStyle = `rgba(140,145,152,${pu})`; const s = 'P R E S E N T S'; g.fillText(s, W / 2, y + lines.length * fs * 1.9 + fs * 1.2); }
    }
    // ---- particles: sparks + chips ----
    g.globalCompositeOperation = 'lighter';
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.l -= dt; if (p.l <= 0) { parts.splice(k, 1); continue; }
      p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.strokeStyle = `rgba(255,${150 + p.l * 120 | 0},${60 + p.l * 80 | 0},${Math.min(1, p.l * 2)})`; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    for (let k = chipsA.length - 1; k >= 0; k--) {
      const p = chipsA[k]; p.l -= dt; if (p.l <= 0 || p.y > H + 20) { chipsA.splice(k, 1); continue; }
      p.vy += 1300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 14;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.strokeStyle = `rgba(210,214,220,${Math.min(1, p.l)})`; g.lineWidth = p.s * 0.5; g.beginPath(); g.arc(0, 0, p.s, 0, 4); g.stroke(); g.restore();
    }
    // ---- letterbox bars + fade out ----
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const lb = H * 0.075 * (1 - clamp((t - tl.out0) / 0.5, 0, 1));
    g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb);
    if (t > tl.out0) { g.fillStyle = `rgba(0,0,0,${clamp((t - tl.out0) / (tl.end - tl.out0), 0, 1)})`; g.fillRect(0, 0, W, H); }
    if (t > tl.end && !ended && !skipped) { ended = true; finishIntro(); }
  };
  requestAnimationFrame(frame);
}

function startFromTitle() {
  if (state !== 'title') return; titleReady = false; state = 'menu';
  audioInit(); sfx.boom(); flash(0.6); musicPlay('menu');
  transition(() => { toMenu('menu'); dailyStreak(); if (!profile.name) { overlay('callsign', true); setTimeout(() => $('csName').focus(), 100); } });
}

/* =====================================================================
   v4 SYSTEMS — Night Shift (arcade), Shop Talk (quiz), daily clock-in
   streak, announcer voice, personal-best ghost, ambience + FX hooks.
   ===================================================================== */
ACH.push(['shift5', 'Graveyard Shift', 'Pass 5 parts in one Night Shift.'], ['quiz', 'Shop Talk Ace', 'Answer 5 out of 5 in Shop Talk.'],
  ['streak3', 'Regular', 'Clock in 3 days in a row.'], ['ghost', 'Beat Yourself', 'Beat your personal-best ghost.']);

/* ---------------- announcer ---------------- */
let annVoice = null, lastSay = 0;
const pickVoice = () => { try { const vs = speechSynthesis.getVoices(); annVoice = vs.find(v => /^en/.test(v.lang) && /(Male|Daniel|David|Guy|Alex|Fred|UK English Male)/i.test(v.name)) || vs.find(v => /^en/.test(v.lang)) || null; } catch (e) { annVoice = null; } };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, pri = false) {
  if (!settings.announcer || !('speechSynthesis' in window) || !snd.ctx) return;
  const now = performance.now(); if (!pri && now - lastSay < 1100) return; lastSay = now;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (annVoice) u.voice = annVoice; u.rate = 1.06; u.pitch = 0.6; u.volume = clamp(settings.sfx, 0, 1); speechSynthesis.speak(u); } catch (e) { /* no speech */ }
}
const _popup = popup;
popup = function (text, cls = '', big = false) {
  _popup(text, cls, big);
  if (/GROOVE|PERFECT/.test(text)) buzz(18); else if (text === 'COMBO LOST') buzz(40);
  if (/GROOVE x4/.test(text)) say('Groove. Times four!', true);
  else if (/GROOVE x(\d)/.test(text)) say('Groove, times ' + text.match(/x(\d)/)[1]);
  else if (/PERFECT CORNER/.test(text)) say('Perfect corner');
  else if (text === 'COMBO LOST') say('Combo lost');
  else if (text === 'GHOST BEATEN') say('Personal best!', true);
};
const buzz = (p) => { try { if (ptr.touch && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } };
const _bigMsg = bigMsg;
bigMsg = function (t, s, dur, cls) {
  if (t === 'CYCLE START' && isTouch && settings.touchMode !== 'direct') s = 'Touch anywhere: the tool runs to the start and plunges. Then drag to steer. Lift to retract.';
  if (t === 'HARD SPOT AHEAD') buzz([20, 40, 20]);
  _bigMsg(t, s, dur, cls);
  if (t === 'CYCLE START') say('Cycle start', true);
  else if (t === 'HARD SPOT AHEAD') say('Hard spot ahead', true);
  else if (t === 'CYCLE COMPLETE') say('Cycle complete. Inspection.', true);
  else if (/UNLOCKED/.test(t)) say(t.toLowerCase(), true);
  else if (/^SHIFT PART/.test(t)) say('Next part', true);
};
const _toast = toast;
let lastBuzz = 0;
toast = function (t, cls) { _toast(t, cls); if (t === 'TOOL BROKEN') { say('Tool broken!', true); buzz([120, 60, 220]); } else if (/CHATTER|OFF THE TOOLPATH/.test(t) && performance.now() - lastBuzz > 400) { lastBuzz = performance.now(); buzz(12); } };
const _showResults = showResults;
showResults = function () {
  const p = _showResults();
  setTimeout(() => { const g = $('rStamp').textContent; say(g === 'FAIL' ? 'Part rejected' : g === 'S' ? 'S rank! Zero tolerance!' : g + ' rank', true); }, 900);
  return p;
};

/* ---------------- personal-best ghost ---------------- */
const GHOST_DT = 0.1; let ghostRec = null, ghostPB = null, ghostBeat = false;
const ghost = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.6, 1).multiplyScalar(2.4), transparent: true, opacity: 0.8, toneMapped: false, depthTest: false }));
ghost.renderOrder = 5; ghost.visible = false; scene.add(ghost);
const ghostTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 48, (g) => { g.fillStyle = 'rgba(40,110,255,.9)'; g.beginPath(); g.moveTo(10, 0); g.lineTo(128, 0); g.lineTo(118, 48); g.lineTo(0, 48); g.fill(); g.fillStyle = '#fff'; g.font = '700 30px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillText('PB', 64, 35); }), depthTest: false, toneMapped: false }));
ghostTag.scale.set(9, 3.4, 1); ghostTag.visible = false; ghostTag.renderOrder = 6; scene.add(ghostTag);

/* ---------------- job start / world hooks ---------------- */
const _startJob = startJob;
startJob = function (id) {
  _startJob(id);
  ghostRec = []; ghostBeat = false;
  ghostPB = G.job.shift ? null : store.get('ghost-' + G.job.id, null);
  const P = G.P; ghost.scale.setScalar(P.lathe ? 2.2 : toolU.r + 2.4); ghost.rotation.set(P.lathe ? 0 : -Math.PI / 2, 0, 0);
  // machine door + air
  sweep(0.7, 900, 300, 0.25); burst(0.35, 160, 0.5, 'lowpass', 0.55); burst(0.5, 5200, 0.12, 'highpass', 0.1);
  if (G.job.shift) { const R = SHIFT.run; $('hMach').textContent = `${P.M.name} · NIGHT SHIFT · PART ${R.n} · TOOLS ${'●'.repeat(R.lives)}${'○'.repeat(3 - R.lives)} · TOTAL ${R.total}`; }
};
const _setWorld = setWorld;
setWorld = function (w) { _setWorld(w); mist.mesh.visible = w === 'game'; ghost.visible = ghostTag.visible = false; };
const _award = award;
award = function (r) {
  const a = _award(r);
  if (r.pass && r.best && G && !G.job.shift && ghostRec && ghostRec.length) store.set('ghost-' + G.job.id, ghostRec.slice(0, 2400));
  return a;
};
const _applyGfx = applyGfx;
applyGfx = function () {
  _applyGfx();
  const sm = settings.gfx === 2 ? 4 : 0;
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== sm) { rt.samples = sm; rt.dispose(); }
  bloom.strength = settings.gfx === 2 ? 0.85 : 0.7;
};

/* ---------------- per-frame extras (FX, ghost, mist, ambience) ---------------- */
let lastX = performance.now(), ambT = 3;
function extraFrame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastX) / 1000), t = now / 1000; lastX = now;
  M_holo.uniforms.time.value = t;
  // drag-touch: once the tool reaches the start point, plunge automatically
  if (G && state === 'play' && T.active && !G.started) { const s0 = G.P.pts[0]; if (Math.hypot(G.x - s0[0], G.y - s0[1]) < 1.2) { ptr.down = true; buzz(15); } }
  autoQuality(dt);
  const game = camMode === 'game', ultra = settings.gfx === 2;
  if (game) {
    for (const s of encl.userData.bokeh) s.material.opacity = s.userData.o * (0.7 + 0.3 * Math.sin(t * 0.6 + s.userData.ph));
    const m = encl.userData.motes; m.rotation.y += dt * 0.025; m.position.y = Math.sin(t * 0.3) * 8;
  }
  SR.mirror.visible = !game && ultra;
  fxPass.uniforms.streak.value = ultra ? 1 : 0;
  fxPass.uniforms.glass.value = game && ultra && state === 'play' ? 1 : 0;
  if (G && state !== 'paused') {
    const P = G.P;
    if (!P.lathe) {
      topMat.uniforms.wet.value = lerp(topMat.uniforms.wet.value, G.coolOn ? 1 : 0, Math.min(1, dt * (G.coolOn ? 3 : 0.3)));
      topMat.uniforms.ringI.value = state === 'inspect' || state === 'post' ? 0.35 : 1;
      spindle.userData.ring.material.color.setRGB(1.5, 1.45 - G.heat * 0.006, 1.38 - G.heat * 0.01);
    }
    if (G.coolOn && state === 'play') for (let k = 0; k < 2; k++) {
      const x = P.lathe ? G.x : G.x + (Math.random() - 0.5) * 10, y = P.lathe ? G.y + 4 : 4 + Math.random() * 6, z = P.lathe ? 4 : G.y + (Math.random() - 0.5) * 10;
      mist.emit(x, y, z, (Math.random() - 0.5) * 40, 10 + Math.random() * 30, (Math.random() - 0.5) * 40, 1.4, 10 + Math.random() * 16);
    }
    mist.update(dt, () => -9999, 0.4, 22);
    // ghost of the personal best
    if (!ghostRec) ghostRec = [];
    if (state === 'play' && G.started && !G.done) {
      const idx = Math.floor(G.t / GHOST_DT); while (ghostRec.length <= idx) ghostRec.push(G.i);
      if (ghostPB && ghostPB.length) {
        const gi = ghostPB[Math.min(idx, ghostPB.length - 1)], p = P.pts[Math.min(P.n - 1, gi)];
        if (P.lathe) { ghost.position.set(p[0], p[1], 1.2); ghostTag.position.set(p[0], p[1] + 9, 2); }
        else { ghost.position.set(p[0], 0.7, p[1]); ghostTag.position.set(p[0], 12, p[1]); }
        ghost.visible = ghostTag.visible = idx < ghostPB.length + 5;
        ghost.material.opacity = 0.55 + Math.sin(t * 5) * 0.25;
      }
    } else if (state !== 'play') { ghost.visible = ghostTag.visible = false; }
    if (G.done && ghostPB && !ghostBeat && G.t < ghostPB.length * GHOST_DT) { ghostBeat = true; unlock('ghost'); popup('GHOST BEATEN', 'perfect', true); }
  }
  // factory ambience in menus: distant clanks and air
  if (snd.ctx && (state === 'menu' || state === 'title')) {
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 2.5 + Math.random() * 5; const r = Math.random();
      if (r < 0.45) { burst(0.25, 240 + Math.random() * 200, 0.08, 'lowpass'); tone(90 + Math.random() * 60, 0.3, 0.03, 'square'); }
      else if (r < 0.75) burst(1.2, 4200, 0.025, 'highpass');
      else { tone(1200 + Math.random() * 500, 0.6, 0.012, 'sine'); tone(1600 + Math.random() * 500, 0.6, 0.008, 'sine', null, 0.08); }
    }
  }
}
const _musicTick = musicTick;
musicTick = function () { _musicTick(); extraFrame(); };

/* ---------------- auto quality: keep phones smooth ---------------- */
const AQ = { acc: 0, n: 0, cool: 4, drops: 0 };
function autoQuality(dt) {
  if (document.hidden || state === 'boot' || state === 'paused') return;
  AQ.cool -= dt; AQ.acc += dt; AQ.n++;
  if (AQ.acc < 2) return;
  const fps = AQ.n / AQ.acc; AQ.acc = 0; AQ.n = 0;
  if (AQ.cool > 0) return;
  if (fps < 38 && settings.gfx > 0 && AQ.drops < 2) {
    settings.gfx--; AQ.drops++; AQ.cool = 5; store.set('settings', settings); applyGfx();
    if ($('hud').classList.contains('on')) toast(`GRAPHICS → ${['LOW', 'HIGH'][settings.gfx]} FOR SMOOTH PLAY`);
  }
}

/* ---------------- NIGHT SHIFT (arcade) ---------------- */
function makeShiftJob(n) {
  const R = seeded(((Date.now() & 0xffffff) ^ (n * 7919)) >>> 0), lvl = n - 1, fam = n < 3 ? [0, 1, 2, 4][Math.floor(R() * 4)] : Math.floor(R() * 5);
  const m = unlocked('nv855') && R() < 0.5 ? 'nv855' : 'x8';
  const tool = [8, 8, 6, 6, 6, 4][Math.min(5, lvl)];
  const paths = [
    () => { const k = 3 + Math.floor(R() * 4) + Math.min(3, Math.floor(lvl / 2)), a = 3 + R() * 3 + Math.min(4, lvl * 0.5), ph = R() * 6.28; return loop(t => { const r = 21 + a * Math.cos(k * t + ph); return [Math.cos(t) * r * 1.25, Math.sin(t) * r]; }, 1400); },
    () => rrect(46 + R() * 34, 30 + R() * 22, 3 + R() * 9),
    () => { const f = 1 + R() * 1.2 + Math.min(1.2, lvl * 0.15), a = 10 + R() * 8, p = []; for (let x = -42; x <= 42; x += 0.5) p.push([x, Math.sin((x / 42) * Math.PI * f) * a]); return p; },
    () => { const k = 5 + Math.floor(R() * 3), ri = 0.5 + R() * 0.18, rot = R() * 6.28, p = []; for (let i = 0; i <= k * 2; i++) { const a = rot + (i / (k * 2)) * Math.PI * 2, r = i % 2 ? 27 * ri : 27; p.push([Math.cos(a) * r * 1.2, Math.sin(a) * r]); } return p; },
    () => { const turns = 2 + R() * 1.2, p = []; for (let t = 0; t <= Math.PI * 2 * turns; t += 0.01) { const r = 4 + 24 * (t / (Math.PI * 2 * turns)); p.push([Math.cos(t) * r * 1.2, Math.sin(t) * r * 0.95]); } return p; },
  ];
  const hard = []; if (lvl >= 2) { const a = 0.2 + R() * 0.55; hard.push([a, a + 0.07]); } if (lvl >= 5) { const a = 0.15 + R() * 0.3; hard.push([a, a + 0.06]); }
  const names = ['Lobed Cam', 'Pocket Wall', 'Wave Slot', 'Star Plate', 'Seal Spiral'];
  return { id: 'shift', m, name: `${names[fam]} · Part ${String(n).padStart(2, '0')}`, client: 'Night Shift', shift: true, tool, depth: 1.5 + Math.min(2.5, lvl * 0.3),
    feed: Math.round((1500 + R() * 350) * (1 + 0.07 * lvl)), rpm: 10000 + Math.min(2000, lvl * 300), hard, brief: 'Night Shift part. Faster every time.',
    bonus: { id: 'groove', text: 'Reach a x4 groove multiplier' }, path: paths[fam] };
}
function openShift() {
  const best = store.get('shiftBest', 0);
  $('shBest').textContent = best ? best : '—';
  $('shGo').onclick = () => {
    sfx.click(); overlay('shiftOv', false);
    SHIFT.run = { n: 1, total: 0, lives: 3, passed: 0, parts: [] }; SHIFT.job = makeShiftJob(1);
    transition(() => { startJob('shift'); bigMsg('SHIFT PART 01', 'Clock in. Parts keep coming.', 1.6); });
  };
  overlay('shiftOv', true); bindHover($('shiftOv'));
}
function shiftRecord(r) {
  const R = SHIFT.run; if (!R) return;
  if (r.pass) { R.total += r.score; R.passed++; } else R.lives--;
  R.parts.push(r.pass ? r.score : 0);
  lastPost = { mode: 'shift', score: R.total, label: `Night Shift · ${R.passed} parts` };
  if (R.passed >= 5) unlock('shift5');
  setTimeout(() => { $('rTag').textContent = `NIGHT SHIFT · PART ${R.n} · TOOLS ${'●'.repeat(Math.max(0, R.lives))}${'○'.repeat(3 - Math.max(0, R.lives))} · SHIFT TOTAL ${R.total}`; }, 0);
}
function shiftButtons(r) {
  const R = SHIFT.run;
  const next = () => { overlay('results', false); R.n++; SHIFT.job = makeShiftJob(R.n); transition(() => { startJob('shift'); bigMsg(`SHIFT PART ${String(R.n).padStart(2, '0')}`, `Feed +${Math.round((R.n - 1) * 7)}% · ${R.lives} tool${R.lives > 1 ? 's' : ''} left`, 1.6); }); };
  if (R.lives > 0) return [['Next part', next, 'pri'], ['Clock out', () => { overlay('results', false); endShift(); }, '']];
  return [['Shift report', () => { overlay('results', false); endShift(); }, 'pri']];
}
function endShift() {
  const R = SHIFT.run; if (!R) return;
  const best = store.get('shiftBest', 0), isBest = R.total > best; if (isBest) store.set('shiftBest', R.total);
  $('seTotal').textContent = R.total; $('seParts').textContent = R.passed; $('seBest').textContent = isBest ? 'NEW BEST' : `Best ${best}`;
  $('seBars').innerHTML = R.parts.map(s => `<i style="height:${Math.max(4, (s / 1250) * 100)}%" class="${s ? '' : 'x'}"></i>`).join('');
  $('seSubmit').onclick = () => { sfx.click(); overlay('shiftEnd', false); toMenu('board', true); };
  $('seAgain').onclick = () => { sfx.click(); overlay('shiftEnd', false); toMenu('menu'); openShift(); };
  $('seMenu').onclick = () => { sfx.back(); overlay('shiftEnd', false); transition(() => toMenu('menu')); };
  G = null; state = 'menu'; setWorld('menu'); musicPlay('menu'); screen('menu'); renderMenu();
  overlay('shiftEnd', true); sfx.level(); say(`Shift over. ${R.total} points.`, true); bindHover($('shiftEnd'));
}

/* ---------------- SHOP TALK (machinist quiz) ---------------- */
const QUIZ = [
  ['In G-code, what does G01 do?', ['Linear feed move', 'Rapid move', 'Clockwise arc', 'Dwell'], 0, 'G01 is linear interpolation at the programmed feed rate.'],
  ['What does G00 do?', ['Rapid positioning', 'Linear feed move', 'Spindle stop', 'Return to home'], 0, 'G00 moves at the machine rapid rate. Never cut with it.'],
  ['G02 is…', ['Clockwise arc', 'Counter-clockwise arc', 'Rapid move', 'Tool change'], 0, 'G02 = clockwise circular interpolation, G03 = counter-clockwise.'],
  ['M03 turns the spindle…', ['On, clockwise', 'On, counter-clockwise', 'Off', 'To orient position'], 0, 'M03 = spindle CW, M04 = CCW, M05 = stop.'],
  ['Which M-code turns flood coolant on?', ['M08', 'M09', 'M06', 'M30'], 0, 'M08 coolant on, M09 coolant off.'],
  ['M06 is used for…', ['Tool change', 'Coolant on', 'Program end', 'Optional stop'], 0, 'M06 calls the automatic tool changer.'],
  ['M30 means…', ['Program end and rewind', 'Spindle on', 'Optional stop', 'Coolant off'], 0, 'M30 ends the program and rewinds to the top.'],
  ['G41 applies cutter compensation to the…', ['Left', 'Right', 'Top', 'Centre'], 0, 'G41 = cutter comp left, G42 = right, G40 = cancel.'],
  ['G43 activates…', ['Tool length offset', 'Work offset 1', 'Cutter comp left', 'Inch mode'], 0, 'G43 H__ applies the tool length offset.'],
  ['G54 selects…', ['Work coordinate system 1', 'Tool length offset', 'Incremental mode', 'Metric units'], 0, 'G54–G59 are the standard work offsets.'],
  ['G91 switches the control to…', ['Incremental positioning', 'Absolute positioning', 'Inch units', 'Polar coordinates'], 0, 'G90 = absolute, G91 = incremental.'],
  ['On a lathe, G96 gives…', ['Constant surface speed', 'Constant RPM', 'Feed per minute', 'Threading cycle'], 0, 'G96 keeps cutting speed constant as the diameter changes. Clamp it with G50.'],
  ['G83 is a…', ['Peck drilling cycle', 'Tapping cycle', 'Boring cycle', 'Circular pocket'], 0, 'G83 pecks to break and clear chips in deep holes.'],
  ['In climb milling, chip thickness goes from…', ['Thick to thin', 'Thin to thick', 'Constant', 'Zero to zero'], 0, 'Climb milling starts thick and exits thin, which is better for finish and tool life on rigid machines.'],
  ['Best first fix for chatter?', ['Shorten tool stick-out', 'Raise the feed a lot', 'Use a longer holder', 'Turn coolant off'], 0, 'Rigidity first: shortest stick-out and the stiffest setup.'],
  ['Vc = 200 m/min with a Ø10 mm cutter. RPM is about…', ['6,366', '637', '2,000', '20,000'], 0, 'n = Vc × 1000 ÷ (π × D) = 200000 ÷ 31.4 ≈ 6,366 rpm.'],
  ['10,000 rpm, 4 flutes, 0.05 mm/tooth. Feed is…', ['2,000 mm/min', '500 mm/min', '200 mm/min', '20,000 mm/min'], 0, 'F = n × z × fz = 10,000 × 4 × 0.05 = 2,000 mm/min.'],
  ['Ra on a drawing measures…', ['Surface roughness', 'Roundness', 'Flatness', 'Runout'], 0, 'Ra is the arithmetic average roughness, usually in µm.'],
  ['Which coating is gold coloured?', ['TiN', 'AlTiN', 'DLC', 'TiCN'], 0, 'TiN is the classic gold coating. AlTiN is violet-grey, DLC is black.'],
  ['BT-40 describes…', ['A tool holder taper', 'A thread size', 'A coolant pressure', 'A carbide grade'], 0, 'BT-40 is a 7/24 spindle taper standard, common on VMCs.'],
  ['Backlash is…', ['Lost motion when an axis reverses', 'Tool deflection', 'Spindle runout', 'Thermal growth'], 0, 'Backlash is play in the drive that shows up on direction reversal.'],
  ['To finish a tight inside corner you need…', ['A smaller-diameter cutter', 'A bigger cutter', 'More coolant', 'Higher RPM only'], 0, 'An end mill cannot cut an inside radius smaller than its own radius.'],
  ['1 micron equals…', ['0.001 mm', '0.01 mm', '0.1 mm', '0.0001 mm'], 0, '1 µm = 0.001 mm.'],
  ['Repeatability means…', ['Returning to the same point again and again', 'Absolute accuracy over full travel', 'Max feed rate', 'Spindle stiffness'], 0, 'Repeatability is how consistently an axis returns to a commanded point.'],
  ['ATC stands for…', ['Automatic Tool Changer', 'Axis Travel Control', 'Auto Thermal Compensation', 'Adaptive Torque Control'], 0, 'The ATC swaps tools from the magazine into the spindle.'],
  ['CMM stands for…', ['Coordinate Measuring Machine', 'Computer Milling Module', 'Cutter Motion Monitor', 'Constant Machining Mode'], 0, 'A CMM probes parts to check them against the drawing.'],
  ['A C-axis on a lathe lets you…', ['Index the spindle for milling features', 'Cut longer parts', 'Run coolant through the chuck', 'Change tools faster'], 0, 'C-axis positions the spindle so live tools can mill flats, holes and slots.'],
  ['Main reason for a slant-bed lathe?', ['Chip flow and rigidity', 'Cheaper castings', 'Lighter weight', 'Easier painting'], 0, 'The slant lets chips fall away and stiffens the bed.'],
  ['NANYA CNC is headquartered in…', ['Taichung, Taiwan', 'Osaka, Japan', 'Stuttgart, Germany', 'Shenzhen, China'], 0, 'NANYA CNC builds precision machine tools in Taichung, Taiwan.'],
  ['The NANYA NV-855 spindle tops out at…', ['12,000 rpm', '6,000 rpm', '8,000 rpm', '30,000 rpm'], 0, 'The NV-855 runs a 12,000 rpm direct-drive spindle.'],
  ['NV-855 repeatability is…', ['±0.002 mm', '±0.02 mm', '±0.2 mm', '±0.05 mm'], 0, 'The NV-855 is rated ±0.002 mm repeatability (JIS).'],
  ['The NANYA 3605M max turning diameter is…', ['Ø520 mm', 'Ø200 mm', 'Ø940 mm', 'Ø120 mm'], 0, 'Ø520 mm max turning diameter, Ø940 mm swing over bed.'],
];
const QZ = { list: [], i: 0, score: 0, streak: 0, t: 0, timer: 0, answered: false };
function openQuiz() {
  const pool = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 5);
  QZ.list = pool.map(([q, a, c, why]) => { const order = a.map((x, k) => k).sort(() => Math.random() - 0.5); return { q, a: order.map(k => a[k]), c: order.indexOf(c), why }; });
  QZ.i = 0; QZ.score = 0; QZ.streak = 0;
  const paid = store.get('quiz-' + dayKey, 0); $('qzPaid').textContent = paid < 3 ? `Paid rounds left today: ${3 - paid}` : 'Practice round · rewards reset tomorrow';
  overlay('quiz', true); quizShow(); musicPlay('menu');
}
function quizShow() {
  const Q = QZ.list[QZ.i]; QZ.answered = false;
  $('qzN').textContent = `QUESTION ${QZ.i + 1} / 5`; $('qzPips').innerHTML = QZ.list.map((_, k) => `<i class="${k < QZ.i ? (QZ.list[k].ok ? 'ok' : 'no') : k === QZ.i ? 'cur' : ''}"></i>`).join('');
  $('qzQ').textContent = Q.q; $('qzWhy').textContent = ''; $('qzWhy').className = 'qwhy'; $('qzNext').hidden = true;
  $('qzA').innerHTML = Q.a.map((x, k) => `<button class="qa" data-k="${k}"><i>${'ABCD'[k]}</i><span>${esc(x)}</span></button>`).join('');
  $('qzA').querySelectorAll('.qa').forEach(b => b.onclick = () => quizAnswer(+b.dataset.k));
  bindHover($('quiz'));
  QZ.t = 12; clearInterval(QZ.timer);
  QZ.timer = setInterval(() => { QZ.t -= 0.05; $('qzT').style.width = clamp(QZ.t / 12, 0, 1) * 100 + '%'; $('qzT').classList.toggle('low', QZ.t < 4); if (QZ.t <= 4 && QZ.t > 3.95) sfx.warn(); if (QZ.t <= 0) quizAnswer(-1); }, 50);
}
function quizAnswer(k) {
  if (QZ.answered) return; QZ.answered = true; clearInterval(QZ.timer);
  const Q = QZ.list[QZ.i], ok = k === Q.c; Q.ok = ok;
  $('qzA').querySelectorAll('.qa').forEach((b, j) => { b.disabled = true; if (j === Q.c) b.classList.add('ok'); else if (j === k) b.classList.add('no'); });
  if (ok) { QZ.score++; QZ.streak++; sfx.perfect(); if (QZ.streak >= 3) say(`${QZ.streak} in a row!`); else say('Correct'); }
  else { QZ.streak = 0; sfx.back(); glitch(); say(k < 0 ? 'Time' : 'Wrong'); }
  $('qzWhy').textContent = (ok ? '✓ ' : k < 0 ? '⏱ Time up. ' : '✕ ') + Q.why; $('qzWhy').className = 'qwhy ' + (ok ? 'ok' : 'no');
  $('qzNext').hidden = false; $('qzNext').textContent = QZ.i < 4 ? 'Next question' : 'See results';
  $('qzNext').onclick = () => { sfx.click(); if (QZ.i < 4) { QZ.i++; quizShow(); } else quizEnd(); };
}
function quizEnd() {
  const paid = store.get('quiz-' + dayKey, 0), pays = paid < 3;
  const cr = pays ? QZ.score * 25 + (QZ.score === 5 ? 75 : 0) : 0, xp = pays ? QZ.score * 15 : 0;
  if (pays) { store.set('quiz-' + dayKey, paid + 1); profile.credits += cr; profile.xp += xp; }
  if (QZ.score === 5) unlock('quiz');
  saveProfile();
  $('qzPips').innerHTML = QZ.list.map(q => `<i class="${q.ok ? 'ok' : 'no'}"></i>`).join('');
  $('qzN').textContent = 'ROUND COMPLETE';
  $('qzQ').innerHTML = `<span class="qbig">${QZ.score}<small>/5</small></span>`;
  $('qzA').innerHTML = `<div class="qrew"><span class="cr">+${cr}</span><span>+${xp} XP</span></div>`;
  $('qzWhy').className = 'qwhy'; $('qzWhy').textContent = QZ.score === 5 ? 'Flawless. You know your G-codes.' : QZ.score >= 3 ? 'Solid shop-floor knowledge.' : 'Back to the manual, apprentice.';
  $('qzNext').hidden = false; $('qzNext').textContent = 'Another round';
  $('qzNext').onclick = () => { sfx.click(); openQuiz(); };
  QZ.score === 5 ? sfx.level() : sfx.pass(); if (cr) sfx.coin(); flash(0.15);
  showAchToasts();
}
document.querySelectorAll('[data-qclose]').forEach(b => b.onclick = () => { clearInterval(QZ.timer); sfx.back(); overlay('quiz', false); renderMenu(); });

/* ---------------- daily clock-in streak ---------------- */
const STREAK_PAY = [50, 75, 100, 150, 200, 250, 400];
function dailyStreak() {
  const st = profile.streak || { last: 0, n: 0 };
  if (st.last === dayKey) return;
  const y = new Date(); y.setDate(y.getDate() - 1); const yk = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
  st.n = st.last === yk ? st.n + 1 : 1; st.last = dayKey; profile.streak = st;
  const pay = STREAK_PAY[(st.n - 1) % 7]; profile.credits += pay; saveProfile();
  if (st.n >= 3) unlock('streak3');
  $('stDay').textContent = `DAY ${st.n}`; $('stPay').textContent = '+' + pay;
  $('stTrack').innerHTML = STREAK_PAY.map((p, k) => { const d = ((st.n - 1) % 7); return `<div class="${k < d ? 'done' : k === d ? 'now' : ''}"><small>D${k + 1}</small><b>${p}</b></div>`; }).join('');
  $('stOk').onclick = () => { sfx.coin(); overlay('streak', false); renderMenu(); showAchToasts(); };
  setTimeout(() => { if (!$('callsign').classList.contains('on')) { overlay('streak', true); sfx.achieve(); bindHover($('streak')); } else { const iv = setInterval(() => { if (!$('callsign').classList.contains('on')) { clearInterval(iv); overlay('streak', true); sfx.achieve(); } }, 300); } }, 700);
}

/* keyboard for the new overlays (capture phase so the menu doesn't also react) */
addEventListener('keydown', (e) => {
  if ($('quiz').classList.contains('on')) {
    e.stopImmediatePropagation();
    const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 }[e.code];
    if (k != null && !QZ.answered && QZ.list[QZ.i]) quizAnswer(k);
    else if (e.code === 'Enter' && !$('qzNext').hidden) $('qzNext').click();
    else if (e.code === 'Escape') { clearInterval(QZ.timer); overlay('quiz', false); renderMenu(); }
    return;
  }
  for (const id of ['streak', 'shiftOv', 'shiftEnd']) if ($(id).classList.contains('on')) {
    e.stopImmediatePropagation();
    if (e.code === 'Enter') { const b = $(id).querySelector('.btn.pri'); if (b) b.click(); }
    if (e.code === 'Escape' && id !== 'streak') overlay(id, false);
    return;
  }
}, true);
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { sfx.back(); overlay(b.dataset.close, false); });

/* ---------------- boot ---------------- */
applyGfx(); setWorld('menu'); setShowroomMachine('nv855'); runSplash(); requestAnimationFrame(frame);
window.__ZT.startJob = startJob; window.__ZT.openQuiz = openQuiz; window.__ZT.openShift = openShift; window.__ZT.SHIFT = SHIFT; window.__ZT.dailyStreak = dailyStreak;

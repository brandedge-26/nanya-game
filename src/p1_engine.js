import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

/* ==========================================================================
   ZERO TOLERANCE · The NANYA CNC Machining Challenge  (v3)
   ========================================================================== */
const VERSION = 'v4.0';
const STUDIO_CREDIT = 'BRAND EDGE CREATIONS'; // studio splash card; set to '' to hide
const LEAD_ENDPOINT = ''; // set to the website's API URL to collect leads + a shared leaderboard
const IMG = { full: '__LOGO_FULL__', logo: '__LOGO__', nv: '__IMG_NV__', x8: '__IMG_X8__', m36: '__IMG_36__' };
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (t) => { if (t == null || !isFinite(t)) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const store = {
  get(k, d) { try { const v = localStorage.getItem('zt3-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('zt3-' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const settings = Object.assign({ gfx: isTouch ? 1 : 2, music: 0.6, sfx: 0.85, shake: true, hints: true, announcer: true, touchMode: 'drag', touchSens: 1.0, touchAssist: true }, store.get('settings', {}));
const today = new Date(), dayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

/* ---------------- machines (specs from nye-cnc.com) ---------------- */
const MACHINES = {
  x8: { id: 'x8', name: 'NANO-X8', sub: 'Eco-Line 3-Axis CNC Vertical Machining Center', img: IMG.x8, type: 'mill', rapid: 40, atc: 1.8, rig: 1.0, feedMul: 1.0, need: 0, zone: 'ZONE 01',
    stats: [['Spindle', '12,000 rpm · BT-40 DDS'], ['Rapid X/Y/Z', '40 / 40 / 40 m/min'], ['ATC', '24 tools · 1.8 s'], ['Travel', '800 × 500 × 550 mm'], ['Accuracy', '±0.008 mm / 300 mm'], ['Repeatability', '±0.003 mm']],
    url: 'https://nye-cnc.com/products/nano-x8', fact: 'The real <b>NANO-X8</b> holds <b>±0.008 mm / 300 mm</b> positioning accuracy (JIS) with a 12,000 rpm direct-drive BT-40 spindle and a 24-tool arm-type ATC.' },
  nv855: { id: 'nv855', name: 'NV-855', sub: 'High Speed 3-Axis Vertical Machining Center', img: IMG.nv, type: 'mill', rapid: 48, atc: 1.5, rig: 1.12, feedMul: 1.25, need: 6, zone: 'ZONE 02',
    stats: [['Spindle', '12,000 rpm · direct drive'], ['Rapid X/Y/Z', '48 / 48 / 40 m/min'], ['ATC', '24 tools · 1.5 s'], ['Travel', '830 × 550 × 550 mm'], ['Accuracy', '±0.005 mm / 300 mm'], ['Repeatability', '±0.002 mm']],
    url: 'https://nye-cnc.com/products/nv-855', fact: 'The real <b>NV-855</b> holds <b>±0.005 mm / 300 mm</b> positioning and <b>±0.002 mm</b> repeatability (JIS), with 48 m/min rapids and 830 × 550 × 550 mm travels.' },
  m3605: { id: 'm3605', name: '3605M', sub: 'Large Slant-Bed CNC Lathe — Milling Series', img: IMG.m36, type: 'lathe', rapid: 30, atc: 0.6, rig: 1.08, feedMul: 1.0, need: 14, zone: 'ZONE 03',
    stats: [['Swing over bed', 'Ø940 mm'], ['Max turning Ø', 'Ø520 mm'], ['Turning length', '1,265 mm'], ['Travel X / Z', '295 / 1,350 mm'], ['Weight', '8,000 kg'], ['Options', 'C-axis · BMT turret']],
    url: 'https://nye-cnc.com/products/3605m', fact: 'The real <b>3605M</b> turns parts up to <b>Ø520 mm × 1,265 mm</b> on a large slant bed, with C-axis indexing and a BMT turret for mill-turn work.' },
};

/* ---------------- toolpaths (mm) ---------------- */
const loop = (fn, n = 900) => { const p = []; for (let k = 0; k <= n; k++) p.push(fn((k / n) * Math.PI * 2)); return p; };
function rrect(w, h, r) {
  const p = [], a = w / 2 - r, b = h / 2 - r;
  const seg = (cx, cy, a0) => { for (let k = 0; k <= 14; k++) { const t = a0 + (k / 14) * Math.PI / 2; p.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } };
  seg(-a, -b, Math.PI); seg(a, -b, -Math.PI / 2); seg(a, b, 0); seg(-a, b, Math.PI / 2); p.push(p[0].slice());
  return p;
}
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// client = industry from nye-cnc.com "Solutions for Every Industry"; bonus = optional objective for extra credits
const JOBS = [
  { id: 'j1', m: 'x8', name: 'Face & Square', client: 'Training Cell', tool: 10, depth: 1.0, feed: 1900, rpm: 9000, tutorial: true,
    brief: 'Your first part. Three straight facing passes across the stock. Learn the feed band and brake for each turn.',
    bonus: { id: 'time', text: 'Beat the target cycle time' }, path: () => [[-38, -22], [38, -22], [38, -8], [-38, -8], [-38, 6], [38, 6], [38, 20], [-38, 20]] },
  { id: 'j2', m: 'x8', name: 'Mounting Bracket', client: 'Automotive', tool: 8, depth: 2.0, feed: 1800, rpm: 9500,
    brief: 'Profile a bracket outline with radiused corners for an engine-bay mount. Keep a steady pace round every corner.',
    bonus: { id: 'corners', text: 'Land 4 perfect corners' }, path: () => rrect(72, 46, 9) },
  { id: 'j3', m: 'x8', name: 'Bearing Bore', client: 'Automotive', tool: 8, depth: 3.0, feed: 1500, rpm: 10000,
    brief: 'Interpolate a Ø48 bore for a wheel-hub bearing. One continuous circle, constant feed, no stopping.',
    bonus: { id: 'dry', text: 'Pass without using coolant' }, path: () => loop(t => [Math.cos(t + Math.PI) * 24, Math.sin(t + Math.PI) * 24]) },
  { id: 'j4', m: 'x8', name: 'Cam Slot', client: 'Industrial Automation', tool: 8, depth: 2.5, feed: 2000, rpm: 10000,
    brief: 'A fast S-curve slot for a packaging-line cam. The bends try to make the tool chatter. Ease off at each peak.',
    bonus: { id: 'groove', text: 'Reach a x4 groove multiplier' }, path: () => { const p = []; for (let x = -42; x <= 42; x += 0.5) p.push([x, Math.sin((x / 42) * Math.PI * 1.5) * 16]); return p; } },
  { id: 'j5', m: 'nv855', name: 'Drive Sprocket', client: 'Industrial Automation', tool: 6, depth: 3.0, feed: 1600, rpm: 11000, hard: [[0.55, 0.66]],
    brief: 'Eight teeth, sixteen tight turns. There is a hard spot in the stock: watch for the red zone and back off.',
    bonus: { id: 'corners', text: 'Land 10 perfect corners', n: 10 }, path: () => loop(t => { const r = 22 + 5 * Math.tanh(2.6 * Math.cos(8 * t)); return [Math.cos(t) * r, Math.sin(t) * r]; }, 1600) },
  { id: 'j6', m: 'nv855', name: 'Turbine Spiral', client: 'Energy', tool: 6, depth: 2.0, feed: 2000, rpm: 12000, hard: [[0.3, 0.38], [0.72, 0.8]],
    brief: 'A long Archimedean spiral for a turbine seal. Speed builds as the radius grows. Two hard spots on the way out.',
    bonus: { id: 'groove', text: 'Reach a x4 groove multiplier' }, path: () => { const p = []; for (let t = 0; t <= Math.PI * 6; t += 0.01) { const r = 4 + 24 * (t / (Math.PI * 6)); p.push([Math.cos(t) * r * 1.2, Math.sin(t) * r * 0.95]); } return p; } },
  { id: 'j7', m: 'nv855', name: 'NANYA N Engraving', client: 'Aerospace & Defense', tool: 4, depth: 1.0, feed: 1400, rpm: 12000,
    brief: 'Engrave the NANYA "N" on a flight-test fixture. Ten sharp corners with a small tool. Precision over speed.',
    bonus: { id: 'flawless', text: 'Max deviation under 0.35 mm' }, path: () => [[-24, 26], [-24, -26], [-12, -26], [12, 10], [12, -26], [24, -26], [24, 26], [12, 26], [-12, -10], [-12, 26], [-24, 26]] },
  { id: 'j8', m: 'nv855', name: 'Mould Cavity', client: 'Mold & Die', tool: 6, depth: 4.0, feed: 1700, rpm: 12000, hard: [[0.4, 0.5]],
    brief: 'A deep 12-lobe cavity for an injection mould. Heavy cut, lots of heat. Plan your coolant.',
    bonus: { id: 'heat', text: 'Finish with peak heat under 80%' }, path: () => loop(t => { const r = 24 + 3.2 * Math.tanh(3 * Math.cos(12 * t)); return [Math.cos(t) * r * 1.3, Math.sin(t) * r]; }, 1800) },
  { id: 'j9', m: 'm3605', name: 'Stepped Shaft', client: 'Automotive', tool: 0.8, depth: 0, feed: 1500, rpm: 2200,
    brief: 'Turn three diameters into a Ø40 bar for a gearbox shaft. Work from the tail end toward the chuck and square each shoulder.',
    bonus: { id: 'time', text: 'Beat the target cycle time' }, path: () => [[60, 10], [32, 10], [30, 12.5], [5, 12.5], [3, 15.5], [-40, 15.5], [-42, 18.5], [-52, 18.5]] },
  { id: 'j10', m: 'm3605', name: 'Taper & Groove', client: 'Medical & Healthcare', tool: 0.8, depth: 0, feed: 1400, rpm: 2000,
    brief: 'A taper into a relief groove for a surgical-instrument handle. Drop straight into the groove, out the other side, then finish the shoulder.',
    bonus: { id: 'flawless', text: 'Max deviation under 0.35 mm' }, path: () => [[60, 8], [50, 8], [22, 14], [10, 14], [10, 10], [3, 10], [3, 14], [-30, 14], [-32, 17.5], [-52, 17.5]] },
  { id: 'j11', m: 'm3605', name: 'Ball-End Pin', client: 'Aerospace & Defense', tool: 0.8, depth: 0, feed: 1300, rpm: 2400, hard: [[0.55, 0.68]],
    brief: 'A full-radius ball end, a neck groove and a long taper for a landing-gear pin. Smooth hands on the arc.',
    bonus: { id: 'dry', text: 'Pass without using coolant' }, path: () => { const p = []; for (let a = 0; a <= Math.PI / 2 + 1e-6; a += 0.04) p.push([46 + 10 * Math.cos(a), 10 * Math.sin(a)]); return p.concat([[30, 10], [28, 7], [22, 7], [20, 10], [-8, 10], [-40, 16], [-52, 16]]); } },
];
const DAILY = {
  id: 'daily', m: 'nv855', name: `Daily Part ${String(dayKey).slice(2)}`, client: 'Global Challenge', tool: 6, depth: 2.5, feed: 1700, rpm: 11000, daily: true,
  brief: 'Same part for every machinist on Earth today. Retries allowed. Only your best counts.',
  bonus: { id: 'groove', text: 'Reach a x4 groove multiplier' },
  hard: (() => { const R = seeded(dayKey * 7); const a = 0.25 + R() * 0.5; return [[a, a + 0.08]]; })(),
  path: () => { const R = seeded(dayKey), k = 3 + Math.floor(R() * 5), a = 3 + R() * 5, b = R() * 2.5, ph = R() * 6.28, rot = R() * 6.28;
    return loop(t => { const r = 21 + a * Math.cos(k * t + ph) + b * Math.cos(2 * k * t); return [Math.cos(t + rot) * r * 1.25, Math.sin(t + rot) * r]; }, 1400); },
};
const SHIFT = { job: null, run: null };
const jobById = (id) => id === 'daily' ? DAILY : id === 'shift' ? SHIFT.job : JOBS.find(j => j.id === id);

function prepare(job) {
  const M = MACHINES[job.m], raw = job.path(), cum = [0];
  for (let i = 1; i < raw.length; i++) cum[i] = cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
  const pts = [], total = cum[cum.length - 1];
  for (let s = 0, j = 1; s <= total + 1e-6; s += 0.5) {
    while (j < raw.length - 1 && cum[j] < s) j++;
    const u = clamp((s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]), 0, 1);
    pts.push([raw[j - 1][0] + (raw[j][0] - raw[j - 1][0]) * u, raw[j - 1][1] + (raw[j][1] - raw[j - 1][1]) * u]);
  }
  const n = pts.length, k = new Float32Array(n), rec = new Float32Array(n), tAt = new Float32Array(n), hard = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 3)], b = pts[i], c = pts[Math.min(n - 1, i + 3)];
    const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    k[i] = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))) / 3;
  }
  for (const [a, b] of job.hard || []) for (let i = Math.floor(a * n); i < Math.min(n, Math.floor(b * n)); i++) hard[i] = 1;
  const F = job.feed * M.feedMul;
  for (let i = 0; i < n; i++) { let m = 0; for (let j = -14; j <= 14; j++) m = Math.max(m, k[clamp(i + j, 0, n - 1)]); rec[i] = F * clamp(1 - m * 1.6, 0.38, 1) * (hard[i] ? 0.55 : 1); }
  for (let i = 1; i < n; i++) tAt[i] = tAt[i - 1] + 0.5 / (rec[i] / 60);
  // slow zones = corners (for "perfect corner" scoring)
  const zones = []; let z0 = -1;
  for (let i = 0; i < n; i++) { const slow = !hard[i] && rec[i] < F * 0.8; if (slow && z0 < 0) z0 = i; if (!slow && z0 >= 0) { if (i - z0 > 6) zones.push([z0, i]); z0 = -1; } }
  // G-code listing mapped to path indices
  const lathe = M.type === 'lathe', gc = [];
  const fx = (v) => (v >= 0 ? '' : '-') + Math.abs(v).toFixed(3);
  const step = Math.max(14, Math.floor(n / 110));
  const tno = String(lathe ? 1 : (job.tool >= 10 ? 1 : job.tool >= 8 ? 3 : job.tool >= 6 ? 5 : 7)).padStart(2, '0');
  gc.push({ i: -1, t: `O${String(4000 + (JOBS.indexOf(job) + 1) * 10).padStart(4, '0')} (${job.name.toUpperCase()})` });
  gc.push({ i: -1, t: lathe ? `T${tno}${tno} (CNMG 0.8R)` : `T${tno} M06 (D${job.tool} END MILL)` });
  gc.push({ i: -1, t: lathe ? `G96 S180 M03 (G50 S${job.rpm})` : `S${job.rpm} M03` });
  const P0 = pts[0];
  gc.push({ i: -1, t: lathe ? `G00 X${fx(P0[1] * 2 + 2)} Z${fx(P0[0] - 60 + 2)} M08` : `G00 X${fx(P0[0])} Y${fx(-P0[1])}` });
  if (!lathe) { gc.push({ i: -1, t: `G43 Z5. H${tno} M08` }); gc.push({ i: 0, t: `G01 Z-${job.depth.toFixed(1)} F300` }); }
  let N = 10;
  for (let i = step; i < n; i += step) {
    const p = pts[Math.min(i, n - 1)];
    gc.push({ i, t: lathe ? `N${N} G01 X${fx(p[1] * 2)} Z${fx(p[0] - 60)} F${(rec[i] / 1000).toFixed(2)}` : `N${N} G01 X${fx(p[0])} Y${fx(-p[1])} F${Math.round(rec[i])}` });
    N += 10;
  }
  gc.push({ i: n - 1, t: lathe ? 'G00 X100. Z50. M09' : 'G00 Z50. M09' });
  gc.push({ i: n - 1, t: 'M30' });
  return { job, M, pts, n, rec, tAt, hard, zones, par: tAt[n - 1] * 1.2 + 1.5, gc, lathe, F };
}

/* ---------------- renderer + post ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030303);
scene.fog = new THREE.Fog(0x030303, 700, 1600);
const camera = new THREE.PerspectiveCamera(38, 1, 2, 30000);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(scene, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.55, 0.82);
const fxPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, streak: { value: 0 }, glass: { value: 0 }, time: { value: 0 }, vig: { value: 1 }, grain: { value: 0.05 }, ca: { value: 0.0015 }, flash: { value: 0 }, heat: { value: 0 }, groove: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, grain, ca, flash, heat, groove, streak, glass; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c=vUv-.5; float d=length(c);
      vec2 off=c*(ca+heat*.004)*(1.+d);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      if(streak>0.){ vec3 s=vec3(0.); for(int i=1;i<=10;i++){ float o=float(i)*.0065; float w=1.-float(i)/11.;
          s+=(max(texture2D(tDiffuse,vUv+vec2(o,0.)).rgb-.94,0.)+max(texture2D(tDiffuse,vUv-vec2(o,0.)).rgb-.94,0.))*w; }
        col+=s*vec3(1.,.55,.25)*.9*streak; }
      if(glass>0.){ float band=smoothstep(.0,.06,fract((vUv.x*.8+vUv.y*.55)*1.4+.15))*smoothstep(.2,.08,fract((vUv.x*.8+vUv.y*.55)*1.4+.15));
        col+=vec3(.6,.7,.8)*band*.035*glass*smoothstep(.15,.6,d); col*=1.-.06*glass*smoothstep(.45,.8,d); }
      col*=mix(1., smoothstep(.95,.25,d), vig*.85);
      float edge=smoothstep(.35,.75,d);
      col+=vec3(1.,.35,0.)*edge*groove*.35;
      col=mix(col, col*vec3(1.25,.55,.45)+vec3(.12,0.,0.)*edge, heat*(.55+.45*sin(time*9.))*edge);
      col+=(h(vUv*res+time)-.5)*grain;
      col=mix(col, vec3(1.,.82,.6), flash);
      gl_FragColor=vec4(col,1.);
    }`,
});
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(fxPass);

function makeEnv() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020202);
  const add = (w, h, d, col, i, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i) })); m.position.set(x, y, z); s.add(m); };
  add(30, 0.5, 8, 0xffffff, 1.6, 0, 12, 0); add(0.6, 6, 30, 0xff6900, 1.4, -14, 2, 0); add(0.6, 6, 30, 0xff8a3d, 0.6, 14, 2, 0);
  add(30, 3, 0.6, 0xb0b8c4, 0.5, 0, 3, -14); add(30, 2, 0.6, 0xff6900, 0.5, 0, 1, 14); add(40, 0.4, 40, 0x1a1a1a, 1, 0, -6, 0);
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(s, 0.035).texture; pm.dispose(); return t;
}
scene.environment = makeEnv();
const canvasTex = (w, h, draw, srgb = true, rep = false) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
};
const loadTex = (src) => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; return t; };
const logoTex = loadTex(IMG.logo);
const logoImg = new Image(); logoImg.src = IMG.logo;
const glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });

/* ---------------- workshop enclosure (in-game backdrop) ---------------- */
const steelTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#7d838b'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2200; i++) { const v = 100 + Math.random() * 80 | 0; g.fillStyle = `rgba(${v},${v},${v + 6},.16)`; g.fillRect(Math.random() * w, 0, 1, h); }
  g.fillStyle = 'rgba(0,0,0,.45)'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 3, h);
}, true, true);
steelTex.repeat.set(6, 3);
const encl = new THREE.Group(); scene.add(encl);
{
  const wallM = new THREE.MeshStandardMaterial({ map: steelTex, color: 0x5d636b, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.6, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(1300, 800, 1000), wallM); room.position.set(0, 230, -80); encl.add(room);
  const pan = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1000), new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.6, roughness: 0.5 }));
  pan.rotation.x = -Math.PI / 2; pan.position.set(0, -168, -80); pan.receiveShadow = true; encl.add(pan);
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(3), toneMapped: false });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(330, 3.2, 8, 96, Math.PI * 1.1), led); arc.position.set(0, 20, -575); arc.rotation.z = -Math.PI * 0.05; encl.add(arc);
  const arc2 = new THREE.Mesh(new THREE.TorusGeometry(360, 1.4, 6, 96, Math.PI * 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(1.4), toneMapped: false }));
  arc2.position.copy(arc.position); arc2.rotation.copy(arc.rotation); encl.add(arc2);
  for (const x of [-640, 640]) { const s = new THREE.Mesh(new THREE.BoxGeometry(4, 600, 4), led); s.position.set(x, 200, -560); encl.add(s); }
  const topStrip = new THREE.Mesh(new THREE.BoxGeometry(1200, 4, 4), led); topStrip.position.set(0, 620, -560); encl.add(topStrip);
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(300, 35), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.55, color: 0xbbbbbb }));
  lg.position.set(0, 420, -578); encl.add(lg);
  // out-of-focus shop lights behind the machine (bokeh)
  const bk = [];
  for (let k = 0; k < 46; k++) {
    const warm = Math.random(), c = warm < 0.55 ? new THREE.Color(1, 0.55, 0.18) : warm < 0.85 ? new THREE.Color(1, 0.9, 0.75) : new THREE.Color(0.45, 0.65, 1);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c.multiplyScalar(1.6), transparent: true, opacity: 0.12 + Math.random() * 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const s = 22 + Math.random() * 70; sp.scale.set(s, s, 1); sp.position.set((Math.random() - 0.5) * 1200, -60 + Math.random() * 640, -540 - Math.random() * 20); sp.userData.ph = Math.random() * 6; sp.userData.o = sp.material.opacity; encl.add(sp); bk.push(sp);
  }
  encl.userData.bokeh = bk;
  // light shaft + dust motes over the work
  const shaftTex = canvasTex(4, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,220,.0)'); gr.addColorStop(0.35, 'rgba(255,240,220,.10)'); gr.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(40, 150, 520, 32, 1, true), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.set(-60, 230, -30); shaft.rotation.z = 0.32; encl.add(shaft);
  const dg = new THREE.BufferGeometry(), dp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { dp[i * 3] = (Math.random() - 0.5) * 420; dp[i * 3 + 1] = Math.random() * 380; dp[i * 3 + 2] = (Math.random() - 0.5) * 360; }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const motes = new THREE.Points(dg, new THREE.PointsMaterial({ size: 1.6, map: glowTex, color: 0xffe2c0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  encl.add(motes); encl.userData.motes = motes;
}
const hemi = new THREE.HemisphereLight(0xb8c2cf, 0x0c0c0c, 0.55); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-140, 320, 190); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 50, far: 900 }); key.shadow.bias = -0.0006;
scene.add(key, key.target);
const rim = new THREE.PointLight(0xff6900, 0.8, 0, 0); rim.position.set(160, 140, -260); scene.add(rim);
const LDIR = new THREE.Vector3(-140, 320, 190).normalize();

const M_dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, metalness: 0.55, roughness: 0.45 });
const M_steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.28 });
const M_table = new THREE.MeshStandardMaterial({ color: 0x3b3f45, metalness: 0.75, roughness: 0.38 });
const M_alu = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: 0.65, roughness: 0.32 });
const M_holo = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { time: { value: 0 }, col: { value: new THREE.Color(1, 0.45, 0.1) } },
  vertexShader: 'varying vec3 vN, vV, vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform float time; uniform vec3 col; varying vec3 vN, vV, vW; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),3.); float scan=.6+.4*sin(vW.y*1.4-time*6.); gl_FragColor=vec4(col*(f*.45+.012)*scan,1.); }' });
const M_ghost = new THREE.MeshStandardMaterial({ color: 0x23262a, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.18, depthWrite: false });
const M_or = new THREE.MeshStandardMaterial({ color: 0xff6900, metalness: 0.2, roughness: 0.45 });
const M_blue = new THREE.MeshStandardMaterial({ color: 0x2a6fd6, metalness: 0.2, roughness: 0.45 });
const shadowAll = (o, v) => o.traverse(m => { if (m.isMesh && !m.material.transparent) { m.castShadow = v; m.receiveShadow = v; } });

/* ---------------- MILL rig ---------------- */
const TW = 400, TH = 280;
const mill = new THREE.Group(); scene.add(mill);
const depthData = new Uint8Array(TW * TH * 4);
const depthTex = new THREE.DataTexture(depthData, TW, TH, THREE.RGBAFormat); depthTex.magFilter = THREE.LinearFilter; depthTex.minFilter = THREE.LinearFilter;
const toolU = { pos: new THREE.Vector3(), r: 4 };
const HEATRAMP = `vec3 ramp(float x){ x=clamp(x,0.,1.); vec3 a=vec3(.05,.85,.45), b=vec3(1.,.85,.1), c=vec3(1.,.42,0.), d=vec3(1.,.1,.12);
  return x<.3? mix(a,b,x/.3) : x<.6? mix(b,c,(x-.3)/.3) : mix(c,d,(x-.6)/.4); }`;
const topMat = new THREE.ShaderMaterial({
  uniforms: { dmap: { value: depthTex }, tx: { value: new THREE.Vector2(1 / TW, 1 / TH) }, L: { value: LDIR }, camPos: { value: new THREE.Vector3() },
    toolPos: { value: toolU.pos }, toolR: { value: 4 }, heat: { value: 0 }, heatMix: { value: 0 }, showTool: { value: 1 }, ringI: { value: 1 }, wet: { value: 0 } },
  vertexShader: `uniform sampler2D dmap; varying vec2 vUv; varying vec3 vW;
    void main(){ vUv=uv; float d=texture2D(dmap,uv).r*6.375; vec3 p=position; p.y-=d; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform sampler2D dmap; uniform vec2 tx; uniform vec3 L; uniform vec3 camPos; uniform vec3 toolPos; uniform float toolR; uniform float heat; uniform float heatMix; uniform float showTool; uniform float ringI; uniform float wet;
    varying vec2 vUv; varying vec3 vW;
    float D(vec2 u){ return texture2D(dmap,u).r*6.375; }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float capsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.); return length(pa-ba*h)-r; }
    ${HEATRAMP}
    void main(){
      vec4 t=texture2D(dmap,vUv); float d=t.r*6.375;
      float dl=D(vUv-vec2(tx.x,0.)), dr=D(vUv+vec2(tx.x,0.)), dd=D(vUv-vec2(0.,tx.y)), du=D(vUv+vec2(0.,tx.y));
      vec3 n=normalize(vec3((dr-dl)/(2.*tx.x*100.),1.,-(du-dd)/(2.*tx.y*70.)));
      float cut=smoothstep(0.02,0.12,d), rough=t.g;
      float j=(hash(floor(vW.xz*10.))-.5)*(0.05+rough*0.9)*cut;
      n=normalize(n+vec3(j,0.,j*.8));
      float brush=hash(vec2(floor(vW.z*9.),3.))*0.05+hash(floor(vW.xz*vec2(.4,24.)))*0.03;
      float marks=0.03*sin(length(fract(vW.xz*0.25)-.5)*60.)*cut*(1.-rough);
      vec3 base=mix(vec3(.5,.52,.55)+brush, vec3(.88,.9,.93)+marks, cut);
      base=mix(base, vec3(.62,.24,.18), t.b*.75);
      vec3 V=normalize(camPos-vW), H=normalize(L+V);
      float diff=max(dot(n,L),0.);
      float spec=pow(max(dot(n,H),0.), mix(28.,160.,cut)*(1.-rough*.75))*mix(.25,1.1,cut);
      vec3 R=reflect(-V,n);
      vec3 env=mix(vec3(.02),vec3(.95),smoothstep(.72,.96,R.y))+vec3(1.,.41,0.)*smoothstep(.22,0.,abs(R.y-.12))*.55;
      float fres=pow(1.-max(dot(n,V),0.),4.);
      float avg=(D(vUv+vec2(tx.x*8.,0.))+D(vUv-vec2(tx.x*8.,0.))+D(vUv+vec2(0.,tx.y*8.))+D(vUv-vec2(0.,tx.y*8.)))*.25;
      float ao=clamp(1.-max(d-avg,0.)*.5,.3,1.); float wall=length(vec2(dr-dl,du-dd)); ao*=1.-clamp(wall*.35,0.,.45);
      float hy=vW.y, sh=1.;
      if(showTool>.5){
        vec2 a0=toolPos.xz-L.xz*(toolPos.y-hy)/L.y, a1=toolPos.xz-L.xz*(toolPos.y+34.-hy)/L.y;
        vec2 b0=toolPos.xz-L.xz*(toolPos.y+36.-hy)/L.y, b1=toolPos.xz-L.xz*(toolPos.y+82.-hy)/L.y;
        sh=1.-.55*(1.-smoothstep(-1.5,3.5,capsule(vW.xz,a0,a1,toolR)));
        sh*=1.-.45*(1.-smoothstep(-4.,14.,capsule(vW.xz,b0,b1,22.)));
      }
      float glow=heat*exp(-length(vW.xz-toolPos.xz)/(toolR*1.6))*cut;
      base*=1.-.22*wet; spec*=1.+wet*.7; fres=mix(fres,min(1.,fres*1.6+.03),wet);
      vec3 Lp=toolPos+vec3(0.,58.,0.), ld=Lp-vW; float dist=length(ld); ld/=dist;
      float rl=max(dot(n,ld),0.)*ringI*exp(-dist/60.)*.42; float rs=pow(max(dot(n,normalize(ld+V)),0.),120.)*ringI*exp(-dist/60.)*.55*cut;
      vec3 col=base*(.16+diff*.9+rl*vec3(1.,.97,.92))*ao*sh+vec3(spec)*sh+vec3(rs)+env*(.1+fres*.55)*ao+vec3(1.,.35,.02)*glow*.9;
      if(heatMix>0. && t.a>0.){ vec3 rc=ramp((t.a*255.-1.)/254.); col=mix(col, rc*(.35+diff*.9)+spec*.4, heatMix*cut*.9); }
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
{
  const top = new THREE.PlaneGeometry(100, 70, 200, 140); top.rotateX(-Math.PI / 2);
  mill.add(new THREE.Mesh(top, topMat));
  const side = new THREE.Mesh(new THREE.BoxGeometry(100, 29.9, 70), M_alu); side.position.y = -15; mill.add(side);
  const jawG = new THREE.BoxGeometry(24, 36, 96);
  for (const sd of [-1, 1]) {
    const jaw = new THREE.Mesh(jawG, M_dark); jaw.position.set(sd * 62, -24, 0); mill.add(jaw);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2, 22, 90), M_steel); plate.position.set(sd * 51, -16, 0); mill.add(plate);
  }
  const vbase = new THREE.Mesh(new THREE.BoxGeometry(190, 16, 110), M_dark); vbase.position.y = -50; mill.add(vbase);
  const table = new THREE.Mesh(new THREE.BoxGeometry(900, 60, 420), M_table); table.position.y = -88; mill.add(table);
  for (let k = -2; k <= 2; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(900, 4, 18), M_dark); s.position.set(0, -57.9, k * 90); mill.add(s); }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1100, 80, 700), M_dark); bed.position.y = -160; mill.add(bed);
  shadowAll(mill, true);
}
const spindle = new THREE.Group(); mill.add(spindle);
const fluteTex = canvasTex(64, 256, (g, w) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 256);
  for (let k = -4; k < 8; k++) { g.save(); g.translate(0, k * 40); g.transform(1, 0, -0.55, 1, 0, 0); g.fillStyle = '#2a2d31'; g.fillRect(-60, 0, 200, 13); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-60, 13, 200, 3); g.restore(); }
}, true, true);
const M_cutter = new THREE.MeshStandardMaterial({ map: fluteTex, color: 0xb9bec5, metalness: 0.85, roughness: 0.25, emissive: 0xff4a00, emissiveIntensity: 0 });
const cutterMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 34, 28), M_cutter); cutterMesh.position.y = 17; spindle.add(cutterMesh);
{
  const add = (g, m, y) => { const o = new THREE.Mesh(g, m); o.position.y = y; spindle.add(o); return o; };
  add(new THREE.CylinderGeometry(13, 13, 11, 6), M_steel, 40);
  add(new THREE.CylinderGeometry(21, 13, 26, 36), M_steel, 58.5);
  add(new THREE.CylinderGeometry(31, 31, 10, 40), M_dark, 76);
  add(new THREE.TorusGeometry(31, 1.6, 6, 40), M_or, 76).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(44, 44, 34, 40), M_holo, 98);
  const head = add(new THREE.BoxGeometry(140, 110, 140), M_holo, 200);
  const edgeM = new THREE.LineBasicMaterial({ color: new THREE.Color(1, 0.42, 0.05).multiplyScalar(1.6), transparent: true, opacity: 0.4, toneMapped: false });
  const e1 = new THREE.LineSegments(new THREE.EdgesGeometry(head.geometry), edgeM); e1.position.y = 200; spindle.add(e1);
  const e2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(44, 44, 34, 20), 30), edgeM); e2.position.y = 98; spindle.add(e2);
  // LED ring light around the spindle nose
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(27, 2.2, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.92).multiplyScalar(1.5), toneMapped: false }));
  ringL.rotation.x = Math.PI / 2; ringL.position.y = 70; spindle.add(ringL); spindle.userData.ring = ringL;
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(120, 14), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.45 })); lg.position.set(0, 190, 71); spindle.add(lg);
  for (const sd of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sd * 48, 92, -36), new THREE.Vector3(sd * 56, 60, -42), new THREE.Vector3(sd * 34, 28, -28), new THREE.Vector3(sd * 13, 12, -11)]);
    for (let k = 0; k < 16; k++) {
      const p = c.getPointAt(k / 16), q = c.getPointAt((k + 1) / 16);
      const s = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), k % 2 ? M_or : M_blue); s.position.copy(p); s.scale.set(1, 1.15, 1); s.lookAt(q); spindle.add(s);
    }
    const tip = c.getPointAt(1), dir = tip.clone().sub(c.getPointAt(0.94)).normalize();
    const nz = new THREE.Mesh(new THREE.ConeGeometry(2.2, 7, 10), M_or); nz.position.copy(tip); nz.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); spindle.add(nz);
    spindle.userData['noz' + sd] = tip;
  }
  shadowAll(spindle, true);
}
// CMM probe used in the inspection cinematic
const probe = new THREE.Group();
{
  const ruby = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd0102a, metalness: 0.1, roughness: 0.05, emissive: 0x500008 }));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 12), M_steel); stem.position.y = 15;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 40, 24), M_dark); body.position.y = 50;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 4, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x05df72).multiplyScalar(2), toneMapped: false })); band.position.y = 36;
  probe.add(ruby, stem, body, band); probe.userData.band = band; probe.visible = false; scene.add(probe);
}

function ribbon(maxN) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxN * 6), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxN * 6), 3));
  const idx = []; for (let i = 0; i < maxN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.renderOrder = 5; m.frustumCulled = false; return m;
}
const MAXN = 4000;
const guide = ribbon(MAXN); scene.add(guide);
const pacer = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(2), transparent: true, opacity: 0.85, toneMapped: false, depthTest: false }));
pacer.renderOrder = 6; scene.add(pacer);
const cursor = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthTest: false, side: THREE.DoubleSide }));
cursor.renderOrder = 7; scene.add(cursor);
const startRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(2.5), transparent: true, depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
startRing.renderOrder = 7; scene.add(startRing);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3, 160, 16, 1, true), new THREE.MeshBasicMaterial({ map: canvasTex(4, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,105,0,0)'); gr.addColorStop(1, 'rgba(255,105,0,.9)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
beam.renderOrder = 4; scene.add(beam); // start-point locator beam

function stamp(x0, z0, x1, z1, R, depth, chat, bad, dev) {
  const cx = (x) => ((x + 50) / 100) * TW, rz = (z) => ((35 - z) / 70) * TH, rr = R * 4;
  const ax = cx(x0), az = rz(z0), bx = cx(x1), bz = rz(z1);
  const minx = Math.max(0, Math.floor(Math.min(ax, bx) - rr - 1)), maxx = Math.min(TW - 1, Math.ceil(Math.max(ax, bx) + rr + 1));
  const minz = Math.max(0, Math.floor(Math.min(az, bz) - rr - 1)), maxz = Math.min(TH - 1, Math.ceil(Math.max(az, bz) + rr + 1));
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6, dv = Math.min(255, depth * 40), cv = chat * 255, dva = 1 + Math.round(clamp(dev / 1.0, 0, 1) * 254);
  let n = 0;
  for (let j = minz; j <= maxz; j++) for (let i = minx; i <= maxx; i++) {
    const px = i + 0.5 - ax, pz = j + 0.5 - az, h = clamp((px * dx + pz * dz) / L2, 0, 1);
    const ex = px - dx * h, ez = pz - dz * h;
    if (ex * ex + ez * ez > rr * rr) continue;
    const k = (j * TW + i) * 4;
    if (depthData[k] < dv) { depthData[k] = dv; n++; depthData[k + 1] = Math.max(cv * (0.6 + Math.random() * 0.4), depthData[k + 1] * 0.5); if (bad) depthData[k + 2] = 255; depthData[k + 3] = dva; }
  }
  if (n) depthTex.needsUpdate = true;
  return n;
}

/* ---------------- LATHE rig (3605M) ---------------- */
const LW = 1200, R0 = 20;
const lathe = new THREE.Group(); scene.add(lathe);
const radData = new Uint8Array(LW * 4);
const radTex = new THREE.DataTexture(radData, LW, 1, THREE.RGBAFormat); radTex.magFilter = THREE.LinearFilter; radTex.minFilter = THREE.LinearFilter;
const stockMat = new THREE.ShaderMaterial({
  uniforms: { rmap: { value: radTex }, tx: { value: 1 / LW }, L: { value: LDIR }, camPos: { value: new THREE.Vector3() }, R0: { value: R0 }, heatMix: { value: 0 } },
  vertexShader: `uniform sampler2D rmap; uniform float tx; varying vec3 vW; varying vec3 vN; varying float vU; varying float vR; varying float vA;
    void main(){
      float u=(position.y+60.)/120.; vU=u;
      float r=texture2D(rmap,vec2(u,.5)).r*25.5; vR=r;
      float rp=texture2D(rmap,vec2(u+tx*2.,.5)).r*25.5, rm=texture2D(rmap,vec2(u-tx*2.,.5)).r*25.5;
      vec3 p=position; vec3 nrm=normal; vA=atan(position.z,position.x);
      if(abs(normal.y)<.5){ p.xz*=r; vec2 rad=normalize(position.xz+1e-5); float slope=(rp-rm)/(tx*4.*120.); nrm=normalize(vec3(rad.x,-slope,rad.y)); }
      else { p.xz*=r; }
      vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*nrm);
      gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform sampler2D rmap; uniform vec3 L; uniform vec3 camPos; uniform float R0; uniform float heatMix; varying vec3 vW; varying vec3 vN; varying float vU; varying float vR; varying float vA;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    ${HEATRAMP}
    void main(){
      vec4 t=texture2D(rmap,vec2(vU,.5));
      float raw=step(R0-.15,vR);
      vec3 n=normalize(vN);
      float rings=sin(vU*2400.)*.5+.5;
      float chat=t.b;
      vec3 turned=vec3(.5,.52,.55)+rings*.05-chat*rings*.25;
      float blot=hash(floor(vec2(vA*6.,vU*30.)));
      vec3 scale=vec3(.17,.17,.19)+blot*.07;
      vec3 base=mix(turned,scale,raw); base=mix(base,vec3(.6,.22,.16),t.g*.8);
      vec3 V=normalize(camPos-vW), H=normalize(L+V);
      float diff=max(dot(n,L),0.), spec=pow(max(dot(n,H),0.),mix(70.,18.,raw))*mix(.55,.1,raw);
      vec3 R=reflect(-V,n);
      vec3 env=mix(vec3(.02),vec3(.95),smoothstep(.7,.96,R.y))+vec3(1.,.41,0.)*smoothstep(.25,0.,abs(R.y-.1))*.6;
      float fres=pow(1.-max(dot(n,V),0.),4.);
      vec3 col=base*(.15+diff*.9)+vec3(spec)+env*(.08+fres*.5)*(1.-raw*.7);
      if(heatMix>0. && t.a>0. && raw<.5){ col=mix(col, ramp((t.a*255.-1.)/254.)*(.35+diff*.9)+spec*.4, heatMix*.9); }
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const stockSpin = new THREE.Group(), chuckSpin = new THREE.Group(), turret = new THREE.Group();
{
  const axis = new THREE.Group(); axis.rotation.z = -Math.PI / 2; lathe.add(axis);
  axis.add(stockSpin);
  stockSpin.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 120, 96, 600, false), stockMat));
  axis.add(chuckSpin); chuckSpin.position.y = -84;
  chuckSpin.add(new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 46, 48), M_dark));
  const face = new THREE.Mesh(new THREE.CylinderGeometry(52, 58, 4, 48), M_steel); face.position.y = 24; chuckSpin.add(face);
  for (let k = 0; k < 3; k++) { const j = new THREE.Mesh(new THREE.BoxGeometry(14, 22, 30), M_steel); const a = (k / 3) * Math.PI * 2; j.position.set(Math.cos(a) * 32, 34, Math.sin(a) * 32); j.rotation.y = -a; chuckSpin.add(j); }
  const head = new THREE.Mesh(new THREE.BoxGeometry(240, 260, 260), M_dark); head.position.set(-230, 0, -20); lathe.add(head);
  const lgl = new THREE.Mesh(new THREE.PlaneGeometry(150, 18), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })); lgl.position.set(-230, 70, 111); lathe.add(lgl);
  const bedL = new THREE.Mesh(new THREE.BoxGeometry(700, 40, 220), M_table); bedL.position.set(40, -140, -80); bedL.rotation.x = 0.5; lathe.add(bedL);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 34, 12), M_dark); disc.rotation.z = Math.PI / 2; disc.position.set(0, 84, -40); turret.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(46, 1.8, 6, 12), M_or); ring.rotation.y = Math.PI / 2; ring.position.set(18, 84, -40); turret.add(ring);
  const holder = new THREE.Mesh(new THREE.BoxGeometry(20, 52, 20), M_dark); holder.position.set(0, 38, -14); turret.add(holder);
  const shank = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), M_dark); shank.position.set(0, 9, -4); turret.add(shank);
  const insert = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 0.8, roughness: 0.3 }));
  insert.rotation.x = Math.PI / 2; insert.rotation.y = Math.PI / 4; insert.scale.set(1, 1, 0.7); insert.position.set(0, 3.4, 0); turret.add(insert);
  turret.userData.insert = insert;
  const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(12, 70, -10), new THREE.Vector3(18, 40, 8), new THREE.Vector3(10, 14, 10)]);
  for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), k % 2 ? M_or : M_blue); s.position.copy(hose.getPointAt(k / 10)); turret.add(s); }
  turret.userData.noz = hose.getPointAt(1);
  lathe.add(turret);
  shadowAll(lathe, true);
}

/* ---------------- SHOWROOM (menus): procedural NANYA machines ---------------- */
const showroom = new THREE.Group(); scene.add(showroom);
const SR = { models: {}, cur: 'nv855', ring: null, dust: null, t: 0 };
{
  const floorM = new THREE.MeshStandardMaterial({ color: 0x070707, metalness: 0.85, roughness: 0.32, envMapIntensity: 0.9 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16000, 64), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; showroom.add(floor);
  const mirror = new Reflector(new THREE.CircleGeometry(16000, 64), { textureWidth: 1024, textureHeight: 1024, color: 0x161616, clipBias: 0.003 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = 1; mirror.visible = false; showroom.add(mirror); SR.mirror = mirror;
  const grid = new THREE.GridHelper(24000, 80, 0xff6900, 0x3a1a00); grid.material.transparent = true; grid.material.opacity = 0.18; grid.position.y = 2; showroom.add(grid);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2300, 2400, 80, 96), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, metalness: 0.7, roughness: 0.35 })); plat.position.y = 40; plat.receiveShadow = true; showroom.add(plat);
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(3), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2350, 14, 8, 160), led); ring.rotation.x = Math.PI / 2; ring.position.y = 82; showroom.add(ring); SR.ring = ring;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2200, 5, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(1.4), toneMapped: false })); ring2.rotation.x = Math.PI / 2; ring2.position.y = 82; showroom.add(ring2);
  for (const [r, w, o] of [[5200, 40, 3], [5600, 14, 1.4], [6100, 6, 0.8]]) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r, w, 8, 160, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(o), toneMapped: false }));
    a.position.set(0, 0, -6500); showroom.add(a);
  }
  for (const x of [-7000, -4800, 4800, 7000]) { const b = new THREE.Mesh(new THREE.BoxGeometry(60, 9000, 60), led); b.position.set(x, 4500, -6000); showroom.add(b); }
  // light cones from the rig above
  const coneTex = canvasTex(4, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,190,120,.22)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
  for (const x of [-1800, 0, 1800]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(120, 1600, 6500, 32, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    c.position.set(x, 3250, -300); c.rotation.z = x * -0.00006; showroom.add(c);
  }
  // dust
  const dg = new THREE.BufferGeometry(), dp = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i++) { dp[i * 3] = (Math.random() - 0.5) * 9000; dp[i * 3 + 1] = Math.random() * 5000; dp[i * 3 + 2] = (Math.random() - 0.5) * 9000; }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  SR.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 14, map: glowTex, color: 0xffb070, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  showroom.add(SR.dust);
  const spot = new THREE.SpotLight(0xffffff, 6, 0, 0.5, 0.6, 0); spot.position.set(-2500, 7000, 4500); spot.target.position.set(0, 1000, 0); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004;
  spot.shadow.camera.near = 2000; spot.shadow.camera.far = 16000; showroom.add(spot, spot.target); SR.spot = spot;
  const back = new THREE.PointLight(0xff6900, 3, 0, 0); back.position.set(0, 2500, -3500); showroom.add(back);
}
function panelTex(label, badgeBlue) {
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#0e0f10'; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.moveTo(0, h * 0.55); g.lineTo(w, h * 0.18); g.lineTo(w, h * 0.5); g.lineTo(0, h * 0.9); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#9aa1a9'); gr.addColorStop(1, '#5c626a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore();
    g.strokeStyle = '#ff6900'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, h * 0.55); g.lineTo(w, h * 0.18); g.stroke();
    if (logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, 60, 90, 390, (390 * logoImg.naturalHeight) / logoImg.naturalWidth);
    if (badgeBlue) { g.fillStyle = '#1d3d8f'; g.fillRect(60, 170, 220, 70); g.fillStyle = '#9ac2ff'; g.font = '700 44px sans-serif'; g.fillText(label, 76, 222); }
  });
}
const apronTex = (label) => canvasTex(1024, 400, (g, w, h) => {
  g.fillStyle = '#b8bdc3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(0, Math.random() * h, w, 1); }
  g.fillStyle = '#2a2d31'; g.font = '600 46px sans-serif'; g.textAlign = 'right'; g.fillText(label, w - 70, 90);
  g.textAlign = 'center'; g.font = '500 34px sans-serif'; g.fillText('www.nye-cnc.com', w / 2, h - 50);
});
const screenTex = canvasTex(512, 384, (g, w, h) => {
  g.fillStyle = '#06142c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff6900'; g.fillRect(0, 0, w, 34);
  g.fillStyle = '#000'; g.font = '700 22px monospace'; g.fillText('NANYA  CNC  ·  AUTO', 14, 24);
  g.fillStyle = '#7fb0ff'; g.font = '18px monospace';
  ['X  -12.500', 'Y   48.200', 'Z  -2.000', 'S  12000', 'F  2125'].forEach((t, k) => g.fillText(t, 20, 74 + k * 32));
  g.strokeStyle = '#05df72'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < 230; x++) g.lineTo(260 + x, 200 - Math.sin(x / 18) * 50 - x * 0.2); g.stroke();
  g.strokeStyle = '#1f3e7a'; g.strokeRect(255, 60, 240, 300);
});
function buildMachineModel(kind) {
  const grp = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.45, roughness: 0.42 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1018, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.45, envMapIntensity: 1.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d4d9, metalness: 1, roughness: 0.15 });
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6900).multiplyScalar(2.6), toneMapped: false });
  const box = (w, h, d, m, x, y, z, par = grp) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const lathe = kind === 'm3605', small = kind === 'x8';
  const W = lathe ? 3600 : small ? 2300 : 2700, H = lathe ? 2050 : small ? 2400 : 2600, D = lathe ? 1900 : small ? 2200 : 2400;
  box(W * 0.92, 220, D * 0.85, black, 0, 110, 0);
  const bodyW = W * 0.78, bodyH = H - 520, bx = -W * 0.06;
  box(bodyW, bodyH, D * 0.8, black, bx, 220 + bodyH / 2, -D * 0.02);
  // left panel with slanted silver band + logo
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.2, bodyH), new THREE.MeshStandardMaterial({ map: panelTex(small ? 'nano X8' : '', small), metalness: 0.5, roughness: 0.4 }));
  lp.position.set(bx - bodyW / 2 + W * 0.1, 220 + bodyH / 2, D * 0.381); grp.add(lp);
  // doors + windows
  const doorW = bodyW * 0.62, doorH = bodyH * (lathe ? 0.52 : 0.6), dy = 220 + bodyH * (lathe ? 0.56 : 0.62), dx = bx + W * 0.06;
  for (const sd of [-1, 1]) {
    const door = box(doorW / 2 - 10, doorH, 30, black, dx + sd * doorW / 4, dy, D * 0.4);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(doorW / 2 - 140, doorH - 260), glass); win.position.set(dx + sd * doorW / 4, dy + 40, D * 0.4 + 16); grp.add(win);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, doorH * 0.55, 12), chrome); handle.position.set(dx - sd * 40, dy, D * 0.4 + 70); grp.add(handle);
    if (lathe) win.rotation.x = -0.25;
  }
  // window X-brace like the NV-855 photo
  if (!lathe) for (const s of [1, -1]) { const x = box(doorW * 0.8, 30, 10, new THREE.MeshStandardMaterial({ color: 0x2b2e33, metalness: 0.6, roughness: 0.4 }), dx, dy + 40, D * 0.4 + 24); x.rotation.z = s * 0.62; }
  // interior: glowing work light + spindle silhouette
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 120, doorH - 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd7a8).multiplyScalar(0.55) })); inner.position.set(dx, dy + 20, D * 0.25); grp.add(inner);
  if (!lathe) { const sp = box(220, doorH * 0.5, 220, black, dx, dy + doorH * 0.12, D * 0.3); sp.material = new THREE.MeshStandardMaterial({ color: 0x08090a }); }
  else { const bar = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, doorW * 0.7, 24), chrome); bar.rotation.z = Math.PI / 2; bar.position.set(dx, dy - 40, D * 0.3); grp.add(bar); }
  // stainless apron
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(doorW, bodyH * 0.22), new THREE.MeshStandardMaterial({ map: apronTex(lathe ? '3605M' : small ? 'NANO-X8' : 'NV-855'), metalness: 0.8, roughness: 0.3 }));
  ap.position.set(dx, 220 + bodyH * 0.16, D * 0.381); grp.add(ap);
  // head / top housing + NYE badge
  if (!lathe) {
    box(bodyW * 0.42, 520, D * 0.42, black, dx, 220 + bodyH + 260, -D * 0.12);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), new THREE.MeshBasicMaterial({ map: canvasTex(256, 170, (g, w, h) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0a63c'; g.font = '800 110px Georgia, serif'; g.textAlign = 'center'; g.fillText('NYE', w / 2, 125); }), toneMapped: false }));
    badge.position.set(dx, 220 + bodyH + 300, D * 0.09 + 2); grp.add(badge);
  } else box(W * 0.5, 280, D * 0.5, black, dx + W * 0.1, 220 + bodyH + 140, -D * 0.15);
  // control pendant
  const cpx = bx + bodyW / 2 + 260;
  box(120, 220, 120, black, cpx - 130, 220 + bodyH * 0.72, D * 0.25);
  const cp = box(520, 760, 140, black, cpx, 220 + bodyH * 0.62, D * 0.36);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(380, 280), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); scr.position.set(cpx, 220 + bodyH * 0.62 + 200, D * 0.36 + 72); grp.add(scr);
  const kp = new THREE.Mesh(new THREE.PlaneGeometry(420, 300), new THREE.MeshStandardMaterial({ map: canvasTex(256, 180, (g, w, h) => { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) { g.fillStyle = ['#2c2f35', '#3a3e46', '#ff6900', '#2c2f35'][(r * 9 + c) % 7 === 0 ? 2 : (r + c) % 2]; g.fillRect(10 + c * 27, 12 + r * 32, 22, 24); } }), roughness: 0.6 }));
  kp.position.set(cpx, 220 + bodyH * 0.62 - 170, D * 0.36 + 72); grp.add(kp);
  const es = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 40, 20), new THREE.MeshStandardMaterial({ color: 0xd01818, roughness: 0.3 })); es.rotation.x = Math.PI / 2; es.position.set(cpx + 180, 220 + bodyH * 0.62 - 320, D * 0.36 + 80); grp.add(es);
  // stack light
  const stx = bx + bodyW / 2 - 120, sty = 220 + bodyH;
  box(30, 300, 30, chrome, stx, sty + 150, -D * 0.1);
  const lights = [[0xff2020, 0.2], [0xffb000, 0.2], [0x05df72, 3]];
  lights.forEach(([c, i], k) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 110, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false })); l.position.set(stx, sty + 360 + k * 115, -D * 0.1); grp.add(l); });
  // orange edge accents
  const eh = (w, x, y, z) => box(w, 14, 14, edge, x, y, z);
  eh(bodyW, bx, 220, D * 0.39); eh(bodyW, bx, 220 + bodyH, D * 0.39);
  const ev = box(14, bodyH, 14, edge, bx + bodyW / 2, 220 + bodyH / 2, D * 0.39); void ev;
  // chip cart
  if (!lathe) { const cart = box(420, 380, 520, black, bx - bodyW / 2 - 300, 330, D * 0.15); void cart; }
  return grp;
}
function setShowroomMachine(id) {
  for (const k of Object.keys(SR.models)) SR.models[k].visible = k === id;
  if (!SR.models[id]) { const m = buildMachineModel(id); m.position.y = 80; showroom.add(m); SR.models[id] = m; }
  SR.models[id].visible = true; SR.cur = id;
}

/* ---------------- particles ---------------- */
class Pool {
  constructor(geo, mat, n, colorable) {
    this.n = n; this.mesh = new THREE.InstancedMesh(geo, mat, n); this.mesh.frustumCulled = false;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.r = new Float32Array(n * 3); this.life = new Float32Array(n); this.s = new Float32Array(n); this.i = 0;
    if (colorable) this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.sc = new THREE.Vector3(); this.pos = new THREE.Vector3();
    for (let k = 0; k < n; k++) { this.m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(k, this.m4); }
    scene.add(this.mesh);
  }
  emit(x, y, z, vx, vy, vz, life, size, color) {
    const k = this.i = (this.i + 1) % this.n, j = k * 3;
    this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z; this.v[j] = vx; this.v[j + 1] = vy; this.v[j + 2] = vz;
    this.r[j] = Math.random() * 6; this.r[j + 1] = Math.random() * 6; this.r[j + 2] = Math.random() * 6; this.life[k] = life; this.s[k] = size;
    if (color && this.mesh.instanceColor) { this.mesh.instanceColor.setXYZ(k, color.r, color.g, color.b); this.mesh.instanceColor.needsUpdate = true; }
  }
  update(dt, floorFn, spin = 8, g = -2600) {
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) continue;
      const j = k * 3; this.life[k] -= dt;
      this.v[j + 1] += g * dt;
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      const fl = floorFn(this.p[j], this.p[j + 2]);
      if (this.p[j + 1] < fl) { this.p[j + 1] = fl; this.v[j + 1] *= -0.25; this.v[j] *= 0.5; this.v[j + 2] *= 0.5; if (spin < 0) this.life[k] = 0; }
      const air = this.p[j + 1] > fl + 0.5 ? 1 : 0.1;
      this.r[j] += spin * dt * air; this.r[j + 1] += spin * 0.7 * dt * air;
      const s = this.life[k] > 0 ? this.s[k] * Math.min(1, this.life[k] * 2) : 0;
      this.e.set(this.r[j], this.r[j + 1], this.r[j + 2]); this.q.setFromEuler(this.e); this.sc.set(s, s, s); this.pos.set(this.p[j], this.p[j + 1], this.p[j + 2]);
      this.m4.compose(this.pos, this.q, this.sc); this.mesh.setMatrixAt(k, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.life.fill(0); for (let k = 0; k < this.n; k++) { this.m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(k, this.m4); } this.mesh.instanceMatrix.needsUpdate = true; }
}
const chips = new Pool(new THREE.TorusGeometry(1.5, 0.35, 5, 10, Math.PI * 1.35), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.25 }), 420, true);
const drops = new Pool(new THREE.SphereGeometry(0.7, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.55 }), 360, false);
const sparks = new Pool(new THREE.BoxGeometry(0.25, 0.25, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 0.2).multiplyScalar(4), toneMapped: false }), 200, false);

const mist = new Pool(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.75, 0.88, 1), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }), 160, false);

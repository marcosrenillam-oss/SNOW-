import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { buildWorld, poseRider, BOARD } from './world.js';
import { TRICKS, TIPS } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* ---------------- Almacenamiento seguro ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('snowprofe:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('snowprofe:' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

/* ---------------- Entorno: iPhone / Android / app instalada ---------------- */
const html = document.documentElement;
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(ua);
const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
html.classList.toggle('is-ios', isIOS);
html.classList.toggle('is-android', isAndroid);
html.classList.toggle('standalone', standalone);
if (standalone) {
  // En la app de pantalla de inicio: sin zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = matchMedia('(max-width: 820px), (orientation: portrait) and (max-width: 1024px)');

/* ---------------- Estado ---------------- */
const S = {
  stance: store.get('stance', 'regular'),
  dir: 1,
  angF: 15, angB: -6,
  angFs: 15, angBs: -6,
  edge: 'back',
  edgeYaw: 0,
  crouch: 0.55,
  trick: 'ollie', trickClock: 0, trickYawBase: 0, trickYawS: 0,
  pL: 0, pR: 0,
  sim: { x: 0, v: 0, yaw: 0, roll: 0, pitch: 0, phi: 0, speed: 0 },
  look: 0,
};
S.dir = S.stance === 'goofy' ? -1 : 1;

/* ---------------- Render ---------------- */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 64px Unbounded'), document.fonts.load('700 64px Unbounded')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fuentes no disponibles: se usa la de reserva */ }
}

await fontsReady();
const W = buildWorld(renderer);
const pmrem = new THREE.PMREMGenerator(renderer);
W.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const bF = () => (S.dir > 0 ? W.bindL : W.bindR); // fijación delantera
const P = W.rider.userData.P;

/* ---------------- Secciones ---------------- */
const sections = $$('.step').map((el, i) => ({ el, id: el.id, i, title: el.dataset.title, desc: el.dataset.desc, top: 0, h: 1 }));
const byId = Object.fromEntries(sections.map((s) => [s.id, s]));

function measure() {
  const y = scrollY;
  for (const s of sections) {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + y; s.h = r.height;
  }
}

/* ---------------- Poses de cámara / tabla por paso ---------------- */
const DEF = {
  cam: [0, 0.3, 3.4], look: [0, 0, 0], pos: [0, 0, 0], rot: [0, 0, 0],
  explode: 0, boots: 0, rider: 0, slope: 0, sim: 0, arrow: 0, edges: 0, glow: 0,
  crouch: 0.5, trick: 0, mk: 1, spinFlakes: 0,
};
const pose = (o) => ({ ...DEF, ...o });
const GROUND = 0.012;

const POSES = {
  inicio: (p, t) => pose({
    cam: [0, 0.12, 3.5], look: [0, 0.02, 0],
    pos: [0, Math.sin(t * 1.1) * 0.05, 0],
    rot: [0.28, 0.8 + Math.sin(t * 0.45) * 0.45, 1.02 + Math.sin(t * 0.7) * 0.05],
    mk: 1,
  }),
  tabla: (p, t) => {
    const flip = smooth(0.4, 0.66, p) * Math.PI;
    return pose({
      cam: [0, 1.75, 2.55], look: [0, -0.02, 0],
      rot: [flip, -0.32 + (p - 0.5) * 0.5, 0], pos: [0, Math.sin(t) * 0.02, 0],
      edges: 0.9, mk: 1.15,
    });
  },
  fijaciones: (p, t) => {
    const x = S.dir * BOARD.stance;
    return pose({
      cam: [x + 0.62, 0.55, 0.78], look: [x * 0.9, 0.09, 0],
      rot: [0, -0.15 + (p - 0.5) * 0.7, 0],
      explode: smooth(0.15, 0.4, p) * (1 - smooth(0.85, 1, p)) * 0.8 + 0.1, mk: 0.55,
    });
  },
  stance: () => pose({
    cam: [0, 3.3, -1.3], look: [0.0, 0, 0.06],
    boots: 1, arrow: 1, mk: 1.25,
  }),
  postura: () => pose({
    cam: [3.3, 1.35, 2.2], look: [0, 0.72, 0],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, crouch: S.crouch, glow: 0.45, mk: 1.4,
  }),
  pedales: () => pose({
    cam: [S.sim.x * 0.5, 2.3, -3.7], look: [S.sim.x * 0.5, 0.55, 0.8],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 1, mk: 1.3,
  }),
  cantos: () => pose({
    cam: [3.4, 1.15, -1.7], look: [0, 0.6, 0],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, edges: 1, mk: 1.4,
  }),
  hoja: () => pose({
    cam: [S.sim.x * 0.55, 2.9, -4.6], look: [S.sim.x * 0.55, 0.35, 1.3],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 1, mk: 0.9,
  }),
  giro: () => pose({
    cam: [S.sim.x * 0.45, 3.7, -5.0], look: [S.sim.x * 0.45, 0.2, 1.7],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, edges: 0.7, mk: 0.7,
  }),
  trucos: () => pose({
    cam: [2.9, 1.45, -2.9], look: [0, 0.85, 0],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, trick: 1, mk: 1.5,
  }),
  juego: () => pose({
    cam: [S.sim.x * 0.5, 2.8, -4.6], look: [S.sim.x * 0.5, 0.3, 2.4],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 0.8, mk: 1.1,
  }),
  consejos: (p, t) => pose({
    cam: [0, 0.25, 3.6], look: [0, 0, 0],
    pos: [0, Math.sin(t) * 0.05, 0],
    rot: [0.5, t * 0.5, 0.55], mk: 1,
  }),
  final: (p, t) => pose({
    cam: [0, 0.1, 3.3], look: [0, 0, 0],
    pos: [0, Math.sin(t * 1.3) * 0.06, 0],
    rot: [0.2, t * 0.9, 1.05], mk: 1,
  }),
  game: () => pose({
    cam: [S.sim.x * 0.6, 3.3, -4.7], look: [S.sim.x * 0.6, 0.05, 1.7],
    pos: [0, GROUND, 0], boots: 1, rider: 1, slope: 1, sim: 1, glow: 1, mk: 1.1,
  }),
};
const SIM_MODE = { pedales: 'drill', cantos: 'hold', hoja: 'leaf', giro: 'turn', juego: 'leaf' };

function mixPose(a, b, f) {
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k];
    o[k] = Array.isArray(va) ? va.map((v, i) => lerp(v, vb[i], f)) : lerp(va, vb, f);
  }
  return o;
}

// Pose actual (suavizada)
let cur = null;
function dampPose(target, dt, rate = 5) {
  if (!cur) { cur = JSON.parse(JSON.stringify(target)); return; }
  for (const k in target) {
    if (Array.isArray(target[k])) for (let i = 0; i < 3; i++) cur[k][i] = damp(cur[k][i], target[k][i], rate, dt);
    else cur[k] = damp(cur[k], target[k], rate, dt);
  }
}

/* ---------------- Scroll ---------------- */
const SC = { a: 0, b: 0, f: 0, pa: 0, pb: 0, active: 0, focus: 0, progress: 0 };
function readScroll() {
  const vh = innerHeight, mid = scrollY + vh * 0.5;
  const centers = sections.map((s) => s.top + s.h / 2);
  let a = 0;
  while (a < sections.length - 1 && mid > centers[a + 1]) a++;
  const b = Math.min(a + 1, sections.length - 1);
  const raw = b === a ? 0 : clamp((mid - centers[a]) / (centers[b] - centers[a]), 0, 1);
  SC.a = a; SC.b = b;
  SC.f = smooth(0.28, 0.72, raw);
  const prog = (s) => clamp((mid - s.top) / s.h, 0, 1);
  SC.pa = prog(sections[a]); SC.pb = prog(sections[b]);
  let active = 0;
  for (let i = 0; i < sections.length; i++) if (mid >= sections[i].top) active = i;
  SC.active = active;
  SC.focus = SC.f < 0.2 ? a : SC.f > 0.8 ? b : -1;
  const max = document.documentElement.scrollHeight - vh;
  SC.progress = max > 0 ? scrollY / max : 0;
}

/* ---------------- Navegación ---------------- */
const dotsEl = $('#dots'), listEl = $('#drawer-list');
sections.forEach((s, i) => {
  const d = document.createElement('button');
  d.innerHTML = `<span>${s.title}</span>`;
  d.setAttribute('aria-label', s.title);
  d.addEventListener('click', () => goTo(s.id));
  dotsEl.appendChild(d);
  const li = document.createElement('li');
  li.innerHTML = `<button><span class="n">${String(i).padStart(2, '0')}</span><span><span class="t">${s.title}</span><span class="d">${s.desc}</span></span></button>`;
  li.firstChild.addEventListener('click', () => { closeMenu(); goTo(s.id); });
  listEl.appendChild(li);
});
const dotBtns = $$('button', dotsEl), listBtns = $$('button', listEl);

function goTo(id) {
  const s = byId[id];
  if (!s) return;
  const extra = s.h > innerHeight * 1.2 ? innerHeight * 0.05 : 0;
  window.scrollTo({ top: s.top + extra, behavior: reduceMotion ? 'auto' : 'smooth' });
}
$$('[data-goto]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); goTo(b.dataset.goto); }));

const menuBtn = $('#menu-btn');
function openMenu() { document.body.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); $('#drawer').setAttribute('aria-hidden', 'false'); }
function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); $('#drawer').setAttribute('aria-hidden', 'true'); }
menuBtn.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
$('#drawer-backdrop').addEventListener('click', closeMenu);
$('.drawer-close').addEventListener('click', closeMenu);
$$('[data-open-menu]').forEach((b) => b.addEventListener('click', openMenu));

let lastActive = -1;
function updateNav() {
  $('#progress-bar').style.transform = `scaleX(${SC.progress})`;
  if (SC.active === lastActive) return;
  lastActive = SC.active;
  $('#menu-count').textContent = `${String(SC.active).padStart(2, '0')}/${String(sections.length - 1).padStart(2, '0')}`;
  dotBtns.forEach((d, i) => d.classList.toggle('on', i === SC.active));
  listBtns.forEach((d, i) => { d.classList.toggle('on', i === SC.active); d.classList.toggle('done', i < SC.active); });
}

/* ---------------- Controles de cada paso ---------------- */
function segGroup(selector, attr, onPick) {
  $$(selector).forEach((btn) => btn.addEventListener('click', () => {
    const val = btn.dataset[attr];
    $$(selector).forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
    onPick(val, btn);
  }));
}

// Ángulos
const angFront = $('#ang-front'), angBack = $('#ang-back');
const fmt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '°';
function angleTip() {
  const f = S.angF, b = S.angB;
  let t;
  if (f > 0 && b < 0) t = 'Duck (pato): las dos puntas hacia fuera. La más cómoda para empezar y para ir en los dos sentidos.';
  else if (f >= 0 && b >= 0 && (f > 0 || b > 0)) t = 'Adelante: los dos pies apuntan hacia el nose. Más control en carving, menos para ir en switch.';
  else if (f === 0 && b === 0) t = 'Plano: pies rectos. Estable, pero las rodillas trabajan más forzadas.';
  else t = 'Ojo: el pie delantero mirando hacia atrás es raro y fuerza la rodilla. Prueba +15 / −6.';
  $('#angle-tip').textContent = t;
}
function setAngles(f, b) {
  S.angF = f; S.angB = b;
  angFront.value = f; angBack.value = b;
  $('#out-front').textContent = fmt(f); $('#out-back').textContent = fmt(b);
  angleTip();
}
angFront.addEventListener('input', () => { setAngles(+angFront.value, S.angB); $$('[data-preset]').forEach((x) => x.classList.remove('on')); });
angBack.addEventListener('input', () => { setAngles(S.angF, +angBack.value); $$('[data-preset]').forEach((x) => x.classList.remove('on')); });
segGroup('[data-preset]', 'preset', (v) => { const [f, b] = v.split(',').map(Number); setAngles(f, b); });

// Regular / goofy
function setStance(st) {
  S.stance = st;
  store.set('stance', st);
  $$('[data-stance]').forEach((b) => b.classList.toggle('on', b.dataset.stance === st));
}
segGroup('[data-stance]', 'stance', setStance);
setStance(S.stance);

// Test
const answers = [];
$$('#quiz .q').forEach((q) => {
  const qi = +q.dataset.q;
  $$('button', q).forEach((b) => b.addEventListener('click', () => {
    $$('button', q).forEach((x) => x.classList.toggle('on', x === b));
    answers[qi] = b.dataset.a;
    const filled = answers.filter(Boolean);
    if (filled.length === 3) {
      // Las dos primeras: pie que va delante. La tercera: pie que chuta (suele ir detrás).
      let left = 0;
      if (answers[0] === 'L') left++;
      if (answers[1] === 'L') left++;
      if (answers[2] === 'R') left++;
      const st = left >= 2 ? 'regular' : 'goofy';
      setStance(st);
      const r = $('#quiz-result');
      r.hidden = false;
      r.innerHTML = st === 'regular'
        ? '<b>Eres REGULAR</b>Pie izquierdo delante. Mira la tabla: la fijación de delante apunta hacia el nose.'
        : '<b>Eres GOOFY</b>Pie derecho delante. Mira cómo la tabla cambia: tu nose ahora está a la derecha.';
    }
  }));
});

// Postura
segGroup('[data-crouch]', 'crouch', (v) => { S.crouch = +v; });

// Canto
function setEdge(e) {
  S.edge = e;
  $$('[data-edge]').forEach((b) => b.classList.toggle('on', b.dataset.edge === e));
}
$$('[data-edge]').forEach((b) => b.addEventListener('click', () => setEdge(b.dataset.edge)));

// Trucos
function showTrick(name) {
  S.trick = name; S.trickClock = 0; S.trickYawBase = 0; S.trickYawS = 0;
  const t = TRICKS[name];
  $('#trick-info').innerHTML = `<h4>${t.name}</h4><span class="lvl">${t.level}</span><p>${t.desc}</p><ol class="steps-list">${t.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
}
segGroup('[data-trick]', 'trick', showTrick);
showTrick('ollie');

// Consejos
$('#tips').innerHTML = TIPS.map((t) => `<div class="tip${t.todo ? ' todo' : ''}"><div class="e">${t.e}</div><h4>${t.t}</h4><p>${t.d}</p></div>`).join('');

/* ---------------- Pedales (entrada) ---------------- */
const input = { L: new Set(), R: new Set(), kL: false, kR: false };
$$('[data-pedal]').forEach((btn) => {
  const side = btn.dataset.pedal;
  const down = (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); input[side].add(btn.id + e.pointerId); btn.classList.add('down'); };
  const up = (e) => { input[side].delete(btn.id + e.pointerId); if (![...input[side]].length) btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});
const keyMap = { ArrowLeft: 'kL', KeyA: 'kL', ArrowRight: 'kR', KeyD: 'kR' };
addEventListener('keydown', (e) => {
  if (keyMap[e.code]) { input[keyMap[e.code]] = true; if (G.on) e.preventDefault(); }
  if (e.code === 'Escape') { if (G.on) endGame(true); else closeMenu(); }
});
addEventListener('keyup', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
addEventListener('blur', () => { input.kL = input.kR = false; input.L.clear(); input.R.clear(); $$('.pedal.down').forEach((b) => b.classList.remove('down')); });
const inL = () => input.kL || input.L.size > 0;
const inR = () => input.kR || input.R.size > 0;

/* ---------------- Juego ---------------- */
const G = { on: false, over: false, score: 0, lives: 3, speed: 3, best: store.get('best', 0), msgT: 0, lastX: 0 };
$('#best-score').textContent = G.best;
const gameEl = $('#game');

function placeGate(gate, z) {
  const gap = Math.max(2.05, 2.9 - G.score * 0.05);
  const x = clamp(G.lastX + (Math.random() * 2 - 1) * 1.6, -1.7, 1.7);
  G.lastX = x;
  gate.position.set(x, 0, z);
  gate.userData.gap = gap;
  gate.userData.done = false;
  const [lp, lf] = gate.userData.left, [rp, rf] = gate.userData.right;
  lp.position.x = -gap / 2; lf.position.x = -gap / 2 + 0.24;
  rp.position.x = gap / 2; rf.position.x = gap / 2 - 0.24;
  gate.visible = true;
}
function startGame() {
  G.on = true; G.over = false; G.score = 0; G.lives = 3; G.speed = 3.2; G.lastX = 0;
  S.sim.x = 0; S.sim.v = 0; setEdge('back');
  W.gates.forEach((g, i) => placeGate(g, 9 + i * 7.5));
  document.body.classList.add('playing');
  gameEl.hidden = false;
  $('#game-over').hidden = true;
  updateHud();
  gameMsg('¡Usa los pedales!');
}
function endGame(quit) {
  if (quit) {
    G.on = false;
    document.body.classList.remove('playing');
    gameEl.hidden = true;
    W.gates.forEach((g) => (g.visible = false));
    return;
  }
  G.over = true;
  if (G.score > G.best) { G.best = G.score; store.set('best', G.best); }
  $('#best-score').textContent = G.best;
  $('#final-score').textContent = G.score;
  $('#final-best').textContent = G.best;
  $('#game-over').hidden = false;
}
function updateHud() {
  $('#score').textContent = G.score;
  $('#lives').textContent = '❤'.repeat(G.lives) + '♡'.repeat(3 - G.lives);
}
let msgTimer;
function gameMsg(t) {
  const m = $('#game-msg');
  m.textContent = t; m.classList.add('on');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => m.classList.remove('on'), 900);
}
function flash() {
  const f = $('#flash');
  f.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  navigator.vibrate?.(120);
}
$('#play-btn').addEventListener('click', startGame);
$('#again-btn').addEventListener('click', startGame);
$('#quit-btn').addEventListener('click', () => endGame(true));
$('#game-exit').addEventListener('click', () => endGame(true));

function stepGame(dt) {
  if (G.over) return;
  G.speed = Math.min(8, 3.2 + G.score * 0.14);
  let maxZ = -Infinity;
  for (const g of W.gates) maxZ = Math.max(maxZ, g.position.z);
  for (const g of W.gates) {
    g.position.z -= S.sim.speed * dt;
    if (!g.userData.done && g.position.z < 0) {
      g.userData.done = true;
      const ok = Math.abs(S.sim.x - g.position.x) < g.userData.gap / 2 - 0.35;
      if (ok) { G.score++; gameMsg(G.score % 5 === 0 ? `¡${G.score}! 🔥` : ['¡Bien!', '¡Eso es!', '¡Dentro!', '¡Pedalazo!'][G.score % 4]); }
      else { G.lives--; flash(); gameMsg('¡Fuera!'); if (G.lives <= 0) endGame(false); }
      updateHud();
    }
    if (g.position.z < -5) placeGate(g, maxZ + 7.5);
  }
}

/* ---------------- Simulación en la pista ---------------- */
function stepSim(dt, mode, t) {
  const sim = S.sim;
  let tL = 0, tR = 0, speed = 0, spring = 0;
  const edgeSign = S.edge === 'back' ? 1 : -1;
  S.edgeYaw = damp(S.edgeYaw, S.edge === 'back' ? 0 : Math.PI, 4, dt);

  if (mode === 'drill' || mode === 'game') { tL = inL() ? 1 : 0; tR = inR() ? 1 : 0; speed = mode === 'game' ? G.speed : 0.7; }
  else if (mode === 'leaf') { const s = Math.sin(t * 0.75); tL = clamp(s * 1.8, 0, 1); tR = clamp(-s * 1.8, 0, 1); speed = 0.8; spring = 0.35; }
  else if (mode === 'hold') { tL = tR = 0.35; speed = 0.45; spring = 2; }
  else if (mode === 'turn') { tL = tR = 0; speed = 2.0; }
  if (G.on && G.over) { tL = tR = 0; speed = damp(sim.speed, 0, 2, dt); }

  S.pL = damp(S.pL, tL, 9, dt);
  S.pR = damp(S.pR, tR, 9, dt);
  sim.speed = damp(sim.speed, speed, 3, dt);
  const d = S.pL - S.pR;

  if (mode === 'turn') {
    const A = 1.35, w = 0.8;
    sim.phi += dt * w;
    const x = A * Math.sin(sim.phi);
    const vx = A * w * Math.cos(sim.phi), vz = Math.max(0.6, sim.speed);
    const ax = -A * w * w * Math.sin(sim.phi);
    sim.v = (x - sim.x) / Math.max(dt, 1e-3);
    sim.x = damp(sim.x, x, 10, dt);
    const yawT = S.dir > 0 ? Math.atan2(-vz, vx) : Math.atan2(vz, -vx);
    sim.yaw += wrapAngle(yawT - sim.yaw) * (1 - Math.exp(-8 * dt));
    const rollT = clamp(ax * Math.sin(sim.yaw) * 0.7, -0.34, 0.34);
    sim.roll = damp(sim.roll, rollT, 6, dt);
    sim.pitch = damp(sim.pitch, 0, 6, dt);
    S.edgeYaw = sim.yaw;
    // Pedal del pie delantero al iniciar cada giro
    const front = Math.abs(Math.cos(sim.phi));
    if (S.dir > 0) { S.pL = damp(S.pL, front, 6, dt); S.pR = damp(S.pR, 0.2, 6, dt); }
    else { S.pR = damp(S.pR, front, 6, dt); S.pL = damp(S.pL, 0.2, 6, dt); }
    const lbl = sim.roll > 0.07 ? 'Front · puntas' : sim.roll < -0.07 ? 'Back · talones' : 'Plana · cambio de canto';
    const el = $('#turn-label');
    if (el.textContent !== lbl) el.textContent = lbl;
    $('#turn-phase span').style.color = sim.roll > 0.07 ? 'var(--orange)' : sim.roll < -0.07 ? 'var(--cyan)' : 'var(--lime)';
  } else {
    const acc = mode === 'game' ? 5 : 2.8, fr = mode === 'game' ? 2.4 : 1.6;
    sim.v += (d * acc - sim.x * spring * edgeSign) * dt;
    sim.v *= Math.exp(-fr * dt);
    sim.x += sim.v * edgeSign * dt;
    const lim = mode === 'game' ? 2.4 : 1.7;
    if (Math.abs(sim.x) > lim) { sim.x = Math.sign(sim.x) * lim; sim.v *= -0.2; }
    const yawT = S.edgeYaw - d * 0.3 * edgeSign;
    sim.yaw += wrapAngle(yawT - sim.yaw) * (1 - Math.exp(-6 * dt));
    const rollMag = mode === 'hold' ? 0.3 : 0.13;
    sim.roll = damp(sim.roll, -rollMag * edgeSign, 5, dt);
    sim.pitch = damp(sim.pitch, -d * 0.05, 6, dt);
  }
}

/* ---------------- Trucos ---------------- */
function trickState(name, u) {
  const o = { y: 0, pitch: 0, yaw: 0, crouch: 0.5, shifty: 0, shiftX: 0, arms: 0.4 };
  const air = (a, b) => { const s = clamp((u - a) / (b - a), 0, 1); return 4 * s * (1 - s); };
  const pop = (sign) => {
    o.crouch = 0.5 + 0.4 * smooth(0, 0.2, u) - 0.75 * smooth(0.2, 0.27, u) + 0.6 * smooth(0.3, 0.4, u) - 0.15 * smooth(0.45, 0.55, u) + 0.25 * smooth(0.55, 0.6, u) - 0.35 * smooth(0.62, 0.85, u);
    o.pitch = sign * (0.34 * smooth(0.18, 0.26, u) - 0.4 * smooth(0.28, 0.42, u) + 0.06 * smooth(0.48, 0.58, u));
    o.y = air(0.25, 0.6) * 0.5;
    o.arms = 0.4 + air(0.25, 0.6) * 0.5;
  };
  if (name === 'ollie') pop(1);
  if (name === 'nollie') pop(-1);
  if (name === 'shifty') { pop(1); o.shifty = 0.75 * (smooth(0.3, 0.4, u) - smooth(0.45, 0.56, u)); }
  if (name === 'spin') { pop(1); o.yaw = Math.PI * smooth(0.27, 0.6, u); }
  if (name === 'press') {
    const k = smooth(0.12, 0.28, u) - smooth(0.62, 0.78, u);
    o.pitch = -0.22 * k;
    o.crouch = 0.5 + 0.15 * k;
    o.shiftX = 0.14 * k;
    o.arms = 0.4 + 0.3 * k;
  }
  return o;
}

/* ---------------- Etiquetas 3D ---------------- */
const labelRoot = $('#labels');
const LABELS = [
  { sec: 'tabla', a: () => W.anchors.nose, t: 'Nose', s: 'punta delantera', o: [-30, -100], c: 'var(--orange)' },
  { sec: 'tabla', a: () => W.anchors.tail, t: 'Tail', s: 'cola', o: [-70, -70], c: 'var(--orange)' },
  { sec: 'tabla', a: () => W.anchors.edge, t: 'Cantos de acero', s: 'agarran la nieve', o: [40, 80] },
  { sec: 'tabla', a: () => W.anchors.topC, t: 'Top sheet', s: 'la parte de arriba', o: [-30, -110], c: '#fff', when: () => cur.rot[0] < 1.4 },
  { sec: 'tabla', a: () => W.anchors.baseC, t: 'Base', s: 'lo que desliza · se encera', o: [-30, -110], c: '#fff', when: () => cur.rot[0] > 1.8 },
  { sec: 'tabla', a: () => W.anchors.rocker, t: 'Rocker', s: 'la punta se levanta', o: [-60, 90], c: 'var(--lime)' },
  { sec: 'fijaciones', a: () => bF().userData.parts.aHighback, t: 'Highback', s: 'respaldo del gemelo', o: [-110, -60], c: 'var(--orange)' },
  { sec: 'fijaciones', a: () => bF().userData.parts.aAnkle, t: 'Strap de tobillo', s: 'sujeta el talón', o: [120, -70] },
  { sec: 'fijaciones', a: () => bF().userData.parts.aToe, t: 'Strap de puntera', s: 'sujeta la punta', o: [120, 40] },
  { sec: 'fijaciones', a: () => bF().userData.parts.aDisc, t: 'Disco', s: 'aquí giras el ángulo', o: [-60, 100], c: 'var(--lime)' },
  { sec: 'stance', a: () => W.bindL.userData.parts.aAnkleBone, t: 'Pie izquierdo', dyn: () => (S.dir > 0 ? 'delante' : 'detrás'), o: [-20, -90] },
  { sec: 'stance', a: () => W.bindR.userData.parts.aAnkleBone, t: 'Pie derecho', dyn: () => (S.dir > 0 ? 'detrás' : 'delante'), o: [20, -90], c: 'var(--orange)' },
  { sec: 'stance', a: () => W.arrow.userData.tip, t: 'Nose', s: 'hacia aquí vas', o: [0, 80], c: 'var(--lime)' },
  { sec: 'postura', a: () => P.aHead, t: 'Mirada', s: 'hacia donde vas', o: [-90, -50], c: 'var(--lime)' },
  { sec: 'postura', a: () => P.aShoulder, t: 'Hombros', s: 'paralelos a la tabla', o: [-120, 10] },
  { sec: 'postura', a: () => P.aHip, t: 'Cadera centrada', s: 'peso 50 / 50', o: [130, -20], c: 'var(--orange)' },
  { sec: 'postura', a: () => P.aKnee, t: 'Rodillas', s: 'flexionadas', o: [120, 50] },
  { sec: 'pedales', a: () => W.bindL.userData.parts.aToe, t: 'Pie izq.', dyn: () => `${Math.round(S.pL * 100)}%`, o: [60, 60] },
  { sec: 'pedales', a: () => W.bindR.userData.parts.aToe, t: 'Pie der.', dyn: () => `${Math.round(S.pR * 100)}%`, o: [-60, 60], c: 'var(--orange)' },
  { sec: 'cantos', a: () => W.anchors.heelEdge, t: 'Canto de talones', s: 'BACK', o: [-70, 70] },
  { sec: 'cantos', a: () => W.anchors.toeEdge, t: 'Canto de puntas', s: 'FRONT', o: [80, -40], c: 'var(--orange)' },
];
for (const L of LABELS) {
  const el = document.createElement('div');
  el.className = 'label';
  if (L.c) el.style.setProperty('--c', L.c);
  el.innerHTML = `<i class="line"></i><i class="dot"></i><span class="tag">${L.t}<small>${L.s || ''}</small></span>`;
  labelRoot.appendChild(el);
  L.el = el; L.line = el.querySelector('.line'); L.tag = el.querySelector('.tag'); L.small = el.querySelector('small');
  L.on = false; L.lastDyn = '';
}
const tipAnchor = new THREE.Object3D(); tipAnchor.position.set(0.5, 0, 0); W.arrow.add(tipAnchor); W.arrow.userData.tip = tipAnchor;

const _p = new THREE.Vector3();
function updateLabels(vw, vh, mobile) {
  const focusId = G.on ? null : SC.focus >= 0 ? sections[SC.focus].id : null;
  const k = mobile ? 0.62 : 1;
  for (const L of LABELS) {
    const show = L.sec === focusId && (!L.when || L.when());
    if (show !== L.on) { L.on = show; L.el.classList.toggle('on', show); }
    if (!show) continue;
    L.a().getWorldPosition(_p).project(camera);
    if (_p.z > 1) continue;
    const x = (_p.x * 0.5 + 0.5) * vw, y = (-_p.y * 0.5 + 0.5) * vh;
    let dx = L.o[0] * k, dy = L.o[1] * k;
    const tx = clamp(x + dx, 70, vw - 70);
    dx = tx - x;
    L.el.style.transform = `translate(${x}px, ${y}px)`;
    L.tag.style.left = dx + 'px'; L.tag.style.top = dy + 'px';
    const len = Math.hypot(dx, dy);
    L.line.style.width = len + 'px';
    L.line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    if (L.dyn) { const v = L.dyn(); if (v !== L.lastDyn) { L.small.textContent = v; L.lastDyn = v; } }
  }
}

/* ---------------- Huella ---------------- */
const trailPts = [];
let trailAcc = 0;
function stepTrail(dt, active, speed) {
  const posAttr = W.trail.geometry.attributes.position;
  for (const p of trailPts) p.z -= speed * dt;
  while (trailPts.length && trailPts[0].z < -8) trailPts.shift();
  trailAcc += dt;
  if (active && trailAcc > 1 / 40) {
    trailAcc = 0;
    const yaw = W.rig.rotation.y;
    const ax = Math.cos(yaw), az = -Math.sin(yaw);
    const last = trailPts[trailPts.length - 1];
    let mx = 0, mz = 1;
    if (last) { mx = W.rig.position.x - last.x; mz = 0 - last.z; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; }
    const px = mz, pz = -mx;
    const hw = 0.66 * Math.abs(ax * px + az * pz) + 0.07;
    trailPts.push({ x: W.rig.position.x, z: 0, px, pz, hw });
    if (trailPts.length > W.TRAIL) trailPts.shift();
  }
  if (!active && trailPts.length && speed < 0.01) trailPts.length = 0;
  const arr = posAttr.array;
  const n = trailPts.length;
  for (let i = 0; i < W.TRAIL; i++) {
    const p = trailPts[Math.min(i, n - 1)] || { x: 0, z: -100, px: 0, pz: 0, hw: 0 };
    const fade = i < n ? Math.min(1, (i + 1) / 30) : 0;
    const hw = p.hw * fade;
    arr[i * 6] = p.x + p.px * hw; arr[i * 6 + 1] = 0; arr[i * 6 + 2] = p.z + p.pz * hw;
    arr[i * 6 + 3] = p.x - p.px * hw; arr[i * 6 + 4] = 0; arr[i * 6 + 5] = p.z - p.pz * hw;
  }
  posAttr.needsUpdate = true;
}

/* ---------------- Bucle principal ---------------- */
const studioTop = new THREE.Color('#050817'), studioBot = new THREE.Color('#1a2550');
const slopeTop = new THREE.Color('#2f6bb8'), slopeBot = new THREE.Color('#e6f1ff');
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const footL = new THREE.Vector3(), footR = new THREE.Vector3();
let vw = 0, vh = 0, mobile = false, sideS = 1;
let lastT = performance.now(), clock = 0;
const statusEl = $('#pedal-status');
const meters = $$('.pedal .meter b').map((b) => ({ b, side: b.closest('.pedal').dataset.pedal }));

function resize() {
  vw = innerWidth; vh = innerHeight;
  mobile = mobileMQ.matches;
  renderer.setSize(vw, vh, false);
  canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
  camera.aspect = vw / vh;
  camera.updateProjectionMatrix();
  measure();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
new ResizeObserver(() => measure()).observe($('main'));
resize();

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  clock += dt;
  const t = clock;

  readScroll();
  updateNav();

  // Pose objetivo
  let target, modeId;
  if (G.on) { target = POSES.game(0, t); modeId = 'game'; }
  else {
    const A = sections[SC.a], B = sections[SC.b];
    target = mixPose(POSES[A.id](SC.pa, t), POSES[B.id](SC.pb, t), SC.f);
    modeId = SC.f < 0.5 ? A.id : B.id;
  }
  dampPose(target, dt, G.on ? 3 : 5);

  // Postura (regular / goofy) y ángulos
  S.dir = damp(S.dir, S.stance === 'goofy' ? -1 : 1, 5, dt);
  S.angFs = damp(S.angFs, S.angF, 8, dt);
  S.angBs = damp(S.angBs, S.angB, 8, dt);
  const deg = Math.PI / 180;
  const dSign = Math.sign(S.dir) || 1;
  const aF = S.angFs * deg * S.dir, aB = S.angBs * deg * S.dir;
  // bindL está en +x: es la delantera para regular
  W.bindL.rotation.y = lerp(aB, aF, (S.dir + 1) / 2);
  W.bindR.rotation.y = lerp(aF, aB, (S.dir + 1) / 2);
  const ex = cur.explode;
  for (const b of [W.bindL, W.bindR]) {
    const parts = b.userData.parts;
    const focusB = b === bF() ? 1 : 0.35;
    b.position.y = BOARD.T / 2 + 0.002 + ex * 0.16 * focusB;
    parts.disc.position.y = 0.004 - ex * 0.12 * focusB;
    parts.highback.rotation.x = -0.22 - ex * 0.35 * focusB;
    parts.boot.visible = cur.boots > 0.02;
    parts.boot.scale.setScalar(Math.max(0.001, cur.boots));
  }
  W.mats.boot.opacity = W.mats.bootDark.opacity = clamp(cur.boots * 1.5, 0, 1);

  // Simulación
  const mode = G.on ? 'game' : SIM_MODE[modeId] || 'still';
  stepSim(dt, mode, t);
  if (G.on) stepGame(dt);
  const sim = S.sim, sw = cur.sim;

  // Trucos
  let tr = { y: 0, pitch: 0, yaw: 0, crouch: 0.5, shifty: 0, shiftX: 0, arms: 0.4 };
  if (cur.trick > 0.01) {
    S.trickClock += dt;
    const period = 2.6;
    if (S.trickClock > period) { S.trickClock -= period; if (S.trick === 'spin') S.trickYawBase += Math.PI; }
    tr = trickState(S.trick, S.trickClock / period);
    S.trickYawS = S.trickYawBase + tr.yaw;
  }
  const tw = cur.trick;

  // Rig
  const rig = W.rig;
  const pitchComp = Math.abs(Math.sin(tr.pitch * tw)) * 0.72;
  rig.position.set(cur.pos[0] + sim.x * sw, cur.pos[1] + (tr.y + pitchComp) * tw, cur.pos[2]);
  rig.rotation.set(
    cur.rot[0] + sim.roll * sw,
    cur.rot[1] + sim.yaw * sw + S.trickYawS * tw,
    cur.rot[2] + sim.pitch * sw + tr.pitch * dSign * tw,
  );
  W.boardGroup.rotation.y = tr.shifty * tw;

  // Bordes, brillos, flecha
  const edgeShow = cur.edges;
  const backness = modeId === 'cantos' || modeId === 'hoja' || modeId === 'pedales' ? (S.edge === 'back' ? 1 : 0.15) : 1;
  const frontness = modeId === 'cantos' || modeId === 'hoja' || modeId === 'pedales' ? (S.edge === 'front' ? 1 : 0.15) : 1;
  W.heelEdge.material.opacity = edgeShow * backness;
  W.toeEdge.material.opacity = edgeShow * frontness;
  const gl = cur.glow;
  const pl = modeId === 'postura' ? 0.5 : S.pL, pr = modeId === 'postura' ? 0.5 : S.pR;
  W.glowL.material.opacity = gl * pl * 0.95;
  W.glowR.material.opacity = gl * pr * 0.95;
  W.glowL.scale.setScalar(0.7 + pl * 0.6);
  W.glowR.scale.setScalar(0.7 + pr * 0.6);
  W.arrow.material.opacity = cur.arrow;
  W.arrow.visible = cur.arrow > 0.01;
  W.arrow.position.set(S.dir * 0.92, 0.03, 0.22);
  W.arrow.scale.set(S.dir, 1, 1);
  W.arrow.material.side = THREE.DoubleSide;

  // Rider
  rig.updateMatrixWorld(true);
  const rv = cur.rider;
  W.rider.visible = rv > 0.02;
  if (W.rider.visible) {
    // El cuerpo se queda más vertical que la tabla en los trucos
    W.rider.rotation.z = -tr.pitch * dSign * tw * 0.6;
    W.rider.position.y = (1 - Math.min(1, rv)) * 1.2;
    W.rider.scale.setScalar(Math.max(0.001, Math.min(1, rv * 1.1)));
    W.rider.updateMatrixWorld(true);
    W.bindL.userData.parts.aAnkleBone.getWorldPosition(footL); W.rider.worldToLocal(footL);
    W.bindR.userData.parts.aAnkleBone.getWorldPosition(footR); W.rider.worldToLocal(footR);
    const d = S.pL - S.pR;
    const edgeLean = sw * (mode === 'turn' ? sim.roll * 0.35 : (S.edge === 'back' ? -0.07 : 0.07));
    const lookT = mode === 'turn' ? 0.9 * dSign : mode === 'still' ? 0.85 * dSign : clamp(sim.v * 0.6, -1, 1) * (S.edge === 'back' ? 1 : -1) + 0.3 * dSign;
    S.look = damp(S.look, lookT, 4, dt);
    poseRider(W.rider, footL, footR, {
      crouch: lerp(cur.crouch, tr.crouch, tw) + (G.on ? 0.1 : 0),
      shiftX: d * 0.11 * sw + tr.shiftX * dSign * tw,
      shiftZ: edgeLean,
      lookYaw: S.look,
      arms: lerp(0.4, tr.arms, tw),
      twist: 0,
    });
  }

  // Pista
  const sl = cur.slope;
  W.groundMat.opacity = sl;
  W.ground.visible = sl > 0.01;
  for (const m of W.treeMats) m.opacity = sl;
  W.trailMat.opacity = sl * 0.4;
  const speed = sim.speed * sw;
  W.snowMap.offset.y -= speed * dt * (24 / 60);
  for (const tree of W.trees) {
    tree.position.z -= speed * dt;
    if (tree.position.z < -8) tree.position.z += 48;
  }
  stepTrail(dt, sw > 0.5 && sl > 0.5, speed);
  W.shadow.material.opacity = sl * 0.85;
  W.shadow.position.set(rig.position.x, 0.004, rig.position.z);
  W.shadow.rotation.set(-Math.PI / 2, 0, rig.rotation.y);
  const sh = 1 - clamp((rig.position.y - GROUND) * 1.2, 0, 0.6);
  W.shadow.scale.set(sh, sh, 1);

  // Cielo y luces
  _c1.copy(studioTop).lerp(slopeTop, sl);
  _c2.copy(studioBot).lerp(slopeBot, sl);
  W.skyMat.uniforms.top.value.copy(_c1);
  W.skyMat.uniforms.bottom.value.copy(_c2);
  W.skyMat.uniforms.sun.value = sl;
  W.scene.fog.color.copy(_c2);
  W.scene.fog.near = lerp(30, 9, sl); W.scene.fog.far = lerp(90, 42, sl);
  W.hemi.intensity = lerp(0.6, 1.25, sl);
  W.warm.intensity = lerp(3, 0, sl);
  W.rim.intensity = lerp(1.5, 0.5, sl);
  renderer.toneMappingExposure = lerp(1.05, 0.92, sl);

  // Copos
  const fp = W.flakes.geometry.attributes.position, fa = fp.array, fs = W.flakes.userData.speed;
  for (let i = 0; i < fs.length; i++) {
    fa[i * 3 + 1] -= fs[i] * dt;
    fa[i * 3] += Math.sin(t * 0.7 + i) * 0.08 * dt;
    fa[i * 3 + 2] -= speed * dt * 0.9;
    if (fa[i * 3 + 1] < -2) fa[i * 3 + 1] += 9;
    if (fa[i * 3 + 2] < -9) fa[i * 3 + 2] += 18;
  }
  fp.needsUpdate = true;
  W.flakes.position.set(cur.look[0], 0, cur.look[2]);

  // Cámara (con desplazamiento para dejar sitio a la tarjeta)
  const sideT = G.on ? 0 : lerp(SC.a % 2 === 0 ? 1 : -1, SC.b % 2 === 0 ? 1 : -1, SC.f);
  sideS = damp(sideS, sideT, 5, dt);
  const aspect = vw / vh;
  let zoom = 1;
  if (aspect < 1.25) zoom = 1 + (clamp(1.3 / aspect, 1, 2.9) - 1) * cur.mk;
  const look = cur.look, cp = cur.cam;
  camera.position.set(look[0] + (cp[0] - look[0]) * zoom, look[1] + (cp[1] - look[1]) * zoom, look[2] + (cp[2] - look[2]) * zoom);
  camera.lookAt(look[0], look[1], look[2]);
  // Árboles: se esconden si tapan la vista
  const cx = camera.position.x, cz = camera.position.z, lx = look[0] - cx, lz = look[2] - cz;
  const ll = lx * lx + lz * lz || 1;
  for (const tree of W.trees) {
    const tx = tree.position.x - cx, tz = tree.position.z - cz;
    const u = clamp((tx * lx + tz * lz) / ll, 0, 1.15);
    const dx = tx - lx * u, dz = tz - lz * u;
    tree.visible = sl > 0.01 && dx * dx + dz * dz > 1.6 * tree.scale.x * tree.scale.x;
  }
  if (G.on) camera.clearViewOffset();
  else if (mobile) camera.setViewOffset(vw, vh, 0, vh * 0.25, vw, vh);
  else camera.setViewOffset(vw, vh, -vw * 0.19 * sideS, 0, vw, vh);

  // Interfaz de pedales
  for (const m of meters) m.b.style.transform = `scaleX(${(m.side === 'L' ? S.pL : S.pR).toFixed(3)})`;
  if (modeId === 'pedales' && statusEl) {
    const d = S.pL - S.pR;
    const txt = d > 0.25 ? '← Pie izquierdo cargado · vas a la izquierda' : d < -0.25 ? 'Pie derecho cargado · vas a la derecha →' : 'Peso repartido · tabla recta';
    if (statusEl.textContent !== txt) statusEl.textContent = txt;
  }

  renderer.render(W.scene, camera);
  updateLabels(vw, vh, mobile);
  requestAnimationFrame(frame);
}

requestAnimationFrame((now) => {
  lastT = now;
  frame(now);
  setTimeout(() => $('#loader').classList.add('done'), 250);
});

/* ---------------- Instalar como app ---------------- */
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#install-btn').hidden = false;
});
$('#install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null;
  $('#install-btn').hidden = true;
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
